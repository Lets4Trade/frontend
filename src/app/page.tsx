import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import {
  getSectionLayout,
  getSectionsFor,
} from "@/features/site/content";
import { buildHomeBlocks, orderBlocks } from "@/features/home/homeBlocks";
import { buildMobileHomeBlocks } from "@/features/home/mobile/MobileHome";
import { HomeBackdrop } from "@/features/home/HomeBackdrop";
import { HomeMotion } from "@/features/home/HomeMotion";
import { getHomeItems } from "@/features/home/homeNews";
import { composeBlocks, legacyNodesFrom } from "@/features/pages/compose";
import { getPublishedPage } from "@/features/pages/public";
import { SITE_DEFAULT_PHRASE, SITE_OG_IMAGE, withSiteName } from "@/lib/siteTitle";
import { getMenuGames } from "@/features/game/menuGames";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationJsonLd, websiteJsonLd } from "@/lib/structuredData";

// Título inteiro aqui: o `title.template` do layout raiz não vale para a página
// do mesmo segmento (a home).
const OG_TITLE = withSiteName(SITE_DEFAULT_PHRASE);

/** "A, B e C" — a lista de jogos da descrição. */
function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

/**
 * Descrição da home com os JOGOS da loja (2026-11-27). Antes era "Sua loja de
 * gamecoins." — o site antigo listava os jogos e vendia o clique com
 * referências e forma de pagamento. A lista vem do menu (cache de 1h, derrubado
 * pelo painel), então jogo novo entra sem deploy. Só os 5 primeiros: o Google
 * corta a frase em ~155 caracteres.
 */
async function homeDescription(): Promise<string> {
  const names = (await getMenuGames()).slice(0, 5).map((game) => game.name);
  const games = names.length > 0 ? ` de ${joinNames(names)}` : " de jogos";
  return `Compre moedas, itens e serviços${games} com +1.000 referências, entrega rápida e pagamento via PIX ou cartão.`;
}

export async function generateMetadata(): Promise<Metadata> {
  const description = await homeDescription();
  return {
    title: OG_TITLE,
    description,
    alternates: { canonical: "/" },
    openGraph: {
      title: OG_TITLE,
      description,
      url: "/",
      type: "website",
      siteName: "Lets4Trade",
      locale: "pt_BR",
      images: [SITE_OG_IMAGE],
    },
  };
}

/**
 * Home — Figma nó 131:1504 (1920×5770).
 *
 * Construída por seções. O design tem 50px de margem lateral, então o conteúdo
 * é uma faixa de 1820px centrada.
 *
 * As margens entre as seções são a DIFERENÇA entre as coordenadas do arquivo,
 * não valores escolhidos: cada seção tem altura fixa e conhecida, então o
 * espaçamento é `topoDaPróxima - fimDaAnterior`. Os pontos de referência, no
 * eixo Y do frame de 1920:
 *
 *   1076  divisor sob a navegação
 *   1127  bloco do vídeo (topo do player)   → fim em 1736
 *   1835  "NOSSAS REVIEWS"                  → fim em 2470
 *   2577  "EQUIPE LETS 4 TRADE"             → fim em 3596 (divisor)
 *   3696  "GUIAS POPULARES"                 → fim em 4216
 *   4316  "DÚVIDAS SOBRE A EMPRESA"         → fim em 5116
 *   5216  rodapé
 */
