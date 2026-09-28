import { describe, expect, it } from "vitest";
import { newsArticleJsonLd, serializeJsonLd } from "./seo";
import type { BlogArticleView } from "./types";

const post: BlogArticleView = {
  slug: "x",
  title: "Título </script><script>alert(1)</script>",
  excerpt: "Resumo & mais",
  cover: "https://cdn.lets4trade.com.br/c.webp",
  publishedAt: "2026-09-28T12:00:00.000Z",
  date: "28/09/26",
  game: { slug: "d4", name: "Diablo IV", logo: null },
  href: "/noticias/x",
  body: "",
  related: [],
};

describe("JSON-LD da matéria", () => {
  it("NewsArticle com título, capa, data e jogo", () => {
    const ld = newsArticleJsonLd(post);
    expect(ld).toMatchObject({
      "@type": "NewsArticle",
      headline: post.title,
      image: [post.cover],
      datePublished: post.publishedAt,
      about: { name: "Diablo IV" },
    });
  });

  it("serialização não deixa fechar a tag <script>", () => {
    const html = serializeJsonLd(newsArticleJsonLd(post));
    expect(html).not.toContain("<");
    expect(html).not.toContain(">");
    // Continua sendo o MESMO JSON para quem o lê.
    expect(JSON.parse(html).headline).toBe(post.title);
  });
});
