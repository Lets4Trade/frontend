import Link from "next/link";
import type { ReactNode } from "react";
import { isGlobalCategory, type BuilderGame } from "@/features/admin/builder/types";
import { editProductHref, newProductHref, productsListHref } from "@/features/admin/products/links";
import { getInactiveProducts, getProductOrdering } from "@/features/admin/products/ordering";
import { cn } from "@/lib/cn";
import { NEW_TAB, centralHref, pickCentralTab, type CentralQuery } from "./central";
import { categoriesOnStore, productGrid, storePageMap } from "./centralView";
import { GameEditForm } from "./GameEditForm";
import { ReactivateProductButton } from "./ReactivateProductButton";
import { NewTabPanel, TabDetailPanel } from "./tabs/GameTabsEditor";
import { getTabCategories } from "./tabs/list";
import { ScopedCategoriesEditor } from "./tabs/ScopedCategoriesEditor";
import { TabsMasterList } from "./tabs/TabsMasterList";
import { hasTabContent, isProductTab, type GameTab, type ScopedCategoryRow } from "./tabs/types";

/**
 * As três seções da Central do jogo (admin-games-ux.md, Etapa 2) — server
 * components: cada uma lê só o que desenha, e só quando está aberta.
 */

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// ── Visão geral ─────────────────────────────────────────────────────────────

export function OverviewSection({ game }: { game: BuilderGame }) {
  return (
    <section className="rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)] p-[20px] pb-0 sm:p-[30px] sm:pb-0">
      <SectionTitle id="visao-geral-titulo">Visão geral</SectionTitle>
      <p className="mt-[8px] mb-[30px] font-poppins text-[13px] text-brand-fg-subtle">
        Nome, link, imagem e servidores do jogo. Abas, produtos e categorias ficam em “Abas e produtos”.
      </p>
      <GameEditForm
        // Salvo, a página revalida e o formulário remonta com o que o servidor
        // devolveu — o "tem mudança?" volta a comparar com o gravado.
        key={JSON.stringify([game.name, game.slug, game.imageUrl, game.servers.map((s) => [s.id, s.label])])}
        game={game}
      />
    </section>
  );
}

// ── Página da loja ──────────────────────────────────────────────────────────

/**
 * O MAPA da página do jogo (revisão 2026-10-01): as partes na ordem em que o
 * cliente as vê, cada uma com o link para onde se edita. O conteúdo vive em
 * quatro telas; daqui a pessoa não precisa saber qual é qual.
 */
