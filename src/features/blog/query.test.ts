import { describe, expect, it } from "vitest";
import { blogListHref, blogPostHref, parseBlogQuery } from "./query";

describe("parseBlogQuery", () => {
  it("sem parâmetros → sem filtro, página 1", () => {
    expect(parseBlogQuery({})).toEqual({ game: "", search: "", page: 1 });
  });

  it("lê jogo, busca e página", () => {
    expect(parseBlogQuery({ jogo: "path-of-exile-2", busca: "  liga nova ", pagina: "3" })).toEqual({
      game: "path-of-exile-2",
      search: "liga nova",
      page: 3,
    });
  });

  it("jogo fora do formato de slug vira 'sem filtro'", () => {
    expect(parseBlogQuery({ jogo: "../admin" }).game).toBe("");
    expect(parseBlogQuery({ jogo: "a b" }).game).toBe("");
    expect(parseBlogQuery({ jogo: "POE" }).game).toBe("poe");
  });

  it("busca é cortada em 80 caracteres", () => {
    expect(parseBlogQuery({ busca: "x".repeat(200) }).search).toHaveLength(80);
  });

  it.each(["0", "-1", "abc", "1.5", "99999", "501"])("página inválida (%s) → 1", (pagina) => {
    expect(parseBlogQuery({ pagina }).page).toBe(1);
  });

  it("parâmetro repetido usa o primeiro", () => {
    expect(parseBlogQuery({ jogo: ["diablo-4", "poe"] }).game).toBe("diablo-4");
  });
});

describe("blogListHref", () => {
  const base = { game: "diablo-4", search: "", page: 2 };

  it("omite página 1 e filtros vazios", () => {
    expect(blogListHref({ game: "", search: "", page: 1 })).toBe("/noticias");
  });

  it("preserva os filtros e troca só o pedido", () => {
    expect(blogListHref(base, { page: 3 })).toBe("/noticias?jogo=diablo-4&pagina=3");
    expect(blogListHref(base, { game: "", page: 1 })).toBe("/noticias");
    expect(blogListHref({ ...base, search: "a&b" }, { page: 1 })).toBe("/noticias?jogo=diablo-4&busca=a%26b");
  });

  it("caminho da matéria", () => {
    expect(blogPostHref("minha-materia")).toBe("/noticias/minha-materia");
  });
});
