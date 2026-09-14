import type { ReactNode } from "react";
import { CatalogToolbar, CategoryPanel, ServerPicker } from "./CatalogFilters";
import { GameIdentity } from "./GameIdentity";
import {
  BannerSection,
  GameFaqSection,
  NewsSection,
  ReferencesSection,
} from "./GameSections";
import { ProductGrid } from "./ProductGrid";
import { gapBefore, type GameSectionKey } from "./sections";
import type { CatalogQuery } from "./catalog";
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

/** `null` = este bloco não tem o que mostrar nesta página. */
function renderSection(
  key: GameSectionKey,
  page: GamePage,
  query: CatalogQuery,
): ReactNode {
  switch (key) {
    case "banner":
      return page.banners.length > 0 ? <BannerSection banners={page.banners} /> : null;

    case "identity":
      return <GameIdentity page={page} />;

    case "servers":
      return page.servers.items.length > 0 ? (
        <ServerPicker page={page} query={query} />
      ) : null;

    case "categories":
      return page.categories.items.length > 0 ? (
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

    case "description":
      return page.description ? (
        <section className="rounded-[30px] border border-brand-border bg-[image:var(--brand-surface-fill)] px-[50px] py-[40px]">
          <p className="font-poppins text-[16px] leading-[26px] whitespace-pre-line text-brand-fg-muted">
            {page.description}
          </p>
        </section>
      ) : null;

    case "references":
      return page.references.items.length > 0 ? (
        <ReferencesSection references={page.references} />
      ) : null;

    case "news":
      return page.news.items.length > 0 ? <NewsSection news={page.news} /> : null;

    case "faq":
      return page.faq.length > 0 ? <GameFaqSection groups={page.faq} /> : null;
  }
}
