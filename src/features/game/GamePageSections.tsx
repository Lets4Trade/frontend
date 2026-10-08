import type { ReactNode } from "react";
import { CatalogToolbar, CategoryPanel, ServerPicker } from "./CatalogFilters";
import { GameIdentity } from "./GameIdentity";
import {
  BannerSection,
  GameFaqSection,
  NewsSection,
  ReferencesSection,
} from "./GameSections";
import { SellPageBody } from "@/features/sell/SellPageBody";
import { ReviewsSection } from "@/features/home/ReviewsSection";
import { VideoSection } from "@/features/home/VideoSection";
import { catalogBlockFor, showsGenericFilters } from "./layouts";
import { PackagesSection } from "./PackagesSection";
import { ProductGrid } from "./ProductGrid";
import { QuantitySection } from "./QuantitySection";
import { ServiceSection } from "./ServiceSection";
import { DEFAULT_GAP, DEFAULT_SECTION_ORDER, gapBefore, type GameSectionKey } from "./sections";
import { activeTab, scopedCategories, type CatalogQuery } from "./catalog";
import type { GamePage } from "./types";

/**
 * Desenha os blocos da página de jogo NA ORDEM que o builder gravou.
 *
 * Antes isto era JSX solto em `app/games/[slug]/page.tsx`, com cinco blocos em
 * ordem fixa e só quatro percorrendo uma lista. Virou um componente próprio
 * quando TODOS passaram a reordenar: a página ficou com um `map` e um `switch`,
 * e enfiar isso no meio do arquivo de rota tornaria difícil ver onde acaba a
 * moldura e começa o conteúdo.
 *
 * ── Bloco que não tem o que mostrar SOME ───────────────────────────────────
 * E some sem deixar o vão dele para trás — é por isso que o espaçamento é
 * calculado depois da filtragem, e não dentro de cada bloco. Um banner sem arte
 * ou um FAQ sem pergunta viraria um buraco no meio da página.
 *
 * A ÚNICA exceção é o catálogo: ele desenha a própria mensagem de "nenhum item
 * encontrado com esses filtros", porque ali o vazio é resposta a uma busca e
 * precisa ser dito, não escondido.
 */
export function GamePageSections({
  page,
  query,
}: {
  page: GamePage;
  query: CatalogQuery;
}) {
  const rendered = page.sections
    .map((key) => ({ key, node: renderSection(key, page, query) }))
    .filter((entry): entry is { key: GameSectionKey; node: ReactNode } =>
      Boolean(entry.node),
    );

  const visible = rendered.map((entry) => entry.key);

  return (
    <>
      {rendered.map((entry, index) => {
        const gap = gapBefore(visible, index);
        return (
          <div key={entry.key} style={gap > 0 ? { marginTop: gap } : undefined}>
            {entry.node}
          </div>
        );
      })}
    </>
  );
}

/**
 * As seções da página como PEÇAS (construtor de páginas, 2026-09-25): chave →
 * nó, só as que têm o que mostrar. A ordem e os blocos novos entre elas vêm da
 * página publicada; o vão é decidido na composição (`gapBefore`).
 */
export function gameSectionNodes(page: GamePage, query: CatalogQuery): Record<string, { node: ReactNode; gap: number }> {
  const out: Record<string, { node: ReactNode; gap: number }> = {};
  for (const key of DEFAULT_SECTION_ORDER) {
    const node = renderSection(key, page, query);
    if (node) out[key] = { node, gap: DEFAULT_GAP };
  }
  return out;
}

/** `null` = este bloco não tem o que mostrar nesta página. */
function renderSection(
  key: GameSectionKey,
  page: GamePage,
  query: CatalogQuery,
): ReactNode {
  // O layout da aba ativa decide os três blocos que dependem dela (tabela em
  // `layouts.ts`): SERVICE e QUANTITY levam o servidor para DENTRO do próprio
  // bloco, SELL não tem produto a filtrar, PACKAGES usa os filtros genéricos.
  // O resto da página (banner, identidade, referências, FAQ) fica igual.
  const tab = activeTab(page, query);
  if (tab) {
    if ((key === "servers" || key === "categories") && !showsGenericFilters(tab.layout, Boolean(query.pkg))) return null;
    if (key === "catalog") {
      switch (catalogBlockFor(tab.layout)) {
        case "service":
          return <ServiceSection page={page} query={query} tab={tab} />;
        case "quantity":
          return <QuantitySection page={page} query={query} tab={tab} />;
        case "packages":
          return <PackagesSection page={page} query={query} tab={tab} />;
        case "sell":
          return <SellPageBody game={{ slug: page.slug, name: page.name }} />;
        case "catalog":
          break;
      }
    }
  }
  // Jogo sem nenhuma aba de produto ativa (desde a FASE 5 as abas vêm SÓ do
  // banco): não há catálogo a pedir. Servidor e categoria somem — filtrariam
  // nada — e o bloco da lista vira um aviso; o resto da página continua.
  if (!tab && (key === "servers" || key === "categories" || key === "catalog")) {
    return key === "catalog" ? (
      <p className="rounded-[30px] border border-brand-border bg-[image:var(--brand-surface-fill)] px-[50px] py-[40px] text-center font-poppins text-[16px] text-brand-fg-muted">
        Nenhum produto disponível para este jogo no momento.
      </p>
    ) : null;
  }

  switch (key) {
    case "banner":
      return page.banners.length > 0 ? <BannerSection banners={page.banners} /> : null;

    case "identity":
      return <GameIdentity page={page} server={query.server} />;

    // Seções da home: desenhadas na faixa de 1820 dela, centralizada na
    // coluna de 1714 (sangra 53px de cada lado; a moldura corta abaixo de 1820).
    case "homeVideo":
      return (
        <HomeBleed>
          <VideoSection {...page.showcase.video} />
        </HomeBleed>
      );

    case "homeReviews":
      return (page.showcase.reviews.items?.length ?? 0) > 0 ? (
        <HomeBleed>
          <ReviewsSection {...page.showcase.reviews} />
        </HomeBleed>
      ) : null;

    case "servers":
      return page.servers.items.length > 0 ? (
        <ServerPicker page={page} query={query} />
      ) : null;

    case "categories":
      return scopedCategories(page, query).length > 0 ? (
        <CategoryPanel page={page} query={query} />
      ) : null;

    case "catalog":
      return (
        <>
          <CatalogToolbar page={page} query={query} />
          {/* O vão de 25px entre a barra e a grade é do arquivo e vive DENTRO
              do bloco: os dois são uma coisa só, e reordenar não os separa. */}
          <div className="mt-[25px]">
            <ProductGrid page={page} query={query} />
          </div>
        </>
      );

    case "references":
      return page.references.items.length > 0 ? (
        <ReferencesSection references={page.references} />
      ) : null;

    case "news":
      return page.news.items.length > 0 ? <NewsSection news={page.news} /> : null;

    // A descrição do jogo (etapa 9 do builder) toma o lugar do grupo "Dúvidas
    // frequentes" padrão (pedido do usuário, 2026-10-08), não num card solto.
    // O próprio `GameFaqSection` some quando não há pergunta nem descrição.
    case "faq":
      return <GameFaqSection groups={page.faq} description={page.description} />;
  }
}

/** A largura do desenho da home, centralizada na coluna da página de jogo. */
function HomeBleed({ children }: { children: ReactNode }) {
  return <div className="relative left-1/2 w-[1820px] -translate-x-1/2">{children}</div>;
}
