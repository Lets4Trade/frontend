import type { LayoutItem } from "./layoutContent";

/** A coluna LOJA do rodapé (`footer-coluna-1`, título padrão "LOJA"). */
export const STORE_COLUMN_KEY = "footer-coluna-1";

// O id continua `builtin:noticias` (chave estável); o rótulo virou "Blog" em 2026-10-16.
const NEWS_LINK: LayoutItem = { id: "builtin:noticias", label: "Blog", href: "/blog" };

/** O blog morava em `/noticias` até 2026-10-16 — link cadastrado com o endereço antigo conta. */
const BLOG_PATHS: ReadonlySet<string> = new Set(["/blog", "/noticias"]);

/**
 * Garante o link "Blog" na coluna LOJA (contrato blog.md, 2026-09-28).
 *
 * Os links do rodapé moram no BANCO (sessões de `layout`), e a semente é do
 * backend — um link só na semente não chegaria a quem já tem o banco
 * preenchido. Então a página nova entra por código, NO FIM da coluna, e só se
 * o admin ainda não a cadastrou (qualquer link para `/blog` ou o antigo
 * `/noticias`, que redireciona): cadastrado à
 * mão, vale o dele — rótulo e posição incluídos — e não sai duplicado.
 */
export function withNewsLink(key: string, links: LayoutItem[]): LayoutItem[] {
  if (key !== STORE_COLUMN_KEY) return links;
  const has = links.some((link) => BLOG_PATHS.has(link.href.replace(/[?#].*$/, "").replace(/\/$/, "")));
  return has ? links : [...links, NEWS_LINK];
}
