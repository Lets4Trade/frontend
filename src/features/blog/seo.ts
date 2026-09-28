import type { BlogArticleView } from "./types";

/** Origem pública do site — a mesma do `metadataBase` em `app/layout.tsx`. */
export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_ROOT_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

/**
 * JSON-LD `NewsArticle` da matéria (schema.org).
 *
 * Só dados que JÁ estão na página — título, resumo, capa, data e jogo — nada
 * que o buscador veria e o visitante não.
 */
export function newsArticleJsonLd(post: BlogArticleView) {
  const url = `${siteOrigin()}${post.href}`;
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title.slice(0, 110),
    description: post.excerpt,
    ...(post.cover ? { image: [post.cover] } : {}),
    ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    ...(post.game ? { about: { "@type": "VideoGame", name: post.game.name } } : {}),
    author: { "@type": "Organization", name: "Lets4Trade", url: siteOrigin() },
    publisher: { "@type": "Organization", name: "Lets4Trade", url: siteOrigin() },
  };
}

/**
 * `JSON.stringify` seguro para dentro de `<script>`.
 *
 * O título e o resumo são escritos no painel; um `</script>` neles fecharia a
 * tag e o resto viraria HTML executável. Trocar `<` (e `>`/`&`, por garantia)
 * pelo escape unicode mantém o JSON idêntico para o parser e inofensivo para o
 * HTML — é a recomendação do guia de JSON-LD do Next.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
