import { describe, expect, it } from "vitest";
import { SORT_OPTIONS, buildHref, parseProductsQuery } from "./catalog";

describe("query de Produtos (2026-10-01)", () => {
  it("servidor só vale com jogo escolhido", () => {
    expect(parseProductsQuery({ jogo: "g1", servidor: "s1" }, ["g1"]).server).toBe("s1");
    expect(parseProductsQuery({ servidor: "s1" }, ["g1"]).server).toBe("");
    expect(parseProductsQuery({ jogo: "g1", servidor: "../x" }, ["g1"]).server).toBe("");
  });

  it("categoria (2026-11-02): só com jogo, vai na URL e zera ao trocar de jogo", () => {
    expect(parseProductsQuery({ jogo: "g1", categoria: "c1" }, ["g1"]).category).toBe("c1");
    expect(parseProductsQuery({ categoria: "c1" }, ["g1"]).category).toBe("");
    expect(parseProductsQuery({ jogo: "g1", categoria: "../x" }, ["g1"]).category).toBe("");

    const query = parseProductsQuery({ jogo: "g1", aba: "t1", categoria: "c1" }, ["g1", "g2"]);
    expect(buildHref(query, { sort: "az" })).toBe("/admin/produtos?jogo=g1&aba=t1&categoria=c1&ordem=az");
    expect(buildHref(query, { game: "g2" })).toBe("/admin/produtos?jogo=g2");
  });

  it("trocar de jogo zera aba e servidor", () => {
    const query = parseProductsQuery({ jogo: "g1", aba: "t1", servidor: "s1" }, ["g1", "g2"]);
    expect(buildHref(query, { game: "g2" })).toBe("/admin/produtos?jogo=g2");
    expect(buildHref(query, { server: "s2" })).toBe("/admin/produtos?jogo=g1&aba=t1&servidor=s2");
  });

  it("uma ordenação só, com as seis opções de antes", () => {
    expect(SORT_OPTIONS.map((option) => option.value)).toEqual(["recente", "antigo", "az", "za", "menor", "maior"]);
    expect(parseProductsQuery({ ordem: "menor" }, []).sort).toBe("menor");
    expect(parseProductsQuery({ ordem: "outra" }, []).sort).toBe("recente");
  });
});
