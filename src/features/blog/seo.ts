import { siteOrigin } from "@/lib/structuredData";
import type { BlogArticleView } from "./types";

// Moraram aqui até 2026-11-27; agora servem a página de jogo e a home também.
export { serializeJsonLd, siteOrigin } from "@/lib/structuredData";

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
    // Autor real quando a matéria tem um (2026-11-09); senão, a loja.
    author: post.author
      ? { "@type": "Person", name: post.author.name, ...(post.author.title ? { jobTitle: post.author.title } : {}) }
      : { "@type": "Organization", name: "Lets4Trade", url: siteOrigin() },
    publisher: { "@type": "Organization", name: "Lets4Trade", url: siteOrigin() },
  };
}
