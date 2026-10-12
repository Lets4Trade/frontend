import { describe, expect, it } from "vitest";
import { formatAmount, parseAmount, toAdminGift } from "./types";

describe("toAdminGift", () => {
  it("lê a regra; campo apagado pelo backend = desligado / sem teto", () => {
    expect(toAdminGift({ isActive: true, everyCents: 5000, amount: 50_000_000, label: "de Ouro", maxAmount: 500_000_000 })).toEqual({
      isActive: true,
      everyCents: 5000,
      amount: 50_000_000,
      label: "de Ouro",
      maxAmount: 500_000_000,
    });
    expect(toAdminGift({ everyCents: 5000, amount: 1, label: "x" })).toMatchObject({ isActive: false, maxAmount: null });
    expect(toAdminGift(null)).toBeNull();
    expect(toAdminGift({ everyCents: "5000", amount: 1 })).toBeNull();
  });
});

describe("parseAmount / formatAmount", () => {
  it("aceita pontos, recusa vazio e número grande demais", () => {
    expect(parseAmount("50.000.000")).toBe(50_000_000);
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("9".repeat(17))).toBeNull();
    expect(formatAmount(50_000_000)).toBe("50.000.000");
    expect(formatAmount(null)).toBe("");
  });
});
