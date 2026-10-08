import type { GameCategory, GamePage, GameProduct, GameTab } from "./types";

/**
 * Estado do catálogo. Ele mora na URL, e não em `useState`, por três motivos
 * que valem mais que a conveniência:
 *
 *   1. a filtragem acontece no SERVIDOR — o navegador não baixa o catálogo
 *      inteiro para esconder 23 dos 24 cards;
 *   2. este objeto é a query string da API, sem tradução no meio;
 *   3. o estado é compartilhável e sobrevive ao voltar do navegador, que é o
 *      que qualquer pessoa espera de uma listagem de loja.
 *
 * O preço disso é uma navegação a cada clique de filtro. Numa listagem
 * server-rendered isso é o comportamento certo.
 *
 * O item 2 deixou de ser promessa em 2026-09-10: a filtragem e a ordenação
 * rodam no BANCO (ver `content.ts`), e este arquivo ficou só com o que sempre
 * foi seu — ler a URL, validá-la e montar links.
 */
export type SortKey = "az" | "za" | "menor" | "maior";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "az", label: "De A a Z" },
  { key: "za", label: "De Z a A" },
  { key: "menor", label: "Menor preço" },
  { key: "maior", label: "Maior preço" },
];

export type CatalogQuery = {
  tab: string;
  server: string;
  categories: string[];
  sort: SortKey | null;
  search: string;
  page: number;
  /**
   * Pacote aberto na aba PACKAGES (`?pacote=<productId>`, 2026-10-01): o
   * CONTINUAR troca a grade pela página do pacote. Opcional e EFÊMERO — só
   * sobrevive num link que o pede de novo (`buildHref` com `pkg`); trocar de
   * aba, servidor ou categoria volta à grade.
   */
  pkg?: string;
};

/** Nomes dos parâmetros. Ficam num só lugar porque links e leitura usam os dois. */
export const PARAM = {
  tab: "aba",
  server: "servidor",
  category: "categoria",
  sort: "ordem",
  search: "busca",
  page: "pagina",
  pkg: "pacote",
} as const;

/** Id de produto (cuid ou id legível da semente) — mesma regra do backend; o resto é ignorado. */
const PRODUCT_ID = /^[A-Za-z0-9_-]{1,100}$/;

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function all(value: string | string[] | undefined) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Lê a query e a valida CONTRA O CONTEÚDO da página. Nada que venha da URL é
 * aceito como veio: servidor, aba, categoria e ordenação só passam se existirem
 * neste jogo, e a página é um inteiro positivo.
 *
 * Isso NÃO substitui a validação do backend, que refaz tudo no DTO — é a
 * primeira das duas camadas, e a que evita mandar lixo pela rede. Sem ela, um
 * `?aba=inventada` viraria uma chamada de API que só volta para dizer que o
 * valor não existe.
 */
export function parseCatalogQuery(
  params: RawParams,
  page: GamePage,
): CatalogQuery {
  const serverSlugs = new Set(page.servers.items.map((item) => item.slug));
  // Toda aba que não é LINK é desta página (CATALOG, SERVICE, QUANTITY,
  // PACKAGES e SELL — esta última sem produto). As de link ("FIDELIDADE")
  // levam para outra página — aceitar `?aba=fidelidade` aqui pediria ao
  // backend uma aba que não filtra.
  const tabIds = new Set(
    page.tabs.filter((tab) => tab.layout !== "LINK").map((tab) => tab.id),
  );
  const sortKeys = new Set<string>(SORT_OPTIONS.map((option) => option.key));

  const rawTab = first(params[PARAM.tab]);
  const rawServer = first(params[PARAM.server]);
  const rawSort = first(params[PARAM.sort]);
  const rawPage = Number.parseInt(first(params[PARAM.page]) ?? "1", 10);

  const tab = rawTab && tabIds.has(rawTab) ? rawTab : page.activeTabId;
  const server =
    rawServer && serverSlugs.has(rawServer)
      ? rawServer
      : (page.servers.items[0]?.slug ?? "");
  // Pais E filhas (contrato C da FASE 4), mas só as do ESCOPO escolhido: uma
  // categoria de outro servidor/aba na URL não filtra nada aqui.
  const categoryIds = new Set(
    scopeCategories(page.categories.items, server, tab).flatMap((item) => [
      item.id,
      ...item.children.map((child) => child.id),
    ]),
  );

  return {
    tab,
    server,
    // Seleção ÚNICA desde 2026-10-08: link antigo com várias vale a primeira.
    categories: all(params[PARAM.category])
      .filter((id) => categoryIds.has(id))
      .slice(0, 1),
    sort: rawSort && sortKeys.has(rawSort) ? (rawSort as SortKey) : null,
    // Corta o texto: a busca vira `ILIKE` no banco, e comprimento sem limite no
    // boundary é convite para consulta cara.
    search: (first(params[PARAM.search]) ?? "").trim().slice(0, 80),
    page: Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1,
    ...(PRODUCT_ID.test(first(params[PARAM.pkg]) ?? "") ? { pkg: first(params[PARAM.pkg]) } : {}),
  };
}

