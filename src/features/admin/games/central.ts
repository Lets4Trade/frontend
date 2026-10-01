/**
 * Central do jogo (`/admin/jogos/[id]`, admin-games-ux.md, Etapa 2) — a parte
 * PURA: seções, leitura da query, endereços, redirecionamentos das rotas
 * antigas e o recorte dos produtos de uma aba. Sem `serverApi`: a página
 * (servidor), a navegação e os editores (cliente) importam daqui.
 *
 * Tudo o que vem da URL é input de cliente. A seção só passa se for uma das
 * três; aba e servidor só têm o FORMATO conferido aqui (ids opacos) — quem
 * decide se são deste jogo é a página, contra as listas que ela leu.
 */
import { isValidId, type GameTab } from "./tabs/types";

export const CENTRAL_SECTIONS = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "abas", label: "Abas e produtos" },
  { id: "pagina", label: "Página da loja" },
] as const;

export type CentralSection = (typeof CENTRAL_SECTIONS)[number]["id"];

/** "Abas e produtos" é a mais usada — é onde se abre sem `?secao=`. */
export const DEFAULT_CENTRAL_SECTION: CentralSection = "abas";

export const CENTRAL_PARAM = { section: "secao", tab: "aba", server: "servidor" } as const;

/** `?aba=nova`: o painel da direita mostra o formulário de nova aba. */
export const NEW_TAB = "nova";

export type CentralQuery = {
  section: CentralSection;
  /** Id de aba (formato conferido), `NEW_TAB` ou `""`. */
  tabId: string;
  /** Id de servidor (formato conferido) ou `""` = todos os servidores. */
  serverId: string;
};

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw : "";
}

function isSection(value: string): value is CentralSection {
  return CENTRAL_SECTIONS.some((section) => section.id === value);
}

export function parseCentralQuery(params: RawParams): CentralQuery {
  const rawSection = first(params[CENTRAL_PARAM.section]);
  const rawTab = first(params[CENTRAL_PARAM.tab]);
  const rawServer = first(params[CENTRAL_PARAM.server]);
  return {
    section: isSection(rawSection) ? rawSection : DEFAULT_CENTRAL_SECTION,
    tabId: rawTab === NEW_TAB || isValidId(rawTab) ? rawTab : "",
    serverId: isValidId(rawServer) ? rawServer : "",
  };
}

/**
 * Endereço da Central. Aba e servidor só existem na seção de abas — em outra
 * seção não são escritos (a URL fica limpa e não carrega escolha velha).
 */
export function centralHref(gameId: string, query: Partial<CentralQuery> = {}): string {
  const section = query.section ?? DEFAULT_CENTRAL_SECTION;
  const search = new URLSearchParams({ [CENTRAL_PARAM.section]: section });
  if (section === "abas") {
    const tab = query.tabId ?? "";
    if (tab === NEW_TAB || isValidId(tab)) search.set(CENTRAL_PARAM.tab, tab);
    if (tab !== NEW_TAB && isValidId(query.serverId)) search.set(CENTRAL_PARAM.server, query.serverId);
  }
  return `/admin/jogos/${encodeURIComponent(gameId)}?${search.toString()}`;
}

/**
 * Rotas antigas → Central (links salvos e favoritos continuam abrindo):
 * `/editar` → visão geral; `/abas` → abas; `/categorias?aba=&servidor=` → abas
 * com a mesma aba e servidor (`servidor=todos` = sem servidor).
 */
export function legacyCentralHref(
  gameId: string,
  route: "editar" | "abas" | "categorias",
  params: RawParams = {},
): string {
  if (route === "editar") return centralHref(gameId, { section: "visao-geral" });
  if (route === "abas") return centralHref(gameId, { section: "abas" });
  const tabId = first(params.aba);
  const serverId = first(params.servidor);
  return centralHref(gameId, {
    section: "abas",
    tabId: isValidId(tabId) ? tabId : "",
    serverId: isValidId(serverId) && serverId !== "todos" ? serverId : "",
  });
}

