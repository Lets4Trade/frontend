import { safeLinkHref } from "@/features/game/storefrontTabs";
import { BLOG_PARAM } from "@/features/blog/query";
import { BLOG_CARD_EXTRA } from "@/features/site/blogCardFields";
import { BLOG_CARD } from "./guides";

/**
 * Textos do card "VISITAR BLOG" — o último card de GUIAS POPULARES (home) e,
 * desde 2026-10-09, também o do bloco NOTÍCIAS da página de jogo.
 *
 * Moram nos textos EXTRAS da sessão que desenha o card (`home:guias` e
 * `games:noticias`), e não em colunas próprias: o mecanismo já existe, o
 * backend MESCLA e valida (nome, tamanho, teto de chaves) e texto vazio volta
 * ao padrão do código. Cada lugar tem os seus — o da home pode chamar para o
 * blog inteiro e o do jogo para as notícias daquele jogo.
 */
export { BLOG_CARD_EXTRA } from "@/features/site/blogCardFields";

export type BlogCardTexts = { title: string; subtitle: string; href: string };

/**
 * Link digitado no painel → `href` que a loja pode usar, ou `null`.
 *
 * Mesma allowlist de `safeLinkHref` (caminho interno ou https), mais a QUERY
 * num caminho interno — o caso natural aqui é `/noticias?jogo=diablo`, que o
 * `safeLinkHref` recusa. A query aceita só caracteres de parâmetro: nada de
 * `//`, espaço, aspas ou `javascript:`.
 */
export function safeBlogCardHref(value: string | null | undefined): string | null {
  const safe = safeLinkHref(value);
  if (safe) return safe;
  const href = value?.trim() ?? "";
  if (/^\/[a-z0-9/_-]*\?[a-z0-9=&%_.-]*$/i.test(href) && !href.startsWith("//")) return href;
  return null;
}

/** As notícias de UM jogo na página do blog (`/noticias?jogo=<slug>`). */
export function gameBlogHref(gameSlug: string): string {
  return `/noticias?${new URLSearchParams({ [BLOG_PARAM.game]: gameSlug }).toString()}`;
}

/**
 * Resolve os textos do card. Link vazio ou fora da allowlist cai no padrão do
 * lugar — fail secure: um valor estranho no banco nunca vira `href`.
 */
export function blogCardTexts(
  extra: (name: string, fallback: string) => string,
  defaultHref: string = BLOG_CARD.href,
): BlogCardTexts {
  return {
    title: extra(BLOG_CARD_EXTRA.title, BLOG_CARD.title),
    subtitle: extra(BLOG_CARD_EXTRA.subtitle, BLOG_CARD.subtitle),
    href: safeBlogCardHref(extra(BLOG_CARD_EXTRA.href, "")) ?? defaultHref,
  };
}