/**
 * As categorias que valem para (servidor, aba): cada uma casa com o servidor
 * OU é global, E casa com a aba OU é global. Filha fora do escopo sai; pai fora
 * do escopo leva as filhas junto.
 */
export function scopeCategories(
  items: readonly GameCategory[],
  server: string,
  tab: string,
): GameCategory[] {
  const fits = (category: GameCategory) =>
    (!category.serverSlug || category.serverSlug === server) &&
    (!category.tabSlug || category.tabSlug === tab);

  return items.filter(fits).map((root) => ({
    ...root,
    children: root.children.filter(fits),
  }));
}

/** A aba ativa da query (nunca uma LINK). */
export function activeTab(page: GamePage, query: CatalogQuery): GameTab | undefined {
  return page.tabs.find((tab) => tab.id === query.tab && tab.layout !== "LINK");
}

/** As categorias do escopo atual: (servidor OU global) E (aba OU global). */
export function scopedCategories(page: GamePage, query: CatalogQuery): GameCategory[] {
  return scopeCategories(page.categories.items, query.server, query.tab);
}

export type CatalogResult = {
  items: GameProduct[];
  total: number;
  pageCount: number;
  page: number;
};

/**
 * Monta o href de um controle de filtro a partir do estado atual. Mexer num
 * filtro sempre volta para a página 1 — continuar na 4 depois de trocar de
 * servidor mostraria uma lista vazia.
 */
export function buildHref(
  slug: string,
  query: CatalogQuery,
  patch: Partial<CatalogQuery>,
) {
  const next = { ...query, ...patch };
  const params = new URLSearchParams();

  if (next.tab) params.set(PARAM.tab, next.tab);
  if (next.server) params.set(PARAM.server, next.server);
  for (const id of next.categories) params.append(PARAM.category, id);
  if (next.sort) params.set(PARAM.sort, next.sort);
  if (next.search) params.set(PARAM.search, next.search);

  const page = patch.page ?? 1;
  if (page > 1) params.set(PARAM.page, String(page));
  // Só quando o link PEDE o pacote — qualquer outro link volta à grade.
  if (patch.pkg) params.set(PARAM.pkg, patch.pkg);

  const qs = params.toString();
  return qs ? `/games/${slug}?${qs}` : `/games/${slug}`;
}

/**
 * O que vai no filtro ao clicar numa categoria (2026-10-08, pedido do usuário:
 * era seleção múltipla). UMA por vez na URL: a mais específica escolhida.
 *
 * - Categoria de topo: escolhe ela; se ela já é a ativa (escolhida ou mãe da
 *   subcategoria escolhida), limpa tudo.
 * - Subcategoria: escolhe ela (a mãe continua marcada na tela, por ser a
 *   ativa); clicar de novo na escolhida volta para só a mãe.
 *
 * A lista continua sendo `string[]` porque é o formato da URL e da API.
 */
export function categoryChoice(
  query: CatalogQuery,
  category: GameCategory,
  active: GameCategory | null,
): string[] {
  if (category.parentId) {
    return query.categories[0] === category.id ? [category.parentId] : [category.id];
  }
  return active?.id === category.id ? [] : [category.id];
}

/**
 * A categoria de TOPO ativa: a escolhida, ou a mãe da subcategoria escolhida.
 * É ela que decide quais subcategorias aparecem no quadro de baixo.
 */
export function activeCategory(items: GameCategory[], query: CatalogQuery): GameCategory | null {
  const selected = query.categories[0];
  if (!selected) return null;
  return (
    items.find((item) => item.id === selected || item.children.some((child) => child.id === selected)) ?? null
  );
}
