import Link from "next/link";
import {
  SORT_OPTIONS,
  activeCategory,
  buildHref,
  scopedCategories,
  type CatalogQuery,
} from "./catalog";
import { ALL_LABEL, pillClassName } from "./pill";
import { CatalogSearch } from "./CatalogSearch";
import { CategorySelect } from "./CategorySelect";
import { ServerDropdown } from "./ServerDropdown";
import type { GamePage } from "./types";
import { gameHref } from "@/features/game/href";

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

/**
 * Botões de servidor: 197×50, 25px de vão (Figma 1471:1798) — no computador.
 * No celular (2026-11-18) é um dropdown que fecha ao escolher (`ServerDropdown`).
 */
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

      <div className="mt-[16px] desk:hidden">
        <ServerDropdown
          label={page.servers.label}
          options={page.servers.items.map((server) => ({
            key: server.slug,
            label: server.label,
            href: buildHref(page.slug, query, { server: server.slug }),
            active: server.slug === query.server,
          }))}
        />
      </div>

      <div className="mt-[25px] flex flex-wrap gap-[25px] max-desk:hidden">
        {page.servers.items.map((server) => {
          const active = server.slug === query.server;
          return (
            <Link
              key={server.slug}
              href={buildHref(page.slug, query, { server: server.slug })}
              // Trocar filtro NÃO sobe a página (2026-11-17, pedido do
              // usuário): é a mesma tela, só a lista muda. Vale para servidor,
              // categoria/subcategoria e ordenação.
              scroll={false}
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
 * Painel "Selecionar categoria" (1486:1815).
 *
 * Desde 2026-11-18 (pedido do usuário: a lista de botões ocupava espaço demais
 * e só crescia) são SELECTS, não a grade de 282px: um para a categoria e, ao
 * lado, um para a subcategoria quando a escolhida tem filhas. A regra de
 * escolha é a mesma de 2026-10-08 — UMA por vez na URL, a mais específica, e
 * a mãe continua mostrada no primeiro select quando há subcategoria escolhida.
 *
 * "Todos" fixo e PRIMEIRO nos dois (2026-11-17): no de cima tira o filtro; no
 * de baixo volta para a mãe inteira.
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
  const selected = query.categories[0];

  return (
    <section className="rounded-[24px] border border-brand-border bg-[image:var(--brand-surface-fill)] px-[14px] pt-[18px] pb-[20px] desk:rounded-[30px] desk:px-[24px] desk:pt-[25px] desk:pb-[28px]">
      <h2 className="font-helvetica text-[18px] leading-none font-bold tracking-[0.18px] text-white">
        {page.categories.label}
      </h2>
      <div className="mt-[16px] grid gap-[14px] sm:grid-cols-2 desk:mt-[22px] desk:flex desk:gap-[24px]">
        <CategorySelect
          label="Categoria"
          value={active?.id ?? ALL_KEY}
          options={[
            { key: ALL_KEY, label: ALL_LABEL, href: buildHref(page.slug, query, { categories: [] }) },
            ...items.map((category) => ({
              key: category.id,
              label: category.label,
              href: buildHref(page.slug, query, { categories: [category.id] }),
            })),
          ]}
        />
        {active && children.length > 0 ? (
          <CategorySelect
            label={`Subcategoria de ${active.label}`}
            value={selected && selected !== active.id ? selected : ALL_KEY}
            options={[
              { key: ALL_KEY, label: ALL_LABEL, href: buildHref(page.slug, query, { categories: [active.id] }) },
              ...children.map((child) => ({
                key: child.id,
                label: child.label,
                href: buildHref(page.slug, query, { categories: [child.id] }),
              })),
            ]}
          />
        ) : null}
      </div>
    </section>
  );
}

/** Valor da opção "Todos" nos selects (não colide com id de categoria, que é cuid). */
const ALL_KEY = "__todos";

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
    <div className="flex flex-col gap-[16px] desk:flex-row desk:items-center desk:justify-between desk:gap-[25px]">
      <h2 className="font-helvetica text-[20px] leading-none font-bold tracking-[0.22px] text-white desk:text-[22px]">
        {server?.label ?? page.name}
      </h2>

      <div className="grid grid-cols-2 gap-x-[12px] gap-y-[12px] lg:grid-cols-4 desk:flex desk:items-center desk:gap-[32px]">
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
              scroll={false}
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
  // Em tempo real desde 2026-11-09 (ver `CatalogSearch`).
  return <CatalogSearch slug={page.slug} action={gameHref(page.slug)} query={query} />;
}