/** A aba pedida, se for deste jogo; senão a primeira. `null` = jogo sem abas. */
export function pickCentralTab(tabs: readonly GameTab[], tabId: string): GameTab | null {
  return tabs.find((tab) => tab.id === tabId) ?? tabs[0] ?? null;
}

/**
 * A navegação da Central, também usada no topo do Builder.
 *
 * O EDITOR (cargo) abre o Builder mas não a Central (só ADMIN — 404 para ele),
 * então para ele saem as três seções e "← Jogos"; ficam a volta à grade do
 * Builder, "Blocos e ordem" (Construtor de páginas, que ele acessa) e a loja.
 */
export type CentralNavLink = {
  key: CentralSection | "voltar" | "blocos" | "loja";
  href: string;
  label: string;
  external?: boolean;
};

export function centralNavLinks(
  game: { id: string; slug: string },
  canManage: boolean,
): { sections: CentralNavLink[]; extras: CentralNavLink[] } {
  const store: CentralNavLink = {
    key: "loja",
    href: `/games/${encodeURIComponent(game.slug)}`,
    label: "Ver na loja ↗",
    external: true,
  };
  if (!canManage) {
    return {
      sections: [],
      extras: [
        { key: "voltar", href: "/admin/builder", label: "← Builder" },
        { key: "blocos", href: pageBlocksHref(game.id), label: "Blocos e ordem" },
        store,
      ],
    };
  }
  return {
    sections: CENTRAL_SECTIONS.map((section) => ({
      key: section.id,
      href: centralHref(game.id, { section: section.id }),
      label: section.label,
    })),
    extras: [{ key: "voltar", href: "/admin/jogos", label: "← Jogos" }, store],
  };
}

/** O Construtor de páginas aberto na página deste jogo. */
export function pageBlocksHref(gameId: string): string {
  return `/admin/paginas?${new URLSearchParams({ pagina: `jogo-${gameId}` }).toString()}`;
}

/**
 * Ordem ainda não salva da lista de abas aplicada sobre as abas que o servidor
 * mandou. A tela guarda só os IDS: quando a página revalida (aba renomeada,
 * ativada...), os dados das abas se renovam sem perder a ordem em rascunho.
 * Aba que sumiu sai; aba nova entra no fim. `null` = ordem do servidor.
 */
export function applyTabOrder<T extends { id: string }>(tabs: readonly T[], order: readonly string[] | null): T[] {
  if (order === null) return [...tabs];
  const byId = new Map(tabs.map((tab) => [tab.id, tab]));
  const ordered = order.flatMap((id) => {
    const tab = byId.get(id);
    return tab ? [tab] : [];
  });
  const seen = new Set(ordered.map((tab) => tab.id));
  return [...ordered, ...tabs.filter((tab) => !seen.has(tab.id))];
}

/** Troca o item `index` com o vizinho (`-1` sobe, `1` desce). Fora dos limites = igual. */
export function moveInList<T>(list: readonly T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return [...list];
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/**
 * A visão geral tem algo a salvar? O botão só habilita com mudança de fato:
 * digitar e apagar de volta não conta. Servidores comparados na ORDEM (mover
 * é mudança) e pelo nome já aparado — o que o salvamento mandaria.
 */
export function isGameFormDirty(
  saved: { name: string; slug: string; servers: readonly { id: string; label: string }[] },
  draft: {
    name: string;
    /** Já na forma final (`slugify`). */
    slug: string;
    servers: readonly { id?: string; label: string }[];
    hasNewImage: boolean;
  },
): boolean {
  if (draft.hasNewImage) return true;
  if (draft.name.trim() !== saved.name || draft.slug !== saved.slug) return true;
  if (draft.servers.length !== saved.servers.length) return true;
  return draft.servers.some(
    (server, index) => server.id !== saved.servers[index].id || server.label.trim() !== saved.servers[index].label,
  );
}
