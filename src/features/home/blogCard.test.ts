import { describe, expect, it } from "vitest";
import { blogCardTexts, gameBlogHref, safeBlogCardHref } from "./blogCard";

const none = (_name: string, fallback: string) => fallback;
const withExtras =
  (extras: Record<string, string>) =>
  (name: string, fallback: string) =>
    extras[name] || fallback;

describe("safeBlogCardHref", () => {
  it("aceita caminho interno, com ou sem query, e https", () => {
    expect(safeBlogCardHref("/noticias")).toBe("/noticias");
    expect(safeBlogCardHref("/noticias?jogo=diablo")).toBe("/noticias?jogo=diablo");
    expect(safeBlogCardHref(" https://blog.lets4trade.com.br/x ")).toBe("https://blog.lets4trade.com.br/x");
  });

  it("recusa protocolo perigoso, link de outro host sem https e query com lixo", () => {
    expect(safeBlogCardHref("javascript:alert(1)")).toBeNull();
    expect(safeBlogCardHref("http://exemplo.com")).toBeNull();
    expect(safeBlogCardHref("//exemplo.com")).toBeNull();
    expect(safeBlogCardHref('/noticias?jogo="><script>')).toBeNull();
    expect(safeBlogCardHref("")).toBeNull();
  });
});

describe("blogCardTexts", () => {
  it("sem nada no banco usa os textos do arquivo e o link padrão do lugar", () => {
    expect(blogCardTexts(none)).toEqual({
      title: "VISITAR BLOG",
      subtitle: "Veja mais artigos como esses",
      href: "/noticias",
    });
    expect(blogCardTexts(none, gameBlogHref("path-of-exile-2")).href).toBe("/noticias?jogo=path-of-exile-2");
  });

  it("usa os textos e o link editados", () => {
    const texts = blogCardTexts(
      withExtras({ "blog-titulo": "VER NOTÍCIAS", "blog-texto": "Tudo do jogo", "blog-link": "/noticias?jogo=diablo" }),
    );
    expect(texts).toEqual({ title: "VER NOTÍCIAS", subtitle: "Tudo do jogo", href: "/noticias?jogo=diablo" });
  });

  it("link inválido no banco cai no padrão em vez de virar href (fail secure)", () => {
    expect(blogCardTexts(withExtras({ "blog-link": "javascript:alert(1)" }), "/noticias?jogo=x").href).toBe(
      "/noticias?jogo=x",
    );
  });
});
