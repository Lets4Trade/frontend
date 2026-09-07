import { Pagination } from "@/components/ui/Pagination";
import Link from "next/link";
import { buildHref, selectProducts, type CatalogQuery } from "./catalog";
import { ProductCard } from "./ProductCard";
import type { GamePage } from "./types";

/**
 * Grade de produtos (Figma 1374:1859 e irmãos): seis colunas de 265px a cada
 * 290, quatro linhas a cada 442.
 *
 * `auto-fill` em vez de seis colunas fixas porque o número de produtos por
 * página é editável — com `grid-cols-6` uma página de 4 itens deixaria dois
 * buracos e uma de 30 estouraria a faixa.
 */
export function ProductGrid({
  page,
  query,
}: {
  page: GamePage;
  query: CatalogQuery;
}) {
  const result = selectProducts(page, query);

  // O carrinho mostra o NOME do servidor e o logo do jogo; o produto guarda só
  // o id do servidor. A página tem os dois, então a tradução acontece aqui.
  const server = page.servers.items.find((item) => item.id === query.server);
  const context = {
    gameSlug: page.slug,
    platform: server?.label ?? page.name,
    gameLogo: page.identity.logo.src,
  };

  if (result.items.length === 0) {
    return (
      <p className="py-[80px] text-center font-helvetica text-[18px] text-brand-fg-muted">
        Nenhum item encontrado com esses filtros.
      </p>
    );
  }

  return (
    <>
      {/*
        `gap-x` de 24 e não 25: seis cards de 265 com 25 de vão dão 1715px, um
        pixel a mais que a faixa de 1714 — o arquivo arredonda a margem direita
        para 102 em vez de 103. Com 25 o `auto-fill` cabe só CINCO colunas e a
        grade do arquivo (6×4) vira 5×5. O `justify-between` devolve o pixel.
      */}
      <div className="grid grid-cols-[repeat(auto-fill,265px)] justify-between gap-x-[24px] gap-y-[25px]">
        {result.items.map((product) => (
          <ProductCard key={product.id} product={product} context={context} />
        ))}
      </div>

      <Pagination
        current={result.page}
        pageCount={result.pageCount}
        href={(next) => buildHref(page.slug, query, { page: next })}
        label="do catálogo"
        className="mt-[50px]"
      />
    </>
  );
}
