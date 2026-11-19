import { describe, expect, it } from "vitest";
import {
  ALL,
  applyVisibleOrder,
  categoryOrder,
  cutFilters,
  EMPTY_FILTERS,
  orderScope,
  sameOrder,
  matchesFilters,
  moveSelection,
  moveSelectionTo,
  NONE,
  rangeBetween,
} from "./orderBoard";

const categories = [
  { id: "orbs", label: "Orbs", parentId: null },
  { id: "divine", label: "Divine", parentId: "orbs" },
  { id: "chaos", label: "Chaos", parentId: "orbs" },
  { id: "itens", label: "Itens", parentId: null },
];

const p = (id: string, extra: Record<string, unknown> = {}) => ({ id, name: id, ...extra });

describe("matchesFilters", () => {
  it("busca sem acento e sem caixa", () => {
    expect(matchesFilters(p("Poção Grande"), { ...EMPTY_FILTERS, search: "pocao" }, categories)).toBe(true);
    expect(matchesFilters(p("Elmo"), { ...EMPTY_FILTERS, search: "pocao" }, categories)).toBe(false);
  });

  it("servidor: id ou sem servidor", () => {
    expect(matchesFilters(p("a", { serverId: "s1" }), { ...EMPTY_FILTERS, server: "s1" }, categories)).toBe(true);
    expect(matchesFilters(p("a", { serverId: "s2" }), { ...EMPTY_FILTERS, server: "s1" }, categories)).toBe(false);
    expect(matchesFilters(p("a", { serverId: null }), { ...EMPTY_FILTERS, server: NONE }, categories)).toBe(true);
    expect(matchesFilters(p("a", { serverId: "s1" }), { ...EMPTY_FILTERS, server: NONE }, categories)).toBe(false);
  });

  it("categoria inclui as subcategorias; sub escolhida filtra só ela; extras contam", () => {
    const divine = p("a", { categoryId: "divine" });
    expect(matchesFilters(divine, { ...EMPTY_FILTERS, category: "orbs" }, categories)).toBe(true);
    expect(matchesFilters(divine, { ...EMPTY_FILTERS, category: "orbs", subcategory: "chaos" }, categories)).toBe(false);
    expect(matchesFilters(divine, { ...EMPTY_FILTERS, category: "itens" }, categories)).toBe(false);
    const extra = p("b", { categoryId: "itens", extraCategoryIds: ["chaos"] });
    expect(matchesFilters(extra, { ...EMPTY_FILTERS, category: "orbs", subcategory: "chaos" }, categories)).toBe(true);
  });

  it("sem categoria", () => {
    expect(matchesFilters(p("a"), { ...EMPTY_FILTERS, category: NONE }, categories)).toBe(true);
    expect(matchesFilters(p("a", { categoryId: "orbs" }), { ...EMPTY_FILTERS, category: NONE }, categories)).toBe(false);
    expect(matchesFilters(p("a"), { ...EMPTY_FILTERS, category: ALL }, categories)).toBe(true);
  });
});

describe("applyVisibleOrder", () => {
  it("visíveis trocam entre as posições que já ocupavam; escondidos não se mexem", () => {
    // a b C d E f G  (maiúsculas = visíveis no filtro)
    const full = ["a", "b", "C", "d", "E", "f", "G"];
    expect(applyVisibleOrder(full, ["C", "E", "G"], ["G", "C", "E"])).toEqual(["a", "b", "G", "d", "C", "f", "E"]);
  });

  it("lista que não é permutação dos visíveis não muda nada", () => {
    const full = ["a", "b", "c"];
    expect(applyVisibleOrder(full, ["a", "b"], ["a", "x"])).toEqual(full);
    expect(applyVisibleOrder(full, ["a", "b"], ["a", "a"])).toEqual(full);
    expect(applyVisibleOrder(full, ["a", "b"], ["a"])).toEqual(full);
  });
});

