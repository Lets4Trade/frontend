/**
 * Filtros da lista `/noticias` — moram na URL (`?jogo=&busca=&pagina=`).
 *
 * Filtrar é NAVEGAR: a lista é montada no servidor, funciona sem JavaScript e o
 * endereço é compartilhável/indexável. Módulo puro (sem `next/headers`) para
 * poder ser testado e importado de qualquer lado da fronteira.
 */

export const BLOG_PARAM = { game: "jogo", search: "busca", page: "pagina" } as const;

/** Espelha o teto da busca no backend (`search` ≤ 80). */
export const BLOG_SEARCH_MAX = 80;

/** Itens por página da lista. O backend aceita até 24; 10 é o padrão dele. */
export const BLOG_PAGE_SIZE = 10;

/**
 * Teto da página pedida. Sem ele `?pagina=999999999` viraria um OFFSET enorme
 * no banco — custo que qualquer um provoca editando a URL.
 */
const MAX_PAGE = 500;

/** Mesmo formato de slug do contrato (`^[a-z0-9-]{1,120}$`). */
export const BLOG_SLUG_RE = /^[a-z0-9-]{1,120}$/;

export type BlogQuery = {
  /** Slug do jogo; "" = todos. */
  game: string;
  search: string;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : Array.isArray(value) ? (value[0] ?? "") : "";
}

/**
 * URL → filtros VALIDADOS. Valor fora do formato vira "sem filtro" em vez de
 * erro: um link velho ou editado à mão ainda abre a lista.
 */
export function parseBlogQuery(params: RawParams): BlogQuery {
  const game = first(params[BLOG_PARAM.game]).trim().toLowerCase();
  const search = first(params[BLOG_PARAM.search]).trim().slice(0, BLOG_SEARCH_MAX);
  const rawPage = first(params[BLOG_PARAM.page]).trim();
  const page = /^\d{1,4}$/.test(rawPage) ? Number(rawPage) : 1;

  return {
    game: BLOG_SLUG_RE.test(game) ? game : "",
    search,
    page: page >= 1 && page <= MAX_PAGE ? page : 1,
  };
}

/**
 * Endereço da lista com os filtros atuais trocados por `overrides`.
 *
 * Página 1 e filtro vazio NÃO entram na URL: um endereço por estado, sem
 * `?pagina=1` duplicando a raiz para buscador e cache.
 */
export function blogListHref(query: BlogQuery, overrides: Partial<BlogQuery> = {}): string {
  const next = { ...query, ...overrides };
  const params = new URLSearchParams();
  if (next.game) params.set(BLOG_PARAM.game, next.game);
  if (next.search) params.set(BLOG_PARAM.search, next.search);
  if (next.page > 1) params.set(BLOG_PARAM.page, String(next.page));
  const qs = params.toString();
  return qs ? `/noticias?${qs}` : "/noticias";
}

/** Caminho da matéria. */
export function blogPostHref(slug: string): string {
  return `/noticias/${encodeURIComponent(slug)}`;
}
