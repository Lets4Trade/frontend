import { builderStepHref, centralHref, pageBlocksHref } from "./central";
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

// ── Mapa da página da loja ──────────────────────────────────────────────────

export type StoreMapLink = { label: string; href: string };
export type StoreMapPart = { title: string; hint: string; links: StoreMapLink[] };

/**
 * A página do jogo NA ORDEM em que o cliente a vê, e onde se edita cada parte.
 * O conteúdo vive em quatro telas (Central, Builder, Construtor, Notícias);
 * este mapa é o índice — o nome de cada destino diz O QUE se edita, não o nome
 * interno da tela ("etapa 7").
 */
export function storePageMap(game: { id: string }): StoreMapPart[] {
  const builder = (step: string) => builderStepHref(game.id, step);
  const tabs = centralHref(game.id, { section: "abas" });
  const shared = `/admin/paginas?${new URLSearchParams({ pagina: "jogos-compartilhado" }).toString()}`;
  return [
    {
      title: "Banner principal",
      hint: "A imagem grande do topo.",
      links: [{ label: "Trocar banner", href: builder("banner") }],
    },
    {
      title: "Logo, título e abas",
      hint: "A logo do jogo, o título da página e os botões das abas.",
      links: [
        { label: "Logo", href: builder("logo") },
        { label: "Títulos", href: builder("titulos") },
        { label: "Abas", href: tabs },
      ],
    },
    {
      title: "Selecionar servidor",
      hint: "Os botões de servidor acima dos produtos.",
      links: [{ label: "Servidores", href: centralHref(game.id, { section: "visao-geral" }) }],
    },
    {
      title: "Selecionar categoria",
      hint: "O filtro lateral. Categorias globais valem em todas as abas; as de cada aba ficam na aba.",
      links: [
        { label: "Categorias globais", href: builder("categorias") },
        { label: "Categorias por aba", href: tabs },
      ],
    },
    {
      title: "Lista de produtos",
      hint: "Os produtos e preços de cada aba.",
      links: [{ label: "Produtos e preços", href: tabs }],
    },
    {
      title: "Descrição",
      hint: "O texto sobre o jogo abaixo dos produtos.",
      links: [{ label: "Descrição", href: builder("descricao") }],
    },
    {
      title: "Referências, notícias e dúvidas",
      hint: "Iguais em todas as páginas de jogo. Notícias publicadas no blog para este jogo aparecem aqui.",
      links: [
        { label: "Referências e dúvidas", href: shared },
        { label: "Notícias (blog)", href: "/admin/noticias" },
      ],
    },
    {
      title: "Ordem e blocos extras",
      hint: "Mudar a ordem das partes acima, esconder alguma ou somar blocos (vídeo, banner, FAQ…).",
      links: [{ label: "Blocos e ordem", href: pageBlocksHref(game.id) }],
    },
  ];
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
