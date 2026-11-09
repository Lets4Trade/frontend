import { isProductTab, type GameTab, type ScopedCategoryRow } from "./tabs/types";

/**
 * Regras PURAS da Central do jogo, revisão de clareza (2026-10-01): avisos das
 * abas, a grade produto × servidor, o mapa da página da loja e as categorias
 * que a loja mostra num escopo. Fora dos componentes para serem testadas.
 */

// ── Avisos das abas ─────────────────────────────────────────────────────────

export type TabWarning = { code: "empty" | "no-link" | "no-text"; short: string; detail: string };

/**
 * O que está errado numa aba do ponto de vista do CLIENTE. Aba oculta não
 * avisa nada: ninguém a vê na loja, e ela já tem o selo OCULTA.
 */
export function tabWarnings(
  tab: Pick<GameTab, "isActive" | "layout" | "productCount" | "linkHref" | "content">,
): TabWarning[] {
  if (!tab.isActive) return [];
  const warnings: TabWarning[] = [];
  if (isProductTab(tab) && tab.productCount === 0) {
    warnings.push({
      code: "empty",
      short: "vazia na loja",
      detail: "Esta aba está ativa mas não tem produto: o cliente a abre e não encontra nada. Cadastre um produto ou oculte a aba.",
    });
  }
  if (tab.layout === "LINK" && !tab.linkHref) {
    warnings.push({
      code: "no-link",
      short: "sem link",
      detail: "Aba de link sem endereço: o botão não leva a lugar nenhum. Preencha o link nas configurações.",
    });
  }
  // Só SERVIÇO: sem texto a loja mostra o card de preço sozinho, sem dizer o
  // que o cliente está comprando. Em Quantidade e Pacotes o texto é opcional
  // (o card já se explica) — avisar ali seria ruído que ensina a ignorar aviso.
  if (tab.layout === "SERVICE" && !(tab.content?.sections ?? []).some((section) => section.items.length > 0 || section.title)) {
    warnings.push({
      code: "no-text",
      short: "sem textos",
      detail: "Sem textos, a loja mostra só o card de preço, sem explicar o serviço. Escreva-os em “Editar nome, layout e textos”.",
    });
  }
  return warnings;
}

// ── Grade produto × servidor ────────────────────────────────────────────────

type GridItem = { id: string; name: string; serverId?: string | null; serverLabel?: string | null };

export type GridColumn = { id: string | null; label: string };

export type GridRow<T> = {
  name: string;
  /** Uma lista por coluna (normalmente 0 ou 1 produto; 2+ = nome repetido no servidor). */
  cells: T[][];
  /** O mesmo produto tem preço diferente entre servidores. */
  mixed: boolean;
};

/**
 * A aba como grade: uma LINHA por nome de produto, uma COLUNA por servidor. É
 * como a pessoa pensa ("100 Chaos Orb custa quanto em cada servidor?") e
 * troca 120 linhas repetidas por 30.
 *
 * As linhas seguem a ordem da loja (primeira aparição do nome). O servidor
 * casa pelo ID; o rótulo é reserva para API antiga sem `serverId`. Produto
 * sem servidor (ou de servidor que não existe mais) vai para "Sem servidor",
 * que só aparece quando há algum.
 */
export function productGrid<T extends GridItem & { priceCents: number }>(
  items: readonly T[],
  servers: readonly { id: string; label: string }[],
): { columns: GridColumn[]; rows: GridRow<T>[] } {
  const columnOf = (item: T): number => {
    const index =
      item.serverId !== undefined
        ? servers.findIndex((server) => server.id === item.serverId)
        : servers.findIndex((server) => server.label === item.serverLabel);
    return index === -1 ? servers.length : index;
  };

  const rows = new Map<string, T[][]>();
  let orphan = false;
  for (const item of items) {
    const column = columnOf(item);
    if (column === servers.length) orphan = true;
    let cells = rows.get(item.name);
    if (!cells) {
      cells = Array.from({ length: servers.length + 1 }, () => []);
      rows.set(item.name, cells);
    }
    cells[column].push(item);
  }

  const columns: GridColumn[] = servers.map((server) => ({ id: server.id, label: server.label }));
  if (orphan || servers.length === 0) columns.push({ id: null, label: servers.length === 0 ? "Preço" : "Sem servidor" });

  return {
    columns,
    rows: [...rows.entries()].map(([name, cells]) => {
      const used = orphan || servers.length === 0 ? cells : cells.slice(0, servers.length);
      const prices = new Set(used.flat().map((item) => item.priceCents));
      return { name, cells: used, mixed: prices.size > 1 };
    }),
  };
}

// ── Categorias que a loja mostra ────────────────────────────────────────────

export type CategoryOrigin = "global" | "tab" | "server";

/** Uma categoria com os nomes das filhas, para a lista "na loja aparece". */
export type CategorySummary = { id: string; label: string; children: string[] };

/**
 * O que o filtro "Selecionar categoria" da loja mostra numa aba + servidor —
 * a mesma regra da vitrine (`scopeCategories`: servidor OU global E aba OU
 * global) — separado pela ORIGEM, para a pessoa saber onde mexer em cada uma.
 * Sem servidor escolhido, o grupo `server` não existe (cada servidor tem o seu).
 */
export function categoriesOnStore(scopes: {
  global: readonly { id: string; label: string; children?: readonly { label: string }[] | null }[];
  tab: readonly ScopedCategoryRow[] | null;
  server: readonly ScopedCategoryRow[] | null;
}): { origin: CategoryOrigin; items: CategorySummary[] }[] {
  const summarize = (rows: readonly { id: string; label: string; children?: readonly { label: string }[] | null }[]) =>
    rows.map((row) => ({ id: row.id, label: row.label, children: (row.children ?? []).map((child) => child.label) }));
  const groups: { origin: CategoryOrigin; items: CategorySummary[] }[] = [
    { origin: "global", items: summarize(scopes.global) },
    { origin: "tab", items: summarize(scopes.tab ?? []) },
  ];
  if (scopes.server) groups.push({ origin: "server", items: summarize(scopes.server) });
  return groups;
}
