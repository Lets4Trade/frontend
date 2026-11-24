import { gameSectionNodes } from "@/features/game/GamePageSections";
import { composeBlocks } from "@/features/pages/compose";
import { BlockColumn, GameFrame } from "@/features/pages/frames";
import { getPublishedPage } from "@/features/pages/public";
import { GAME_LEGACY_GAP } from "@/features/pages/registry";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { parseCatalogQuery, scopePageToQuery } from "@/features/game/catalog";
import { buildSeoDescription, buildTabTitle, getCatalog, getGamePage, withActiveTab } from "@/features/game/content";
import { withSiteName } from "@/lib/siteTitle";
import { GamePageSections } from "@/features/game/GamePageSections";
import { GAME_SLUG, gameHref, isReservedGameSlug } from "@/features/game/href";

type RouteParams = { slug: string };

/**
 * A página do jogo mora na RAIZ desde 2026-10-16 (`/path-of-exile-2`; o antigo
 * `/games/<slug>` redireciona com 308 em `next.config.ts`). As rotas fixas do
 * site (`/blog`, `/login`…) vencem esta rota dinâmica no Next; o que sobra cai
 * aqui. Endereço fora do formato de slug ou de página do site vira 404 SEM ir
 * à API — a raiz recebe todo tipo de caminho (robôs, `/wp-admin`...).
 */
function isGameSlug(slug: string): boolean {
  return GAME_SLUG.test(slug) && !isReservedGameSlug(slug);
}
type RouteSearch = Record<string, string | string[] | undefined>;

type PageProps = {
  params: Promise<RouteParams>;
  searchParams: Promise<RouteSearch>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isGameSlug(slug)) return {};
  const page = await getGamePage(slug);
  if (!page) return {};

  // Título da aba do navegador segue a aba ATIVA (`?aba=`), validada contra a
  // página como no render — "Compre Moedas ARC Raiders | Lets 4 Trade". A
  // leitura do jogo é a mesma do render (memorizada pelo `fetch` do Next).
  const query = parseCatalogQuery(await searchParams, page);
  const activeTab = page.tabs.find((tab) => tab.id === query.tab);
  const title = buildTabTitle(page.name, activeTab);
  // A descrição segue a aba como o título (2026-11-24): antes vinha de
  // `page.seo.description`, montada só com a aba padrão.
  const description = buildSeoDescription(page.name, activeTab);

  return {
    title,
    description,
    alternates: { canonical: gameHref(page.slug) },
    openGraph: {
      title: withSiteName(title),
      description,
      url: gameHref(page.slug),
      type: "website",
      siteName: "Lets4Trade",
    },
  };
}

/**
 * Página de um jogo — Figma nó 1116:314 (1920×5892).
 *
 * DUAS DECISÕES estruturam este arquivo, e as duas vêm do requisito de ela ser
 * 100% editável pelo admin:
 *
 * 1. NADA de texto ou imagem está escrito aqui. Tudo vem de `getGamePage()`,
 *    que devolve um `GamePage` (ver `features/game/types.ts`).
 *
 *    A promessa que essa regra fazia — "trocar o conteúdo semente por uma
 *    chamada de API não mexe em nenhum componente" — foi cobrada em 2026-09-10
 *    e se cumpriu: a virada para o banco mudou `content.ts` e mais nada aqui,
 *    além de a grade de produtos ter virado `async`.
 *
 * 2. A página é montada em FLUXO, e não em coordenada absoluta como a home.
 *    Aqui os textos são escritos por outra pessoa e vão ter comprimentos que o
 *    arquivo não previu — um título de duas linhas, uma resposta de FAQ com o
 *    dobro do tamanho. Coordenada fixa quebraria na primeira edição. Os
 *    espaçamentos continuam sendo os do arquivo, medidos como diferença entre
 *    as coordenadas Y das seções:
 *
 *      133   banner            →  fim em 623
 *      665   identidade        →  fim em 829
 *      873   "Selecionar servidor"
 *      991   painel de categoria
 *      1281  barra do catálogo
 *      1356  grade de produtos →  paginação em 3149
 *      3249  referências
 *      3700  notícias
 *      4256  dúvidas
 *      5338  rodapé
 *
 *    Esses vãos continuam valendo para a ordem PADRÃO. Desde 2026-09-10 o
 *    builder reordena e esconde qualquer um dos nove blocos, e aí eles se
 *    espaçam de forma regular — ver `features/game/sections.ts`.
 *
 * O catálogo (filtro, ordenação, busca, paginação) roda no SERVIDOR, com o
 * estado na URL — ver `features/game/catalog.ts`.
 */
export default async function GamePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  if (!isGameSlug(slug)) notFound();
  const base = await getGamePage(slug);
  if (!base) notFound();

  // A query é validada CONTRA a página (abas e servidores deste jogo), e a
  // página só sabe qual aba está ativa depois disso. Daí a ordem: lê, valida,
  // e então aplica a escolha — ver `withActiveTab`.
  const query = parseCatalogQuery(await searchParams, base);
  // Abas por servidor (2026-11-17): a página sai recortada para a escolha.
  const page = scopePageToQuery(withActiveTab(base, query.tab), query);

  // Construtor de páginas (2026-09-25): a página DESTE jogo publicada por
  // blocos manda na ordem das seções e nos blocos novos. O id já veio em
  // `getGamePage` (2026-11-22): antes havia um `GET /games/:slug` a mais aqui,
  // EM FILA — o `fetch` com `no-store` não era deduplicado.
  // Catálogo ADIANTADO (2026-11-22): sai junto com a página publicada em vez
  // de esperar a grade renderizar. `getCatalog` tem `cache()`, e a grade usa
  // os mesmos `page`/`query` — pega esta mesma promessa.
  if (page.tabs.find((tab) => tab.id === page.activeTabId)?.layout === "CATALOG") {
    void getCatalog(page, query);
  }
  const published = base.id ? await getPublishedPage(`jogo-${base.id}`) : null;

  return (
    <div className="flex min-h-[var(--dvh)] flex-col bg-brand-bg">
      <SiteHeader />

      {/*
        Mesma moldura elástica da home, e pelo mesmo motivo: a faixa de
        conteúdo tem 1714px e as margens de 103px é que cedem quando a janela
        aperta. Ver o comentário em `app/page.tsx`.
      */}
      {/* A moldura é a MESMA da prévia do editor (`GameFrame`): fixa em 1714
          no desktop, fluida no celular (2026-10-09). */}
      <main className="flex flex-1 flex-col">
        <GameFrame
          glow={
            // Brilho do topo (Figma 1127:360): o centro dele cai acima do frame,
            // o que aparece é só a borda de baixo.
            <Image
              src="/images/game/glow-top.svg"
              alt=""
              width={472}
              height={472}
              aria-hidden
              priority
              className="pointer-events-none absolute -top-[310px] -left-[222px] size-[472px] max-w-none"
            />
          }
        >
          {/* A ORDEM dos blocos é do builder (etapa 10) — ou, com a página
              publicada no construtor, da lista de blocos dela. */}
          {published ? (
            <BlockColumn
              items={composeBlocks(published.blocks, published.refs, gameSectionNodes(page, query), {
                legacyGap: GAME_LEGACY_GAP,
              })}
            />
          ) : (
            <GamePageSections page={page} query={query} />
          )}
        </GameFrame>
      </main>

      <SiteFooter />
    </div>
  );
}
