import { describe, expect, it } from "vitest";
import {
  applyPercent,
  buildPriceChanges,
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
  ])("%s → %i centavos", (raw, cents) => {
    expect(parsePriceInput(raw)).toBe(cents);
  });

  it.each(["", "abc", "4,105", "-4", "0", "0,00", "4,,1", "100000,01"])("%s é inválido", (raw) => {
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
    expect(applyPercent(9_000_000, 50)).toBeNull();
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

describe("buildPriceChanges", () => {
  const rows = [
    { id: "a", priceCents: 390 },
    { id: "b", priceCents: 3500 },
    { id: "c", priceCents: 2490 },
  ];

  it("só manda o que mudou, com o preço lido", () => {
    const { changes, invalid } = buildPriceChanges(rows, { a: "4,10", b: "35,00", c: "24,90" });
    expect(changes).toEqual([{ id: "a", priceCents: 410, expectedPriceCents: 390 }]);
    expect(invalid).toEqual([]);
  });

  it("aponta os inválidos", () => {
    expect(buildPriceChanges(rows, { a: "4,1x", b: "36" })).toEqual({
      changes: [{ id: "b", priceCents: 3600, expectedPriceCents: 3500 }],
      invalid: ["a"],
    });
  });
});

it("changeRatio", () => {
  expect(changeRatio(1000, 1500)).toBe(0.5);
  expect(changeRatio(0, 10)).toBe(0);
});
