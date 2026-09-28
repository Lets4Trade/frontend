/**
 * Filtros de `/admin/noticias` na URL: `?q=&jogo=<gameId>&status=&pagina=`.
 * Puro (testável e sem `next/headers`), como `products/catalog.ts`.
 */

export const ADMIN_BLOG_STATUS = [
  { value: "publicadas", api: "published", label: "Publicadas" },
  { value: "rascunhos", api: "draft", label: "Rascunhos" },
] as const;

export type AdminBlogStatus = "" | (typeof ADMIN_BLOG_STATUS)[number]["value"];

export type AdminBlogQuery = {
  search: string;
  /** Id do jogo; "" = todos. */
  game: string;
  status: AdminBlogStatus;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : Array.isArray(value) ? (value[0] ?? "") : "";
}

/**
 * URL → filtros. O jogo só vale se for um dos que existem (`gameIds`): id
 * inventado vira "sem filtro" em vez de lista vazia misteriosa.
 */
export function parseAdminBlogQuery(params: RawParams, gameIds: readonly string[]): AdminBlogQuery {
  const game = first(params.jogo);
  const status = first(params.status);
  const rawPage = first(params.pagina);
  const page = /^\d{1,4}$/.test(rawPage) ? Number(rawPage) : 1;

  return {
    search: first(params.q).trim().slice(0, 80),
    game: gameIds.includes(game) ? game : "",
    status: ADMIN_BLOG_STATUS.some((option) => option.value === status) ? (status as AdminBlogStatus) : "",
    page: page >= 1 ? page : 1,
  };
}

export function adminBlogHref(query: AdminBlogQuery, overrides: Partial<AdminBlogQuery> = {}): string {
  const next = { ...query, ...overrides };
  const params = new URLSearchParams();
  if (next.search) params.set("q", next.search);
  if (next.game) params.set("jogo", next.game);
  if (next.status) params.set("status", next.status);
  if (next.page > 1) params.set("pagina", String(next.page));
  const qs = params.toString();
  return qs ? `/admin/noticias?${qs}` : "/admin/noticias";
}

/** Filtros da tela → query string de `GET /admin/blog`. */
export function adminBlogApiParams(query: AdminBlogQuery, limit: number): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.game) params.set("game", query.game);
  const status = ADMIN_BLOG_STATUS.find((option) => option.value === query.status)?.api;
  if (status) params.set("status", status);
  if (query.page > 1) params.set("page", String(query.page));
  params.set("limit", String(limit));
  return params.toString();
}
