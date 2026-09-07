import { Pagination } from "@/components/ui/Pagination";
import type { Metadata } from "next";
import Link from "next/link";
import { getAdminGames } from "@/features/admin/catalog";
import { AdminProductCard } from "@/features/admin/products/AdminProductCard";
import {
  ProductFilters,
  TypeTabs,
} from "@/features/admin/products/ProductFilters";
import {
  buildHref,
  parseProductsQuery,
  type ProductsQuery,
} from "@/features/admin/products/catalog";
import { getAdminProducts } from "@/features/admin/products/list";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Produtos | Lets4Trade",
  robots: { index: false, follow: false },
};

/**
 * Painel → Produtos (Figma 3805:2807).
 *
 * Server component inteiro fora os cards (que precisam de estado só para a
 * confirmação de exclusão). Os filtros moram na URL, então a filtragem acontece
 * no BANCO — o navegador nunca baixa o catálogo todo para esconder a maior
 * parte dele.
 *
 * Medidas do arquivo: barra de filtros em y=117 com margens de 50px, abas em
 * y=218 (99px de altura), e a grade de cards em y=367 — seis colunas de 265px
 * numa faixa de 1715, a mesma da vitrine.
 * Sem barra horizontal: teto nas medidas do arquivo, e cede abaixo delas.
 */
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  // Os jogos vêm primeiro porque a query precisa deles para VALIDAR o filtro de
  // jogo — um id que não existe vira "sem filtro" em vez de listagem vazia.
  const games = await getAdminGames();
  const query = parseProductsQuery(
    params,
    games.map((game) => game.id),
  );
  const page = await getAdminProducts(query);

  return (
    <div className="mx-auto w-full max-w-[1920px] px-[50px] pt-[34px] pb-[120px]">
        <ProductFilters games={games} query={query} />

        <div className="mt-[51px]">
          <TypeTabs query={query} />
        </div>

        {/* A faixa dos cards é 1715 e a da barra de filtros é 1820: são larguras
            diferentes no arquivo, e a grade fica centrada dentro da maior. */}
        <div className="mx-auto mt-[50px] w-full max-w-[1715px]">
          {page.items.length === 0 ? (
            <EmptyState query={query} hasGames={games.length > 0} />
          ) : (
            <>
              {/* `gap-x` de 24 e não 25 pelo mesmo motivo da vitrine: seis cards
                  de 265 com 25 de vão dão 1715, um pixel a mais do que cabe, e
                  o `auto-fill` cairia para cinco colunas. O `justify-between`
                  devolve o pixel. */}
              <div className="grid grid-cols-[repeat(auto-fill,265px)] justify-between gap-x-[24px] gap-y-[25px]">
                {page.items.map((product) => (
                  <AdminProductCard key={product.id} product={product} />
                ))}
              </div>

              <Pagination
                current={page.page}
                pageCount={page.pageCount}
                href={(next) => buildHref(query, { page: next })}
                label="dos produtos"
                className="mt-[50px]"
              />
            </>
          )}
        </div>
    </div>
  );
}

/**
 * Vazio por FILTRO e vazio por CATÁLOGO dizem coisas diferentes, e misturar os
 * dois é o erro clássico aqui: "nenhum produto cadastrado" numa busca sem
 * resultado faz o admin achar que perdeu o catálogo.
 */
function EmptyState({
  query,
  hasGames,
}: {
  query: ProductsQuery;
  hasGames: boolean;
}) {
  const filtering = query.game !== "" || query.type !== "" || query.search !== "";

  if (filtering) {
    return (
      <div className="py-[80px] text-center">
        <p className="font-helvetica text-[18px] text-brand-fg-muted">
          Nenhum produto encontrado com esses filtros.
        </p>
        <Link
          href="/admin/produtos"
          className="mt-4 inline-block font-poppins text-[16px] font-bold tracking-[0.16px] text-brand-orange transition-opacity hover:opacity-80"
        >
          Limpar filtros
        </Link>
      </div>
    );
  }

  return (
    <div className="py-[80px] text-center">
      <p className="font-helvetica text-[18px] text-brand-fg-muted">
        Nenhum produto cadastrado ainda.
      </p>
      <Link
        href={hasGames ? "/admin/produtos/novo" : "/admin/jogos/novo"}
        className="mt-4 inline-block font-poppins text-[16px] font-bold tracking-[0.16px] text-brand-orange transition-opacity hover:opacity-80"
      >
        {hasGames ? "Cadastrar o primeiro produto →" : "Cadastrar um jogo primeiro →"}
      </Link>
    </div>
  );
}
