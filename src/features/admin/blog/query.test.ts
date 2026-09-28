import { describe, expect, it } from "vitest";
import { adminBlogApiParams, adminBlogHref, parseAdminBlogQuery } from "./query";
import { isoToLocalInput, localInputToIso } from "./schema";

describe("parseAdminBlogQuery", () => {
  const ids = ["g1", "g2"];

  it("lê busca, jogo existente, status e página", () => {
    expect(parseAdminBlogQuery({ q: " liga ", jogo: "g2", status: "rascunhos", pagina: "2" }, ids)).toEqual({
      search: "liga",
      game: "g2",
      status: "rascunhos",
      page: 2,
    });
  });

  it("jogo inexistente e status desconhecido viram 'sem filtro'", () => {
    expect(parseAdminBlogQuery({ jogo: "gX", status: "lixo", pagina: "x" }, ids)).toEqual({
      search: "",
      game: "",
      status: "",
      page: 1,
    });
  });

  it("URL da tela e query da API", () => {
    const query = { search: "a", game: "g1", status: "publicadas" as const, page: 3 };
    expect(adminBlogHref(query, { page: 1 })).toBe("/admin/noticias?q=a&jogo=g1&status=publicadas");
    expect(adminBlogApiParams(query, 20)).toBe("search=a&game=g1&status=published&page=3&limit=20");
  });
});

describe("data de publicação (Brasília)", () => {
  it("ISO → datetime-local em UTC−3 e volta", () => {
    expect(isoToLocalInput("2026-09-28T13:00:00.000Z")).toBe("2026-09-28T10:00");
    expect(localInputToIso("2026-09-28T10:00")).toBe("2026-09-28T13:00:00.000Z");
  });

  it("entrada inválida → vazio", () => {
    expect(isoToLocalInput("nada")).toBe("");
    expect(localInputToIso("28/09/2026")).toBe("");
  });
});
