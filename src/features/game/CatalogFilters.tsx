import Image from "next/image";
import Link from "next/link";
import {
  PARAM,
  SORT_OPTIONS,
  activeCategory,
  buildHref,
  categoryChoice,
  scopedCategories,
  type CatalogQuery,
} from "./catalog";
import { pillClassName } from "./pill";
import type { GamePage } from "./types";

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

      <div className="mt-[16px] flex flex-wrap gap-[10px] lg:mt-[25px] lg:gap-[25px]">
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
 * Painel "Selecionar categoria" (1486:1815): grade de 282px a cada 306, linhas
 * a cada 55.
 *
 * Desde 2026-10-08 (pedido do usuário) são DOIS quadros e seleção ÚNICA: em
 * cima as categorias de topo; embaixo, num quadro próprio, as subcategorias da
 * categoria ativa (só quando ela tem). Escolher uma subcategoria mantém a mãe
 * marcada em cima: as duas mostram o check verde (o filtro usa a mais
 * específica — ver `categoryChoice`).
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

  const active = activeCategory(items, query);
  const children = active?.children ?? [];

  return (
    <div className="flex flex-col gap-[25px]">
      <CategoryBox title={page.categories.label}>
        {items.map((category) => (
          <CategoryOption
            key={category.id}
            label={category.label}
            // Marcada se escolhida OU mãe da subcategoria escolhida.
            checked={active?.id === category.id}
            href={buildHref(page.slug, query, { categories: categoryChoice(query, category, active) })}
          />
        ))}
      </CategoryBox>

      {active && children.length > 0 ? (
        <CategoryBox title={`Subcategorias de ${active.label}`}>
          {children.map((child) => (
            <CategoryOption
              key={child.id}
              label={child.label}
              checked={query.categories[0] === child.id}
              href={buildHref(page.slug, query, { categories: categoryChoice(query, child, active) })}
            />
          ))}
        </CategoryBox>
      ) : null}
    </div>
  );
}

function CategoryBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[24px] border border-brand-border bg-[image:var(--brand-surface-fill)] px-[14px] pt-[18px] pb-[20px] lg:rounded-[30px] lg:px-[24px] lg:pt-[25px] lg:pb-[30px]">
      <h2 className="font-helvetica text-[18px] leading-none font-bold tracking-[0.18px] text-white">{title}</h2>
      {/* Escolha única: grupo de rádios para o leitor de tela. */}
      <div
        role="radiogroup"
        aria-label={title}
        // Celular: duas colunas fluidas; desktop: a grade de 282px do arquivo.
        className="mt-[16px] grid grid-cols-2 items-start gap-x-[10px] gap-y-[10px] lg:mt-[24px] lg:grid-cols-[repeat(auto-fill,282px)] lg:gap-x-[24px] lg:gap-y-[15px]"
      >
        {children}
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
    // Celular: título, ordenações (2 por linha) e a busca em largura cheia,
    // empilhados; desktop: tudo numa linha, como no arquivo.
    <div className="flex flex-col gap-[16px] lg:flex-row lg:items-center lg:justify-between lg:gap-[25px]">
      <h2 className="font-helvetica text-[20px] leading-none font-bold tracking-[0.22px] text-white lg:text-[22px]">
        {server?.label ?? page.name}
      </h2>

      <div className="grid grid-cols-2 gap-x-[12px] gap-y-[12px] lg:flex lg:items-center lg:gap-[32px]">
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
      className="relative col-span-2 h-[50px] w-full lg:w-[219px]"
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

function CategoryOption({
  label,
  checked,
  href,
}: {
  label: string;
  checked: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      // Escolha única por quadro: rádio para quem usa leitor de tela; o href
      // faz funcionar (e clicar de novo na marcada desfaz).
      role="radio"
      aria-checked={checked}
      // Recuo curto (era 25px): caixinha de 22px com 9px em volta.
      className={`flex h-[40px] w-full min-w-0 items-center gap-[10px] rounded-[8px] lg:w-[282px] border border-white/10 pr-[14px] pl-[9px] backdrop-blur-[100px] transition-opacity hover:opacity-90 ${
        checked ? "bg-[image:var(--brand-orange-gradient)] text-white" : "bg-[image:var(--brand-surface-fill)] text-white/80"
      }`}
    >
      <span
        aria-hidden
        className={`flex size-[22px] shrink-0 items-center justify-center rounded-[6px] border-2 backdrop-blur-[100px] ${
          checked ? "border-[#22c55e]/60 bg-brand-bg/60" : "border-white/10 bg-[image:var(--brand-surface-fill)]"
        }`}
      >
        {checked ? (
          <svg viewBox="0 0 24 24" className="size-[14px]" fill="none" stroke="#22c55e" strokeWidth={3.4}>
            <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
      <span className="truncate font-poppins text-[13px] leading-none font-bold tracking-[0.13px]">
        {label}
      </span>
    </Link>
  );
}