export function StorePageSection({ game }: { game: BuilderGame }) {
  const parts = storePageMap(game);
  return (
    <section aria-labelledby="pagina-titulo">
      <div className="flex flex-wrap items-end justify-between gap-[12px]">
        <div>
          <SectionTitle id="pagina-titulo">Página da loja</SectionTitle>
          <p className="mt-[8px] font-poppins text-[13px] text-brand-fg-subtle">
            A página do jogo de cima para baixo, como o cliente vê. Clique no que quer mudar.
          </p>
        </div>
        <Link
          href={`/games/${encodeURIComponent(game.slug)}`}
          target="_blank"
          rel="noopener"
          className="font-poppins text-[14px] font-bold text-brand-orange transition-opacity hover:opacity-80"
        >
          Ver na loja ↗
        </Link>
      </div>
      <ol className="mt-[20px] flex flex-col gap-[10px]">
        {parts.map((part, index) => (
          <li
            key={part.title}
            className="flex flex-wrap items-center gap-x-[20px] gap-y-[10px] rounded-[16px] border border-brand-border bg-[image:var(--brand-surface-fill)] px-[20px] py-[16px]"
          >
            <span
              aria-hidden
              className="flex size-[30px] shrink-0 items-center justify-center rounded-full border border-white/15 font-poppins text-[13px] font-bold text-white/70"
            >
              {index + 1}
            </span>
            <div className="min-w-[200px] flex-1">
              <p className="font-poppins text-[15px] font-bold text-white">{part.title}</p>
              <p className="mt-[2px] font-poppins text-[12px] text-brand-fg-subtle">{part.hint}</p>
            </div>
            <div className="flex flex-wrap gap-[8px]">
              {part.links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="flex h-[36px] items-center rounded-full border border-white/15 px-[14px] font-poppins text-[12px] font-bold text-white transition-colors hover:border-brand-orange/60"
                >
                  {link.label} →
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ── Abas e produtos ─────────────────────────────────────────────────────────

/**
 * Mestre-detalhe: à esquerda as abas (`TabsMasterList`); à direita, da aba
 * escolhida (`?aba=`), (a) o resumo da aba (configurações fechadas — são de
 * uma vez só), (b) os produtos em grade produto × servidor e (c) as
 * categorias, cujo escopo é o `?servidor=` (vazio = aba inteira).
 *
 * Aba e servidor da URL só valem se forem DESTE jogo (conferidos contra as
 * listas lidas); senão cai na primeira aba / em "todos os servidores".
 */
export function TabsSection({
  game,
  tabs,
  query,
}: {
  game: BuilderGame;
  /** Lidas pela página, em paralelo com o jogo. `null` = a leitura falhou. */
  tabs: GameTab[] | null;
  query: CentralQuery;
}) {
  if (tabs === null) {
    // Falha de leitura NÃO é "sem abas": mostrar a lista vazia convidaria a
    // recriar abas que já existem.
    return (
      <Notice alert>Não conseguimos carregar as abas deste jogo agora. Recarregue a página em instantes.</Notice>
    );
  }

  const creating = query.tabId === NEW_TAB || tabs.length === 0;
  const tab = creating ? null : pickCentralTab(tabs, query.tabId);
  const servers = [...game.servers].sort((a, b) => a.position - b.position);
  const server = servers.find((item) => item.id === query.serverId) ?? null;

  return (
    <div className="flex flex-col gap-[25px]">
      <TabsMasterList
        gameId={game.id}
        tabs={tabs}
        selectedId={tab?.id ?? NEW_TAB}
        serverId={server?.id ?? ""}
      />

      <div className="flex min-w-0 flex-col gap-[25px]">
        {tab === null ? (
          <>
            {tabs.length === 0 ? (
              <Notice>Este jogo ainda não tem abas. Sem nenhuma, a página dele abre sem catálogo.</Notice>
            ) : null}
            <NewTabPanel gameId={game.id} />
          </>
        ) : (
          <>
            {/* `key`: outra aba abre com as configurações fechadas. */}
            <TabDetailPanel key={tab.id} gameId={game.id} gameSlug={game.slug} tab={tab} />
            {isProductTab(tab) ? (
              <TabProductsAndCategories game={game} tab={tab} servers={servers} server={server} />
            ) : (
              <Notice>
                {tab.layout === "LINK"
                  ? "Aba de link só leva para outra página, sem produtos nem categorias."
                  : "Aba de venda mostra o formulário de venda, sem produtos nem categorias."}
              </Notice>
            )}
          </>
        )}
      </div>
    </div>
  );
}

type Server = BuilderGame["servers"][number];

async function TabProductsAndCategories({
  game,
  tab,
  servers,
  server,
}: {
  game: BuilderGame;
  tab: GameTab;
  servers: Server[];
  server: Server | null;
}) {
  // As leituras são independentes: em paralelo. As categorias da aba "em
  // todos os servidores" vêm sempre (entram no "na loja aparece"); as do
  // servidor escolhido, só com servidor.
  const [ordering, tabCategories, serverCategories, inactive] = await Promise.all([
    getProductOrdering(game.id, tab.id),
    getTabCategories(game.id, tab.id, null),
    server ? getTabCategories(game.id, tab.id, server.id) : Promise.resolve(null),
    getInactiveProducts(game.id, tab.id),
  ]);

  // O endereço desta tela, exatamente como está — o `volta` do cadastro e da
  // edição de produto traz a pessoa de volta para esta aba e este servidor.
  const here = centralHref(game.id, { section: "abas", tabId: tab.id, serverId: server?.id ?? "" });
  const grid = ordering.ok ? productGrid(ordering.items, servers) : null;
  const quoted = hasTabContent(tab.layout);
  const editorCategories = server ? serverCategories : tabCategories;
  const pricesHref = `/admin/produtos/precos?${new URLSearchParams({
    jogo: game.id,
    aba: tab.id,
    ...(server ? { servidor: server.id } : {}),
  }).toString()}`;

  return (
    <>
      <section
        aria-labelledby="produtos-aba"
        className="rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)] p-[20px]"
      >
        <div className="flex flex-wrap items-center justify-between gap-[12px]">
          <div>
            <h3 id="produtos-aba" className="font-poppins text-[16px] font-bold text-white">
              Produtos e preços
            </h3>
            <p className="mt-[4px] font-poppins text-[12px] text-brand-fg-subtle">
              {ordering.ok
                ? `${ordering.items.length}${ordering.truncated ? "+" : ""} produto${ordering.items.length === 1 ? "" : "s"}`
                : "-"}
              {grid && grid.rows.length > 0 && servers.length > 1 ? ` · ${grid.rows.length} por servidor` : ""} · na ordem da loja
              {quoted ? " · o preço é a base da regra de cada produto" : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-[8px]">
            <Link
              href={pricesHref}
              className="flex h-[40px] items-center rounded-full border border-brand-orange/60 px-[16px] font-poppins text-[13px] font-bold text-white transition-opacity hover:opacity-80"
            >
              Editar preços
            </Link>
            <Link
              href={`/admin/produtos/ordem?${new URLSearchParams({ jogo: game.id, aba: tab.id }).toString()}`}
              className="flex h-[40px] items-center rounded-full border border-white/10 px-[16px] font-poppins text-[13px] font-bold text-white transition-opacity hover:opacity-80"
            >
              Organizar ordem
            </Link>
            <Link
              href={newProductHref({ gameId: game.id, tabId: tab.id, serverId: server?.id ?? "", returnTo: here })}
              className="flex h-[40px] items-center rounded-full bg-brand-orange px-[18px] font-poppins text-[13px] font-bold text-black transition-opacity hover:opacity-90"
            >
              + Produto nesta aba
            </Link>
          </div>
        </div>

        {grid === null ? (
          <p role="alert" className="mt-[20px] font-poppins text-[14px] text-brand-fg-muted">
            Não conseguimos carregar os produtos desta aba agora. Recarregue a página.
          </p>
        ) : grid.rows.length === 0 ? (
          <p className="mt-[20px] font-poppins text-[14px] text-brand-fg-subtle">Nenhum produto nesta aba ainda.</p>
        ) : (
          <>
            {/* Grade produto × servidor: uma linha por produto, um preço por
                servidor — 30 linhas em vez de 120 repetidas. Cada preço abre
                a edição daquele produto. */}
            <div className="mt-[15px] overflow-x-auto rounded-[12px] border border-white/5">
              <table className="w-full min-w-[480px] border-collapse font-poppins text-[13px]">
                <thead className="bg-black/40">
                  <tr className="text-left text-[12px] text-brand-fg-subtle">
                    <th scope="col" className="sticky left-0 z-[1] bg-[#0a0a0a] px-[12px] py-[10px] font-bold">
                      Produto
                    </th>
                    {grid.columns.map((column) => (
                      <th
                        key={column.id ?? "sem-servidor"}
                        scope="col"
                        className={cn(
                          "px-[12px] py-[10px] text-right font-bold",
                          server && column.id === server.id && "text-white",
                        )}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.rows.map((row) => (
                    <tr key={row.name} className="border-t border-white/5">
                      <th
                        scope="row"
                        // Fixa ao rolar para o lado (celular): o preço nunca fica sem o nome.
                        className="sticky left-0 z-[1] max-w-[200px] bg-[#0a0a0a] px-[12px] py-[8px] text-left font-normal text-white sm:max-w-[260px]"
                      >
                        <span className="block truncate">{row.name}</span>
                        {row.mixed ? (
                          <span className="block text-[11px] text-brand-fg-subtle">preço varia por servidor</span>
                        ) : null}
                      </th>
                      {row.cells.map((cell, index) => (
                        <td
                          key={grid.columns[index]?.id ?? "sem-servidor"}
                          className={cn(
                            "px-[12px] py-[8px] text-right whitespace-nowrap",
                            server && grid.columns[index]?.id === server.id && "bg-brand-orange/[0.06]",
                          )}
                        >
                          {cell.length === 0 ? (
                            <span className="text-white/25">-</span>
                          ) : (
                            <>
                              <Link
                                href={editProductHref(cell[0].id, here)}
                                aria-label={`Editar ${row.name}${grid.columns[index] ? ` (${grid.columns[index].label})` : ""}`}
                                className="font-bold text-white underline-offset-4 transition-colors hover:text-brand-orange hover:underline"
                              >
                                {brl.format(cell[0].priceCents / 100)}
                              </Link>
                              {cell.length > 1 ? (
                                <span
                                  title="Há mais de um produto com este nome neste servidor"
                                  className="ml-[6px] text-[11px] text-brand-orange"
                                >
                                  +{cell.length - 1}
                                </span>
                              ) : null}
                            </>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-[10px] font-poppins text-[12px] text-brand-fg-subtle">
              Clique num preço para editar o produto. Para mudar vários preços de uma vez, use “Editar preços”.
              {ordering.ok && ordering.truncated ? (
                <>
                  {" "}
                  Esta aba passa de {ordering.items.length} produtos;{" "}
                  <Link href={productsListHref({ gameId: game.id, tabId: tab.id })} className="font-bold text-brand-orange">
                    veja todos na listagem →
                  </Link>
                </>
              ) : null}
            </p>
          </>
        )}

        {/* Lixeira = desativar. O desativado não é editável pela API, então
            aqui ele só tem "Reativar". Fechado por padrão: é resgate, não rotina. */}
        {inactive === null ? (
          <p className="mt-[15px] font-poppins text-[12px] text-brand-fg-subtle">
            Não conseguimos carregar os produtos excluídos desta aba.
          </p>
        ) : inactive.items.length > 0 ? (
          <details className="mt-[15px] rounded-[12px] border border-white/5 px-[15px] py-[10px]">
            <summary className="cursor-pointer font-poppins text-[13px] font-bold text-brand-fg-muted">
              Excluídos ({inactive.items.length}
              {inactive.truncated ? "+" : ""})
            </summary>
            <ul className="mt-[8px] flex flex-col divide-y divide-white/5">
              {inactive.items.map((product) => (
                <li key={product.id} className="flex flex-wrap items-center gap-x-[15px] gap-y-[4px] py-[10px]">
                  <span className="min-w-[160px] flex-1 truncate font-poppins text-[14px] text-brand-fg-muted">
                    {product.name}
                  </span>
                  <span className="font-poppins text-[12px] text-brand-fg-subtle">
                    {product.serverLabel ?? "Sem servidor"}
                  </span>
                  <span className="w-[110px] text-right font-poppins text-[13px] text-brand-fg-muted">
                    {brl.format(product.priceCents / 100)}
                  </span>
                  <ReactivateProductButton id={product.id} name={product.name} />
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      <section
        id="categorias"
        aria-labelledby="categorias-aba"
        className="rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)] p-[20px]"
      >
        <h3 id="categorias-aba" className="font-poppins text-[16px] font-bold text-white">
          Categorias do filtro
        </h3>
        <p className="mt-[4px] max-w-[760px] font-poppins text-[12px] text-brand-fg-subtle">
          O painel “Selecionar categoria” da loja. Cada servidor pode ter categorias próprias, além das que valem
          para a aba inteira.
        </p>

        {servers.length > 0 ? (
          <nav aria-label="Servidor das categorias" className="mt-[15px] flex flex-wrap gap-[8px]">
            <Pill href={centralHref(game.id, { section: "abas", tabId: tab.id })} active={server === null}>
              Aba inteira
            </Pill>
            {servers.map((item) => (
              <Pill
                key={item.id}
                href={centralHref(game.id, { section: "abas", tabId: tab.id, serverId: item.id })}
                active={item.id === server?.id}
              >
                Só em {item.label}
              </Pill>
            ))}
          </nav>
        ) : null}

        <CategoriesOnStore
          game={game}
          tab={tab}
          server={server}
          tabRows={tabCategories}
          serverRows={serverCategories}
        />

        <div className="mt-[20px] border-t border-white/10 pt-[20px]">
          <p className="mb-[15px] font-poppins text-[14px] font-bold text-white">
            {server ? `Editar as categorias só de ${server.label}` : "Editar as categorias da aba inteira"}
          </p>
          {editorCategories === null ? (
            <p role="alert" className="font-poppins text-[14px] text-brand-fg-muted">
              Não conseguimos carregar as categorias deste escopo. Recarregue a página.
            </p>
          ) : (
            <ScopedCategoriesEditor
              key={`${tab.id}|${server?.id ?? "todos"}`}
              gameId={game.id}
              tabId={tab.id}
              serverId={server?.id ?? null}
              initial={editorCategories}
            />
          )}
        </div>
      </section>
    </>
  );
}

const ORIGIN_LABEL = {
  global: "Globais (todas as abas)",
  tab: "Desta aba (todos os servidores)",
  server: "Só neste servidor",
} as const;

/**
 * "Na loja aparece": as categorias que o filtro mostra nesta aba (e servidor),
 * separadas pela origem — é o que responde "por que essa categoria está aí?".
 */
function CategoriesOnStore({
  game,
  tab,
  server,
  tabRows,
  serverRows,
}: {
  game: BuilderGame;
  tab: GameTab;
  server: Server | null;
  tabRows: ScopedCategoryRow[] | null;
  serverRows: ScopedCategoryRow[] | null;
}) {
  // As globais vêm do jogo (as do Builder): raízes, com as filhas aninhadas
  // ou, se vierem achatadas, pelo `parentId`.
  const globals = game.categories
    .filter((row) => isGlobalCategory(row) && !row.parentId)
    .sort((a, b) => a.position - b.position)
    .map((row) => ({
      id: row.id,
      label: row.label,
      children:
        row.children ??
        game.categories.filter((child) => child.parentId === row.id).sort((a, b) => a.position - b.position),
    }));
  const groups = categoriesOnStore({ global: globals, tab: tabRows, server: server ? serverRows : null });
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <div className="mt-[20px] rounded-[14px] border border-white/10 bg-black/20 p-[15px]">
      <p className="font-poppins text-[13px] font-bold text-white">
        Na loja, {tab.label}
        {server ? ` · ${server.label}` : ""} mostra:
      </p>
      {total === 0 ? (
        <p className="mt-[8px] font-poppins text-[13px] text-brand-fg-subtle">
          Nenhuma categoria: o painel “Selecionar categoria” não aparece{server ? " neste servidor" : ""}.
        </p>
      ) : (
        <div className="mt-[10px] grid gap-[12px] sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
          {groups.map((group) => (
            <div key={group.origin}>
              <p className="flex flex-wrap items-baseline gap-x-[8px] font-poppins text-[11px] font-bold tracking-[0.3px] text-brand-fg-subtle uppercase">
                {ORIGIN_LABEL[group.origin]}
                {group.origin === "global" ? (
                  <Link
                    href={`/admin/builder/${encodeURIComponent(game.id)}?etapa=categorias`}
                    className="tracking-normal text-brand-orange normal-case"
                  >
                    editar
                  </Link>
                ) : null}
              </p>
              {group.items.length === 0 ? (
                <p className="mt-[4px] font-poppins text-[12px] text-white/30">nenhuma</p>
              ) : (
                <ul className="mt-[4px] flex flex-col gap-[2px]">
                  {group.items.map((item) => (
                    <li key={item.id} className="font-poppins text-[13px] text-white">
                      {item.label}
                      {item.children.length ? (
                        <span className="text-brand-fg-subtle"> › {item.children.join(", ")}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
      {!server ? (
        <p className="mt-[10px] font-poppins text-[12px] text-brand-fg-subtle">
          Escolha um servidor acima para ver também as categorias que só existem nele.
        </p>
      ) : null}
    </div>
  );
}

// ── Peças ───────────────────────────────────────────────────────────────────

function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="font-helvetica text-[22px] leading-none font-bold tracking-[0.2px] text-white">
      {children}
    </h2>
  );
}

function Pill({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex h-[36px] items-center rounded-full border px-[16px] font-poppins text-[12px] font-bold transition-colors",
        active
          ? "border-brand-orange bg-brand-orange/15 text-white"
          : "border-white/10 text-white/70 hover:border-white/30 hover:text-white",
      )}
    >
      {children}
    </Link>
  );
}

function Notice({ children, alert = false }: { children: ReactNode; alert?: boolean }) {
  return (
    <p
      role={alert ? "alert" : undefined}
      className="rounded-[20px] border border-dashed border-white/15 px-[20px] py-[30px] text-center font-poppins text-[14px] text-brand-fg-muted"
    >
      {children}
    </p>
  );
}
