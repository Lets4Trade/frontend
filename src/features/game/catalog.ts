import { tabById } from "./tabs";
import type { GamePage, GameProduct } from "./types";

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
};

/** Nomes dos parâmetros. Ficam num só lugar porque links e leitura usam os dois. */
export const PARAM = {
  tab: "aba",
  server: "servidor",
  category: "categoria",
  sort: "ordem",
  search: "busca",
  page: "pagina",
} as const;

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
  const categoryIds = new Set(page.categories.items.map((item) => item.id));
  // Só as abas de PRODUTO filtram catálogo. As de link ("VENDA PRA NÓS",
  // "FIDELIDADE") estão em `page.tabs` mas levam para outra página — aceitar
  // `?aba=fidelidade` aqui pediria ao backend um tipo que não existe.
  const tabIds = new Set(
    page.tabs.filter((tab) => tabById(tab.id)).map((tab) => tab.id),
  );
  const sortKeys = new Set<string>(SORT_OPTIONS.map((option) => option.key));

  const rawTab = first(params[PARAM.tab]);
  const rawServer = first(params[PARAM.server]);
  const rawSort = first(params[PARAM.sort]);
  const rawPage = Number.parseInt(first(params[PARAM.page]) ?? "1", 10);

  return {
    tab: rawTab && tabIds.has(rawTab) ? rawTab : page.activeTabId,
    server:
      rawServer && serverSlugs.has(rawServer)
        ? rawServer
        : (page.servers.items[0]?.slug ?? ""),
    categories: all(params[PARAM.category]).filter((id) => categoryIds.has(id)),
    sort: rawSort && sortKeys.has(rawSort) ? (rawSort as SortKey) : null,
    // Corta o texto: a busca vira `ILIKE` no banco, e comprimento sem limite no
    // boundary é convite para consulta cara.
    search: (first(params[PARAM.search]) ?? "").trim().slice(0, 80),
    page: Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1,
  };
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

  const qs = params.toString();
  return qs ? `/games/${slug}?${qs}` : `/games/${slug}`;
}

/** Liga/desliga uma categoria mantendo o resto do filtro. */
export function toggleCategory(query: CatalogQuery, id: string) {
  return query.categories.includes(id)
    ? query.categories.filter((current) => current !== id)
    : [...query.categories, id];
}
