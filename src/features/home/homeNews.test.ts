import { describe, expect, it } from "vitest";
import type { BlogCardView } from "@/features/blog/types";
import { isAutoNewsItem, newsToSectionItem, withHomeNews } from "./homeNews";

const post: BlogCardView = {
  slug: "patch-novo",
  title: "Patch novo",
  excerpt: "Resumo",
  cover: "https://api.exemplo/uploads/blog/capa.webp",
  publishedAt: "2026-11-17T10:00:00.000Z",
  date: "17/11/26",
  game: { slug: "diablo-4", name: "Diablo 4", logo: "https://api.exemplo/uploads/logo.png" },
  href: "/blog/patch-novo",
};

describe("homeNews", () => {
  it("post do blog vira card da sessão, com capa, logo do jogo e link", () => {
    expect(newsToSectionItem(post)).toEqual({
      id: "blog:patch-novo",
      title: "Patch novo",
      body: "Resumo",
      image: post.cover,
      secondaryImage: post.game!.logo,
      href: "/blog/patch-novo",
      createdAt: post.publishedAt,
    });
  });

  it("post sem capa nem jogo não inventa imagem", () => {
    const item = newsToSectionItem({ ...post, cover: null, game: null });
    expect(item.image).toBeUndefined();
    expect(item.secondaryImage).toBeUndefined();
  });

  it("troca só a sessão de guias; as outras seguem do banco", () => {
    const manual = [{ id: "g1", title: "Guia manual", body: "" }];
    const items = withHomeNews((key) => (key === "guias" || key === "faq" ? manual : []), [post]);
    expect(items("guias").map((item) => item.id)).toEqual(["blog:patch-novo"]);
    expect(items("faq")).toBe(manual);
  });

  it("sem notícias, a sessão fica vazia (não volta aos cards manuais)", () => {
    const items = withHomeNews(() => [{ id: "g1", title: "x", body: "" }], []);
    expect(items("guias")).toEqual([]);
  });

  it("reconhece o card automático pelo id", () => {
    expect(isAutoNewsItem({ id: "blog:x" })).toBe(true);
    expect(isAutoNewsItem({ id: "g1" })).toBe(false);
  });
});
