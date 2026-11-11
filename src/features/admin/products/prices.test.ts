import { describe, expect, it } from "vitest";
import {
  MAX_PRICE_CENTS,
  applyPercent,
  buildRowChanges,
  categoriesInScope,
  categoryWithChildren,
  parseNameInput,
  changeRatio,
  formatPriceInput,
  parsePercent,
  parsePriceInput,
} from "./prices";

describe("parsePriceInput", () => {
  it.each([
    ["4,10", 410],
    ["4,1", 410],
    ["4", 400],
    ["R$ 4,10", 410],
    ["1.234,56", 123456],
    ["4.10", 410],
    ["1.234", 123400],
    ["99.999,99", 9999999],
    ["0,29", 29],
    [" 15.936,00 ", 1593600],
    // Até 4 casas em reais (2026-11-09).
    ["0,035", 3.5],
    ["4,105", 410.5],
    ["0.035", 3.5],
    ["0,0035", 0.35],
  ])("%s → %i centavos", (raw, cents) => {
    expect(parsePriceInput(raw)).toBe(cents);
  });

  it("0 é grátis (2026-11-11)", () => {
    expect(parsePriceInput("0")).toBe(0);
    expect(parsePriceInput("0,00")).toBe(0);
  });

  it.each(["", "abc", "4,10555", "-4", "4,,1", "20000000,01"])("%s é inválido", (raw) => {
    expect(parsePriceInput(raw)).toBeNull();
  });

  it("volta ao que formatPriceInput escreve", () => {
    for (const cents of [1, 29, 410, 123456, 1593600]) {
      expect(parsePriceInput(formatPriceInput(cents))).toBe(cents);
    }
  });
});

describe("applyPercent / parsePercent", () => {
  it("aplica sobre o preço atual e arredonda ao centavo", () => {
    expect(applyPercent(390, 5)).toBe(410); // 409,5 → 410
    expect(applyPercent(3500, 5)).toBe(3675);
    expect(applyPercent(1000, -2.5)).toBe(975);
  });

  it("recusa resultado fora da faixa", () => {
    expect(applyPercent(1, -99)).toBeNull();
    expect(applyPercent(1_900_000_000, 50)).toBeNull();
    // Acima dos antigos R$ 100 mil já é aceito (teto de 2026-10-15).
    expect(applyPercent(9_000_000, 50)).toBe(13_500_000);
  });

  it.each([
    ["5", 5],
    ["+5", 5],
    ["-2,5", -2.5],
    ["5%", 5],
  ])("%s → %d", (raw, value) => {
    expect(parsePercent(raw)).toBe(value);
  });

  it.each(["", "abc", "-100", "2000"])("%s é inválido", (raw) => {
    expect(parsePercent(raw)).toBeNull();
  });
});

describe("buildRowChanges", () => {
  const rows = [
    { id: "a", priceCents: 390, name: "1K Chaos", categoryId: "moedas" },
    { id: "b", priceCents: 3500, name: "Divine", categoryId: null },
    { id: "c", priceCents: 2490, name: "Exalted" },
  ];
  const none = { price: {}, name: {}, category: {} };

  it("só manda o que mudou, com o preço lido", () => {
    const { changes, invalid } = buildRowChanges(rows, { ...none, price: { a: "4,10", b: "35,00", c: "24,90" } });
    expect(changes).toEqual([{ id: "a", priceCents: 410, expectedPriceCents: 390 }]);
    expect(invalid).toEqual([]);
  });

  it("aponta os inválidos (preço e nome)", () => {
    expect(buildRowChanges(rows, { ...none, price: { a: "4,1x", b: "36" }, name: { c: " x " } })).toEqual({
      changes: [{ id: "b", priceCents: 3600, expectedPriceCents: 3500 }],
      invalid: ["a", "c"],
    });
  });

  it("nome: aparado, com o lido; igual ao gravado não conta", () => {
    const { changes } = buildRowChanges(rows, { ...none, name: { a: "  1K Chaos Orb ", b: "Divine " } });
    expect(changes).toEqual([{ id: "a", expectedPriceCents: 390, name: "1K Chaos Orb", expectedName: "1K Chaos" }]);
  });

  it('categoria: troca, tira ("") e ausente na API antiga conta como sem categoria', () => {
    const { changes } = buildRowChanges(rows, { ...none, category: { a: "", b: "moedas", c: "" } });
    expect(changes).toEqual([
      { id: "a", expectedPriceCents: 390, categoryId: null, expectedCategoryId: "moedas" },
      { id: "b", expectedPriceCents: 3500, categoryId: "moedas", expectedCategoryId: null },
    ]);
  });

  it("preço, nome e categoria da mesma linha vão juntos", () => {
    const { changes } = buildRowChanges(rows, { price: { b: "40" }, name: { b: "Divine Orb" }, category: { b: "moedas" } });
    expect(changes).toEqual([
      {
        id: "b",
        expectedPriceCents: 3500,
        priceCents: 4000,
        name: "Divine Orb",
        expectedName: "Divine",
        categoryId: "moedas",
        expectedCategoryId: null,
      },
    ]);
  });
});

it("parseNameInput", () => {
  expect(parseNameInput("  ab ")).toBe("ab");
  expect(parseNameInput(" a ")).toBeNull();
  expect(parseNameInput("x".repeat(161))).toBeNull();
});

describe("categorias da tabela", () => {
  const categories = [
    { id: "g", label: "Global" },
    { id: "g-sub", label: "Sub", parentId: "g" },
    { id: "hc", label: "HC", serverId: "srv-hc", tabId: "t1" },
    { id: "outra-aba", label: "Outra", tabId: "t2" },
  ];

  it("escopo: globais + as do servidor e da aba", () => {
    expect(categoriesInScope(categories, "t1", "srv-hc").map((c) => c.id)).toEqual(["g", "g-sub", "hc"]);
    expect(categoriesInScope(categories, "t1", "srv-sc").map((c) => c.id)).toEqual(["g", "g-sub"]);
    expect(categoriesInScope(categories, "t1", null).map((c) => c.id)).toEqual(["g", "g-sub"]);
    // Filtro com "Todos os servidores": todas as da aba.
    expect(categoriesInScope(categories, "t1", null, true).map((c) => c.id)).toEqual(["g", "g-sub", "hc"]);
  });

  it("filtrar a categoria pega as subcategorias", () => {
    expect([...categoryWithChildren(categories, "g")]).toEqual(["g", "g-sub"]);
    expect([...categoryWithChildren(categories, "g-sub")]).toEqual(["g-sub"]);
  });
});

it("changeRatio", () => {
  expect(changeRatio(1000, 1500)).toBe(0.5);
  expect(changeRatio(0, 10)).toBe(0);
});

describe("teto de preço (2026-10-15)", () => {
  it("é o técnico de R$ 20 mi, não mais R$ 100 mil", () => {
    expect(MAX_PRICE_CENTS).toBe(2_000_000_000);
  });
});
