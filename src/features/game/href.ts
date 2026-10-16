/**
 * Endereço da página do JOGO na loja (2026-10-16, pedido do usuário): direto
 * na raiz — `/path-of-exile-2`, e não mais `/games/path-of-exile-2`.
 *
 * UMA função para todo link de jogo do site: eram ~45 lugares montando
 * `` `/games/${slug}` `` à mão. O endereço antigo continua funcionando por 308
 * (`next.config.ts`), então link salvo no banco, no Google ou compartilhado
 * não quebra.
 *
 * Nada aqui serve para chamada à API (`/games/:slug` do backend continua igual).
 */

/**
 * Links que um jogo NÃO pode ter — as páginas do site, que dividem a raiz com
 * ele. ESPELHO de `backend/src/app/games/reserved-slugs.ts` (quem decide é o
 * backend; aqui é o aviso imediato no painel). Um teste confere que toda pasta
 * de rota de `src/app` está aqui.
 */
export const RESERVED_GAME_SLUGS: ReadonlySet<string> = new Set([
  "admin",
  "api",
  "blog",
  "checkout",
  "conta",
  "criar-conta",
  "fidelidade",
  "games",
  "login",
  "pagamento",
  "politica-de-privacidade",
  "previa",
  "termos",
  "venda",
  "noticias",
  "lp",
  "crie-seu-evento-na-lets4trade",
  "esqueci-minha-senha",
  "carrinho",
  "busca",
  "pesquisa",
  "jogos",
  "loja",
  "produtos",
  "pedidos",
  "perfil",
  "cadastro",
  "entrar",
  "sair",
  "logout",
  "auth",
  "sobre",
  "contato",
  "ajuda",
  "suporte",
  "faq",
  "uploads",
  "images",
  "icons",
  "fonts",
  "static",
  "public",
  "next",
  "sitemap",
  "robots",
  "manifest",
  "favicon",
  "health",
]);

export const RESERVED_SLUG_MESSAGE =
  "Esse link é de uma página do site (ex.: /blog, /login). Escolha outro para o jogo.";

/** Formato de slug de jogo que a rota da raiz aceita (o resto vira 404 sem ir à API). */
export const GAME_SLUG = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;

export function isReservedGameSlug(slug: string): boolean {
  return RESERVED_GAME_SLUGS.has(slug);
}

/** `/path-of-exile-2`, ou com a query (`?aba=boosting`). */
export function gameHref(slug: string, query?: string | URLSearchParams | null): string {
  const qs = typeof query === "string" ? query.replace(/^\?/, "") : (query?.toString() ?? "");
  return qs ? `/${slug}?${qs}` : `/${slug}`;
}

/**
 * Slug de um link de jogo — o NOVO (`/diablo`) ou o ANTIGO (`/games/diablo`,
 * gravado em banco antes de 2026-10-16). `null` para o que não é link de jogo.
 */
export function gameSlugFromHref(href: string): string | null {
  const path = href.replace(/[?#].*$/, "");
  const match = /^\/(?:games\/)?([a-z0-9-]+)\/?$/.exec(path);
  if (!match) return null;
  const slug = match[1];
  return isReservedGameSlug(slug) ? null : slug;
}
