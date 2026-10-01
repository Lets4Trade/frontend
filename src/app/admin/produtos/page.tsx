import { Pagination } from "@/components/ui/Pagination";
import type { Metadata } from "next";
import Link from "next/link";
import { getAdminGames } from "@/features/admin/catalog";
import { requireAdminPage } from "@/features/admin/guard";
import { getGameTabs } from "@/features/admin/games/tabs/list";
import { isProductTab } from "@/features/admin/games/tabs/types";
import { ADMIN_SHELL } from "@/features/admin/layout";
import { buildHref, parseProductsQuery, type ProductsQuery } from "@/features/admin/products/catalog";
import { getAdminProducts } from "@/features/admin/products/list";
import { ProductFilters } from "@/features/admin/products/ProductFilters";
import { ProductTable } from "@/features/admin/products/ProductTable";

export const metadata: Metadata = {
  title: "Produtos | Lets4Trade",
  robots: { index: false, follow: false },
};

/**
 * Painel → Produtos — versão "clean" (2026-10-01).
 *
 * Título + 3 ações, uma linha de filtros (jogo, aba, servidor, ordem, busca) e
 * a LISTA (`ProductTable`) no lugar da grade de cards da vitrine: no painel o
 * que importa é achar o produto e ver de que jogo/aba/servidor ele é.
 *
 * Os filtros moram na URL, então a filtragem acontece no BANCO — o navegador
 * nunca baixa o catálogo todo para esconder a maior parte dele.
 */
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;

  // Os jogos vêm primeiro porque a query precisa deles para VALIDAR o filtro de
  // jogo — um id que não existe vira "sem filtro" em vez de listagem vazia.
  const games = await getAdminGames();
  const parsed = parseProductsQuery(
    params,
    games.map((game) => game.id),
  );

  // Aba e servidor só existem com jogo escolhido: são DELE. `null` = leitura falhou.
  const gameTabs = parsed.game ? await getGameTabs(parsed.game) : null;
  const productTabs = gameTabs?.filter(isProductTab) ?? null;
  const game = games.find((item) => item.id === parsed.game);
  const query: ProductsQuery = {
    ...parsed,
    // Aba/servidor que não são deste jogo (URL editada à mão) viram "sem filtro".
    tab: productTabs?.some((tab) => tab.id === parsed.tab) ? parsed.tab : "",
    server: game?.servers.some((server) => server.id === parsed.server) ? parsed.server : "",
  };
  const page = await getAdminProducts(query);

  return (
    <div className={`${ADMIN_SHELL} pb-[120px]`}>
      <ProductFilters
        games={games}
        query={query}
        tabs={productTabs?.map(({ id, label, isActive }) => ({ id, label, isActive })) ?? null}
      />

      {parsed.game && !productTabs ? (
        <p className="mt-[16px] font-poppins text-[14px] text-brand-fg-subtle">
          Não conseguimos carregar as abas deste jogo agora.
        </p>
      ) : null}

      <div className="mt-[24px]">
        {page.items.length === 0 ? (
          <EmptyState query={query} hasGames={games.length > 0} />
        ) : (
          <>
            <p className="mb-[10px] font-helvetica text-[13px] text-brand-fg-subtle">
              {page.total} {page.total === 1 ? "produto" : "produtos"}
            </p>
            <ProductTable products={page.items} />

            <Pagination
              current={page.page}
              pageCount={page.pageCount}
              href={(next) => buildHref(query, { page: next })}
              label="dos produtos"
              className="mt-[30px]"
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
function EmptyState({ query, hasGames }: { query: ProductsQuery; hasGames: boolean }) {
  const filtering = query.game !== "" || query.tab !== "" || query.server !== "" || query.search !== "";

  if (filtering) {
    return (
      <div className="py-[80px] text-center">
        <p className="font-helvetica text-[18px] text-brand-fg-muted">Nenhum produto encontrado com esses filtros.</p>
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
      <p className="font-helvetica text-[18px] text-brand-fg-muted">Nenhum produto cadastrado ainda.</p>
      <Link
        href={hasGames ? "/admin/produtos/novo" : "/admin/jogos/novo"}
        className="mt-4 inline-block font-poppins text-[16px] font-bold tracking-[0.16px] text-brand-orange transition-opacity hover:opacity-80"
      >
        {hasGames ? "Cadastrar o primeiro produto →" : "Cadastrar um jogo primeiro →"}
      </Link>
    </div>
  );
}
