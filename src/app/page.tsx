import type { Metadata } from "next";
import Image from "next/image";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import {
  getSectionItemsFor,
  getSectionLayout,
  getSectionsFor,
} from "@/features/site/content";
import { buildHomeBlocks, orderBlocks } from "@/features/home/homeBlocks";
import { buildMobileHomeBlocks } from "@/features/home/mobile/MobileHome";

const OG_TITLE = "Lets4Trade";
const OG_DESCRIPTION = "Sua loja de gamecoins.";

export const metadata: Metadata = {
  title: OG_TITLE,
  description: OG_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    url: "/",
    type: "website",
    siteName: OG_TITLE,
  },
};

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
  const [section, items, layout] = await Promise.all([
    getSectionsFor("home"),
    getSectionItemsFor("home"),
    // A ordem (e o que está escondido) vem do banco desde 2026-09-15 — é o que
    // a tela `/admin/paginas` arrasta. Sem personalização, a ordem é a do código.
    getSectionLayout("home"),
  ]);

  const blocks = orderBlocks(buildHomeBlocks(section, items), layout.visible);
  // A versão de CELULAR (Figma 2667:1864): mesmos dados, mesma ordem e mesma
  // visibilidade do editor — só o desenho muda. Ver `mobile/MobileHome.tsx`.
  const mobileBlocks = orderBlocks(
    buildMobileHomeBlocks(section, items),
    layout.visible,
  );

  return (
    <div className="flex min-h-dvh flex-col bg-brand-bg">
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

        Abaixo de 1820 o `min-w` segura e a rolagem volta: aí o conteúdo
        realmente não cabe, e cortar seria pior que rolar.
      */}
      {/* Celular e tablet em pé (< 1024px): o desenho mobile. As duas versões
          vêm no HTML e o CSS escolhe — sem detectar aparelho no servidor, o que
          quebraria o cache da página e erraria em tela girada. */}
      <main className="flex flex-1 flex-col">
        <div className="flex-1 overflow-x-clip px-[25px] pt-[20px] pb-[60px] lg:hidden">
          <div className="mx-auto max-w-[560px]">
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

        <div className="hidden flex-1 overflow-x-auto lg:block">
          <div className="relative mx-auto w-full max-w-[1920px] min-w-[1820px] overflow-x-clip">
            <HomeBackdrop />

            <div className="mx-auto w-[1820px] pt-[37px] pb-[100px]">
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
    </div>
  );
}

/**
 * Camada decorativa do frame (Figma 362:800 "Effect 2", 567:1710 "Ellipse 8",
 * 567:1712 "Ellipse 9"). São filhos diretos do frame Home, não de uma seção: ficam
 * atrás de tudo e atravessam os limites das seções, então moram aqui.
 *
 * A moeda "4" (945:901) era daqui e SAIU: virou o gatilho que abre o carrossel
 * do hero, então precisava ficar na frente dos cards em vez de atrás de tudo.
 * Hoje mora em `features/home/HeroDeck.tsx`.
 *
 * As coordenadas do arquivo têm origem no topo do frame — que é o topo do
 * CABEÇALHO, 83px acima desta faixa. Daí o desconto de 83 em cada `top`.
 *
 * Os dois brilhos vêm como SVG com o desfoque já rasterizado. Reproduzi-los com
 * `filter: blur()` custaria caro: são raios de 192px e 250px sobre áreas de até
 * 671×1742, e o compositor refaz esse desfoque a cada repaint. O SVG é
 * desenhado uma vez.
 *
 * O invólucro recorta para que o topo negativo do primeiro brilho não gere
 * rolagem vertical dentro do `main`, que é um container de rolagem horizontal.
 */
function HomeBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <Image
        src="/images/home/glow-hero.svg"
        alt=""
        width={508}
        height={1012}
        className="absolute -top-[83px] left-0 h-[1012px] w-[508px] max-w-none"
      />

      <Image
        src="/images/home/glow-guias.svg"
        alt=""
        width={671}
        height={1742}
        className="absolute top-[2308.09px] left-0 h-[1742px] w-[671px] max-w-none"
      />

      {/* Par do brilho acima, do outro lado (567:1712). É o fundo quente por
          trás do mapa-múndi: vai da seção da equipe até a faixa dos guias, e o
          centro da elipse cai FORA do frame, à direita — o que aparece é a
          borda dela. */}
      <Image
        src="/images/home/glow-equipe.svg"
        alt=""
        width={700}
        height={1663}
        className="absolute top-[2614.97px] left-[1220.5px] h-[1663px] w-[700px] max-w-none"
      />

      {/* O botão de contato flutuante (269:488) SAIU daqui em 2026-09-15: virou
          a bolinha de atendimento de toda a loja, fixa no canto da tela —
          `features/support/ContactBubble.tsx`, montada no layout raiz. */}
    </div>
  );
}
