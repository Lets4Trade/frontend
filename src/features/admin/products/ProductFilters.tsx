import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { AdminSearchBox, FilterMenu } from "@/features/admin/AdminFilters";
import type { AdminGame } from "@/features/admin/catalog";
import { cn } from "@/lib/cn";
import { PARAM, SORT_OPTIONS, buildHref, type ProductsQuery } from "./catalog";
import { categorySelectOptions } from "./categoryOptions";
import { newProductHref } from "./links";

/**
 * Topo de Painel → Produtos — versão "clean" (2026-10-01).
 *
 * Antes: cinco botões ("Cadastrar Game" inclusive, que é de Jogos), um select
 * de ordem MAIS quatro caixinhas de ordem, e as abas como ladrilhos de 99px.
 * Agora: título + as 3 ações do dia a dia, e UMA linha de filtros — jogo, aba,
 * servidor, ordem e busca —, todos na URL (a filtragem é no banco).
 *
 * Aba e servidor só aparecem com jogo escolhido: são de UM jogo.
 *
 * Categoria (2026-11-02): também só com jogo, e só as que valem para a aba e o
 * servidor escolhidos (escopo da categoria). "Categoria › Subcategoria", como
 * no cadastro; escolher a categoria traz também as subcategorias dela.
 */
export function ProductFilters({
  games,
  query,
  tabs,
}: {
  games: AdminGame[];
  query: ProductsQuery;
  /** Abas de produto do jogo escolhido (`null` = sem jogo ou leitura falhou). */
  tabs: { id: string; label: string; isActive: boolean }[] | null;
}) {
  // Navegar fecha os <details>: a `key` muda junto com a URL.
  const resetKey = `${query.game}|${query.tab}|${query.server}|${query.category}|${query.sort}|${query.search}|${query.page}`;

  const currentGame = games.find((game) => game.id === query.game);
  const currentTab = tabs?.find((tab) => tab.id === query.tab);
  const currentServer = currentGame?.servers.find((server) => server.id === query.server);
  const currentSort = SORT_OPTIONS.find((option) => option.value === query.sort) ?? SORT_OPTIONS[0];

  // Só as categorias que valem para a aba/servidor escolhidos (sem escopo = todas).
  const scopedCategories = (currentGame?.categories ?? []).filter(
    (category) =>
      (!query.tab || !category.tabId || category.tabId === query.tab) &&
      (!query.server || !category.serverId || category.serverId === query.server),
  );
  const categoryOptions = categorySelectOptions(scopedCategories);
  const currentCategory = categoryOptions.find((option) => option.value === query.category);

  const scope = query.game
    ? `?${PARAM.game}=${encodeURIComponent(query.game)}${query.tab ? `&${PARAM.tab}=${encodeURIComponent(query.tab)}` : ""}`
    : "";

  return (
    <div className="flex flex-col gap-[24px]">
      <div className="flex flex-wrap items-center gap-[16px]">
        <h1 className="mr-auto font-poppins text-[26px] leading-[32px] font-semibold text-white">Produtos</h1>
        {/* Editar preços e ordem levam o jogo/aba abertos: os dois são por aba. */}
        <Link href={`/admin/produtos/ordem${scope}`} className={cn(buttonVariants({ variant: "outline" }), "px-[24px]")}>
          Organizar ordem
        </Link>
        <Link href={`/admin/produtos/precos${scope}`} className={cn(buttonVariants({ variant: "outline" }), "px-[24px]")}>
          Editar preços
        </Link>
        <Link
          href={newProductHref({ gameId: query.game, tabId: query.tab, serverId: query.server })}
          className={cn(buttonVariants({ variant: "primary" }), "px-[24px]")}
        >
          + Novo produto
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-[12px]">
        <FilterMenu
          key={`game-${resetKey}`}
          width={220}
          label={currentGame?.name ?? "Todos os jogos"}
          active={query.game !== ""}
          options={[
            { href: buildHref(query, { game: "" }), label: "Todos os jogos", active: query.game === "" },
            ...games.map((game) => ({
              href: buildHref(query, { game: game.id }),
              label: game.name,
              active: game.id === query.game,
            })),
          ]}
        />

        {query.game && tabs && tabs.length > 0 ? (
          <FilterMenu
            key={`tab-${resetKey}`}
            width={200}
            label={currentTab?.label ?? "Todas as abas"}
            active={query.tab !== ""}
            options={[
              { href: buildHref(query, { tab: "" }), label: "Todas as abas", active: query.tab === "" },
              ...tabs.map((tab) => ({
                href: buildHref(query, { tab: tab.id }),
                label: tab.isActive ? tab.label : `${tab.label} (oculta)`,
                active: tab.id === query.tab,
              })),
            ]}
          />
        ) : null}

        {currentGame && currentGame.servers.length > 0 ? (
          <FilterMenu
            key={`server-${resetKey}`}
            width={250}
            label={currentServer?.label ?? "Todos os servidores"}
            active={query.server !== ""}
            options={[
              { href: buildHref(query, { server: "" }), label: "Todos os servidores", active: query.server === "" },
              ...currentGame.servers.map((server) => ({
                href: buildHref(query, { server: server.id }),
                label: server.label,
                active: server.id === query.server,
              })),
            ]}
          />
        ) : null}

        {currentGame && categoryOptions.length > 0 ? (
          <FilterMenu
            key={`category-${resetKey}`}
            width={260}
            label={currentCategory?.label ?? "Todas as categorias"}
            active={query.category !== ""}
            options={[
              { href: buildHref(query, { category: "" }), label: "Todas as categorias", active: query.category === "" },
              ...categoryOptions.map((option) => ({
                href: buildHref(query, { category: option.value }),
                label: option.label,
                active: option.value === query.category,
              })),
            ]}
          />
        ) : null}

        <FilterMenu
          key={`sort-${resetKey}`}
          width={215}
          label={currentSort.label}
          active={query.sort !== "recente"}
          options={SORT_OPTIONS.map((option) => ({
            href: buildHref(query, { sort: option.value }),
            label: option.label,
            active: option.value === query.sort,
          }))}
        />

        <AdminSearchBox
          action="/admin/produtos"
          name={PARAM.search}
          defaultValue={query.search}
          placeholder="Buscar pelo nome…"
          hidden={{
            [PARAM.game]: query.game,
            [PARAM.tab]: query.tab,
            [PARAM.server]: query.server,
            [PARAM.category]: query.category,
            [PARAM.sort]: query.sort === "recente" ? "" : query.sort,
          }}
        />
      </div>
    </div>
  );
}
