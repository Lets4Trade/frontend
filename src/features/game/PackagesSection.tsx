import { Pagination } from "@/components/ui/Pagination";
import { buildHref, type CatalogQuery } from "./catalog";
import { getCatalog } from "./content";
import { PackageCard } from "./PackageCard";
import { ServiceText } from "./ServiceSection";
import { withEffectivePricing } from "./storefrontTabs";
import type { GamePage, GameTab } from "./types";

/**
 * Layout PACOTES de uma aba (Figma 1690:2010): a grade de cards de pacote
 * (1694:2522), seis por linha no desktop, paginada como o catálogo.
 *
 * Servidor e "Selecionar categoria" são os blocos GENÉRICOS da página (os
 * mesmos do catálogo, com as categorias do escopo servidor+aba) — ver
 * `layouts.ts`. Este bloco é só a grade: busca no BANCO já filtrado e
 * paginado (`getCatalog`), nunca a aba inteira na memória.
 */
export async function PackagesSection({
  page,
  query,
  tab,
}: {
  page: GamePage;
  query: CatalogQuery;
  tab: GameTab;
}) {
  const result = await getCatalog(page, query);
  const products = withEffectivePricing(result.items, tab.layout);

  const server = page.servers.items.find((item) => item.slug === query.server);
  const context = {
    gameSlug: page.slug,
    platform: server?.label ?? page.name,
    gameLogo: page.identity.logo?.src,
  };

  return (
    <section aria-label={tab.label}>
      {products.length === 0 ? (
        <p className="py-[80px] text-center font-helvetica text-[18px] text-brand-fg-muted">
          {query.categories.length > 0
            ? "Nenhum pacote encontrado nesta categoria."
            : "Ainda não há pacotes nesta aba. Fale com o suporte para encomendar."}
        </p>
      ) : (
        <>
          {/* Mesma grade do catálogo (265 de card; ver o comentário do 24 vs
              25 em `ProductGrid`). Abaixo de 1024 a própria `auto-fill`
              reduz as colunas — nada rola na horizontal. */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(265px,100%),265px))] justify-center gap-x-[24px] gap-y-[25px] lg:justify-between">
            {products.map((product) => (
              <PackageCard key={product.id} product={product} context={context} />
            ))}
          </div>

          <Pagination
            current={result.page}
            pageCount={result.pageCount}
            href={(next) => buildHref(page.slug, query, { page: next })}
            label="dos pacotes"
            className="mt-[50px]"
          />
        </>
      )}

      {tab.content ? (
        <div className="mt-[50px]">
          <ServiceText content={tab.content} />
        </div>
      ) : null}
    </section>
  );
}