export default async function Home() {
  // Os títulos das seções vêm da tela "Edição de sessões". Uma leitura só para
  // a página inteira; o que não foi personalizado devolve o padrão do código.
  /**
   * Duas leituras: o que cada sessão É (título, subtítulo, arte) e o que ela
   * CONTÉM (reviews, equipe, guias, dúvidas). Em PARALELO — a home é a página
   * mais aberta da loja e não pode somar as duas latências.
   */
  const [section, items, layout, page] = await Promise.all([
    getSectionsFor("home"),
    // Os itens da sessão + as notícias do blog no lugar dos cards de "guias".
    getHomeItems(),
    // A ordem (e o que está escondido) vem do banco desde 2026-09-15 — é o que
    // a tela `/admin/paginas` arrasta. Sem personalização, a ordem é a do código.
    getSectionLayout("home"),
    // Construtor de páginas (2026-09-25): com a home PUBLICADA por blocos, é a
    // lista de blocos que manda — ordem, o que aparece e os blocos novos entre
    // as sessões do desenho. Sem publicação, tudo segue como antes.
    getPublishedPage("home"),
  ]);

  const desktopLegacy = buildHomeBlocks(section, items);
  // A versão de CELULAR (Figma 2667:1864): mesmos dados, mesma ordem e mesma
  // visibilidade do editor — só o desenho muda. Ver `mobile/MobileHome.tsx`.
  const mobileLegacy = buildMobileHomeBlocks(section, items);

  const blocks = page
    ? composeBlocks(page.blocks, page.refs, legacyNodesFrom(desktopLegacy), { mobile: false })
    : orderBlocks(desktopLegacy, layout.visible);
  const mobileBlocks = page
    ? composeBlocks(page.blocks, page.refs, legacyNodesFrom(mobileLegacy), { mobile: true })
    : orderBlocks(mobileLegacy, layout.visible);

  return (
    <div className="flex min-h-[var(--dvh)] flex-col bg-brand-bg">
      {/* A loja e o site para o Google (o site antigo já os declarava). */}
      <JsonLd data={organizationJsonLd("/images/lets4trade-logo.png")} />
      <JsonLd data={websiteJsonLd()} />
      <SiteHeader />

      {/*
        MOLDURA e CONTEÚDO são coisas separadas, e é isso que evita a barra de
        rolagem horizontal.

        A moldura reproduz o frame de 1920 do arquivo, mas ENCOLHE até 1820 —
        que é a largura real do conteúdo. Os 100px que sobram são as duas
        margens de 50, e são elas que cedem primeiro.

        Sem isso a home tinha barra horizontal em QUALQUER monitor de 1920: a
        barra vertical come ~25px, sobram ~1895 de área útil, e uma faixa rígida
        de 1920 não cabe. Com a moldura elástica a margem vira ~37px nesse caso
        — diferença que ninguém enxerga — e a barra some.

        `overflow-x: clip` (e não `hidden`) corta o que sangra para fora da
        moldura — o mapa-múndi e os brilhos, que no arquivo o próprio frame
        recorta — sem criar um container de rolagem, o que quebraria as
        animações presas à rolagem (`animation-timeline: view()`).

        Abaixo de 1820 (2026-11-02): o desenho é ENCOLHIDO para caber (`.fit-1820`,
        `zoom` de 80% a 100%) e, abaixo de 1476px — onde nem com 80% ele cabe —,
        entra a versão de celular/tablet. Antes o `min-w` segurava os 1820 e a
        página rolava de lado em quase todo notebook.
      */}
      {/* Celular, tablet e notebook estreito (< 1476px, 2026-11-02; era < 1024): o desenho mobile. As duas versões
          vêm no HTML e o CSS escolhe — sem detectar aparelho no servidor, o que
          quebraria o cache da página e erraria em tela girada. */}
      <main className="flex flex-1 flex-col">
        {/* Título principal da página (2026-11-27): a home não tinha H1 — o
            desenho abre com banner e atalhos, sem frase. Fica só para leitor
            de tela e buscador (`sr-only`), com o que a página de fato É; não é
            texto escondido para enganar o Google, é o rótulo da página. */}
        <h1 className="sr-only">Lets4Trade: compre moedas, itens e serviços de jogos</h1>
        <div className="flex-1 overflow-x-clip px-[25px] pt-[20px] pb-[60px] min-[1185px]:hidden">
          <div className="mx-auto max-w-[560px] lg:max-w-[720px]">
            {mobileBlocks.map((block, index) => (
              <div
                key={block.key}
                style={index === 0 ? undefined : { marginTop: block.gap }}
              >
                {block.node}
              </div>
            ))}
          </div>
        </div>

        {/* O fundo (brilhos) ocupa a TELA inteira, não a moldura de 1920
            (2026-11-17): os brilhos são luz entrando pela BORDA DA TELA — os
            SVGs vêm cortados na borda de propósito. Presos à moldura, em tela
            mais larga que ela (com o site a 80%, já num monitor de 1920) a
            borda caía no meio da página e o brilho aparecia cortado ao meio.
            `overflow-x-clip` aqui para nada criar rolagem lateral. */}
        {/* Faixa dos contadores de borda a borda (2026-11-18): ela se posiciona
            por ESTA caixa (a tela inteira), e não pela moldura de 1920 — que
            continua cortando o resto, mas por isso deixou de ser `relative`.
            Sem o `relative` da moldura, quem põe os brilhos ATRÁS do conteúdo
            é o `isolate` daqui + o `-z-10` do fundo. */}
        <div className="relative isolate hidden flex-1 overflow-x-clip min-[1185px]:block">
          <div className="absolute inset-0 -z-10">
            <HomeBackdrop />
          </div>
          <div className="mx-auto w-full max-w-[1920px] overflow-x-clip">

            <div className="fit-1820 mx-auto w-[1820px] pt-[37px] pb-[100px]">
              {/* Os blocos vêm de `homeBlocks`, na ordem do banco. O vão acompanha
                o bloco que vem DEPOIS (medido do arquivo), então reordenar não
                inventa espaçamento. */}
              {blocks.map((block, index) => (
                <div
                  key={block.key}
                  style={index === 0 ? undefined : { marginTop: block.gap }}
                >
                  {block.node}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />

      {/* Celular: o rodapé flutuante de atalhos (`MobileStickyNav`) fica sobre o
          fim da página. Este respiro do tamanho dele deixa a última linha do
          rodapé subir ACIMA do menu em vez de ficar escondida por baixo. */}
      <div aria-hidden className="h-[100px] lg:hidden" />

      {/* Entradas das seções — um observador para a página toda. */}
      <HomeMotion />
    </div>
  );
}