describe("moveSelection (arrastar vários)", () => {
  const list = ["a", "b", "c", "d", "e", "f"];

  it("para baixo: o bloco entra depois do alvo, na ordem relativa", () => {
    expect(moveSelection(list, new Set(["a", "c"]), "a", "e")).toEqual(["b", "d", "e", "a", "c", "f"]);
  });

  it("para cima: o bloco entra antes do alvo", () => {
    expect(moveSelection(list, new Set(["e", "c"]), "e", "b")).toEqual(["a", "c", "e", "b", "d", "f"]);
  });

  it("soltar em cima de um selecionado não muda", () => {
    expect(moveSelection(list, new Set(["a", "c"]), "a", "c")).toEqual(list);
  });

  it("um só selecionado = arrasto normal", () => {
    expect(moveSelection(list, new Set(["b"]), "b", "d")).toEqual(["a", "c", "d", "b", "e", "f"]);
  });
});

describe("moveSelectionTo / rangeBetween", () => {
  const list = ["a", "b", "c", "d"];
  it("topo e fim mantêm a ordem relativa do bloco", () => {
    expect(moveSelectionTo(list, new Set(["d", "b"]), "top")).toEqual(["b", "d", "a", "c"]);
    expect(moveSelectionTo(list, new Set(["a", "c"]), "bottom")).toEqual(["b", "d", "a", "c"]);
  });
  it("Shift+clique pega o intervalo nos dois sentidos", () => {
    expect(rangeBetween(list, "b", "d")).toEqual(["b", "c", "d"]);
    expect(rangeBetween(list, "d", "b")).toEqual(["b", "c", "d"]);
  });
});

describe("ordem própria da categoria (2026-11-18)", () => {
  const categories = [
    { id: "armas", label: "Armas" },
    { id: "chaves", label: "Chaves", parentId: "armas" },
    { id: "moedas", label: "Moedas" },
  ];
  const products = new Map(
    [
      { id: "a", name: "A", categoryId: "armas" },
      { id: "b", name: "B", categoryId: "chaves" },
      { id: "c", name: "C", categoryId: "moedas", extraCategoryIds: ["chaves"] },
      { id: "d", name: "D", categoryId: "chaves" },
    ].map((product) => [product.id, product]),
  );
  const tab = ["a", "b", "c", "d"];

  it("escolhe a lista pelo filtro: subcategoria > categoria > aba", () => {
    expect(orderScope({ category: ALL, subcategory: ALL })).toBeNull();
    expect(orderScope({ category: NONE, subcategory: ALL })).toBeNull();
    expect(orderScope({ category: "armas", subcategory: ALL })).toBe("armas");
    expect(orderScope({ category: "armas", subcategory: "chaves" })).toBe("chaves");
    expect(cutFilters({ search: "x", server: "s1", category: "armas", subcategory: "chaves" })).toEqual({
      search: "x",
      server: "s1",
      category: ALL,
      subcategory: ALL,
    });
  });

  it("sem ordem gravada, a categoria segue a ordem da aba (extras contam)", () => {
    expect(categoryOrder(tab, "chaves", undefined, products, categories)).toEqual(["b", "c", "d"]);
    // Categoria de 1º nível inclui as filhas.
    expect(categoryOrder(tab, "armas", undefined, products, categories)).toEqual(["a", "b", "c", "d"]);
  });

  it("gravados primeiro; quem saiu da categoria some; novos vão para o fim", () => {
    expect(categoryOrder(tab, "chaves", ["d", "a", "b"], products, categories)).toEqual(["d", "b", "c"]);
  });

  it("mexer na categoria não muda a ordem da aba", () => {
    const list = categoryOrder(tab, "chaves", undefined, products, categories);
    const moved = applyVisibleOrder(list, list, ["d", "b", "c"]);
    expect(moved).toEqual(["d", "b", "c"]);
    expect(tab).toEqual(["a", "b", "c", "d"]);
    expect(sameOrder(moved, list)).toBe(false);
    expect(sameOrder(list, ["b", "c", "d"])).toBe(true);
  });
});
