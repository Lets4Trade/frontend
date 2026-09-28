import Image from "next/image";
import Link from "next/link";
import {
  PARAM,
  SORT_OPTIONS,
  buildHref,
  scopedCategories,
  toggleCategory,
  type CatalogQuery,
} from "./catalog";
import { pillClassName } from "./pill";
import type { GameCategory, GamePage } from "./types";

/**
 * Filtros do catálogo (Figma 1471:1798, 1486:1815, 1507:1897, 1184:651).
 *
 * TODOS são links, não botões com estado: o filtro mora na URL (ver
 * `catalog.ts`), então trocar de servidor é navegar. Isso é o que mantém a
 * filtragem no servidor e a página compartilhável.
 *
 * Foi essa decisão que fez a virada para o banco (2026-09-10) não tocar em
 * nenhum destes componentes: o objeto de query já era a query string da API.
 *
 * A busca é um `<form method="get">` de verdade: funciona sem JavaScript e não
 * precisa de client component.
 */

/** Botões de servidor: 197×50, 25px de vão (Figma 1471:1798). */
export function ServerPicker({
  page,
  query,
}: {
  page: GamePage;
  query: CatalogQuery;
}) {
  if (page.servers.items.length === 0) return null;

  return (
    <section>
      <h2 className="font-helvetica text-[18px] leading-none font-bold tracking-[0.18px] text-white">
        {page.servers.label}
      </h2>

      <div className="mt-[25px] flex flex-wrap gap-[25px]">
        {page.servers.items.map((server) => {
          const active = server.slug === query.server;
          return (
            <Link
              key={server.slug}
              href={buildHref(page.slug, query, { server: server.slug })}
              aria-current={active ? "true" : undefined}
              className={pillClassName(active)}
            >
              {server.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Painel "Selecionar categoria" (1486:1815): 1714×243, cinco colunas de 282px
 * a cada 306, três linhas a cada 55.
 *
 * A grade é `auto-fill` e não cinco colunas fixas: a contagem de categorias é
 * editável, e cinco colunas com três itens deixaria dois buracos.
 */
export function CategoryPanel({
  page,
  query,
}: {
  page: GamePage;
  query: CatalogQuery;
}) {
  // Só as do escopo: categoria de outro servidor/aba não filtraria nada aqui.
  const items = scopedCategories(page, query);
  if (items.length === 0) return null;

  return (
    <section className="rounded-[30px] border border-brand-border bg-[image:var(--brand-surface-fill)] px-[49px] pt-[25px] pb-[36px]">
      <h2 className="font-helvetica text-[18px] leading-none font-bold tracking-[0.18px] text-white">
        {page.categories.label}
      </h2>

      <div className="mt-[24px] grid grid-cols-[repeat(auto-fill,282px)] items-start gap-x-[24px] gap-y-[15px]">
        {items.map((category) => {
          const parentChecked = query.categories.includes(category.id);
          return (
            // Cada célula da grade é um bloco (pai + filhas recuadas): a
            // subcategoria fica colada no pai em vez de solta noutra linha.
            <div key={category.id} className="flex flex-col gap-[8px]">
              <CategoryToggle page={page} query={query} category={category} />
              {category.children.map((child) => (
                <CategoryToggle
                  key={child.id}
                  page={page}
                  query={query}
                  category={child}
                  // Com o pai marcado, a filha já está incluída no filtro (o
                  // backend soma as filhas ao pai) — o realce diz isso sem
                  // mudar a URL.
                  implied={parentChecked}
                  nested
                />
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Barra do catálogo (1193:808 + 1507:1897 + 1184:651): o nome do servidor
 * escolhido à esquerda, ordenação e busca à direita.
 *
 * O título é o rótulo do servidor ativo — no arquivo está escrito "Fate of the
 * Vaal SC", que é exatamente o servidor selecionado ao lado.
 */
export function CatalogToolbar({
  page,
  query,
}: {
  page: GamePage;
  query: CatalogQuery;
}) {
  const server = page.servers.items.find((item) => item.slug === query.server);

  return (
    <div className="flex items-center justify-between gap-[25px]">
      <h2 className="font-helvetica text-[22px] leading-none font-bold tracking-[0.22px] text-white">
        {server?.label ?? page.name}
      </h2>

      <div className="flex items-center gap-[32px]">
        {SORT_OPTIONS.map((option) => {
          const active = query.sort === option.key;
          return (
            <Link
              key={option.key}
              href={buildHref(page.slug, query, {
                // Clicar de novo na ordenação ativa desliga: sem isso não há
                // como voltar à ordem natural do catálogo.
                sort: active ? null : option.key,
              })}
              role="radio"
              aria-checked={active}
              className="flex items-center gap-[10px] transition-opacity hover:opacity-90"
            >
              <span
                aria-hidden
                className={`h-[30px] w-[32px] rounded-[8px] border-2 border-white/10 backdrop-blur-[100px] ${
                  active
                    ? "bg-[image:var(--brand-orange-gradient)]"
                    : "bg-[image:var(--brand-surface-fill)]"
                }`}
              />
              <span className="font-poppins text-[15px] leading-none font-bold tracking-[0.15px] text-white/80">
                {option.label}
              </span>
            </Link>
          );
        })}

        <SearchBox page={page} query={query} />
      </div>
    </div>
  );
}

function SearchBox({ page, query }: { page: GamePage; query: CatalogQuery }) {
  return (
    <form
      action={`/games/${page.slug}`}
      method="get"
      role="search"
      className="relative h-[50px] w-[219px]"
    >
      {/* O filtro atual viaja junto em campos escondidos. Um `<form>` GET
          descarta tudo o que não está nele — sem isto, buscar zeraria o
          servidor e as categorias escolhidas. */}
      <input type="hidden" name={PARAM.tab} value={query.tab} />
      <input type="hidden" name={PARAM.server} value={query.server} />
      {query.categories.map((id) => (
        <input key={id} type="hidden" name={PARAM.category} value={id} />
      ))}
      {query.sort ? (
        <input type="hidden" name={PARAM.sort} value={query.sort} />
      ) : null}

      <Image
        src="/icons/search.svg"
        alt=""
        width={20}
        height={20}
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-[25px] size-[20px] -translate-y-1/2"
      />
      <input
        type="search"
        name={PARAM.search}
        defaultValue={query.search}
        maxLength={80}
        aria-label="Pesquisar itens"
        placeholder="Pesquisar itens..."
        className="h-full w-full rounded-full border border-brand-border bg-[image:var(--brand-surface-fill)] pr-[20px] pl-[60px] font-helvetica text-[15px] tracking-[0.15px] text-white outline-none placeholder:text-brand-placeholder focus-visible:border-brand-orange"
      />
    </form>
  );
}

function CategoryToggle({
  page,
  query,
  category,
  implied = false,
  nested = false,
}: {
  page: GamePage;
  query: CatalogQuery;
  category: GameCategory;
  implied?: boolean;
  nested?: boolean;
}) {
  const checked = query.categories.includes(category.id);
  const lit = checked || implied;
  return (
    <Link
      href={buildHref(page.slug, query, {
        categories: toggleCategory(query, category.id),
      })}
      // Um link que liga e desliga é uma caixa de seleção para quem usa leitor
      // de tela — o papel diz isso, o href faz funcionar.
      role="checkbox"
      aria-checked={checked}
      className={`flex items-center gap-[10px] rounded-[8px] border border-white/10 backdrop-blur-[100px] transition-opacity hover:opacity-90 ${
        nested ? "ml-[20px] h-[34px] w-[262px] px-[20px]" : "h-[40px] w-[282px] px-[25px]"
      } ${
        checked
          ? "bg-[image:var(--brand-orange-gradient)] text-white"
          : lit
            ? "bg-[image:var(--brand-surface-fill)] text-white ring-1 ring-brand-orange/60"
            : "bg-[image:var(--brand-surface-fill)] text-white/80"
      }`}
    >
      <span
        aria-hidden
        className={`shrink-0 border-2 border-white/10 backdrop-blur-[100px] ${
          nested ? "h-[22px] w-[24px] rounded-[6px]" : "h-[30px] w-[32px] rounded-[8px]"
        } ${checked ? "bg-brand-bg/40" : "bg-[image:var(--brand-surface-fill)]"}`}
      />
      <span
        className={`truncate font-poppins leading-none font-bold ${
          nested ? "text-[12px] tracking-[0.12px]" : "text-[13px] tracking-[0.13px]"
        }`}
      >
        {category.label}
      </span>
    </Link>
  );
}
