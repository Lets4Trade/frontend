import { describe, expect, it } from "vitest";
import {
  NO_COUPON,
  couponChoiceProblem,
  couponSavedValue,
  couponSelectOptions,
  couponSelectValue,
  toCouponChoices,
} from "./choices";
import type { AdminCoupon } from "./types";

const NOW = Date.parse("2026-11-03T12:00:00Z");

function coupon(over: Partial<AdminCoupon>): AdminCoupon {
  return {
    id: "c1",
    code: "VOLTA10",
    description: "",
    isActive: true,
    kind: "PERCENT",
    value: 1000,
    maxDiscountCents: null,
    minSubtotalCents: null,
    startsAt: null,
    endsAt: null,
    maxUses: null,
    maxUsesPerUser: null,
    usedCount: 0,
    gameIds: [],
    tabIds: [],
    productIds: [],
    allowCoins: true,
    rewardsOnDiscounted: true,
    targets: { games: [], tabs: [], products: [] },
    ...over,
  };
}

describe("toCouponChoices", () => {
  it("diz a situação de cada cupom e põe os que valem primeiro", () => {
    const choices = toCouponChoices(
      [
        coupon({ code: "AAA", isActive: false }),
        coupon({ code: "VOLTA10", endsAt: "2026-12-31T23:00:00Z" }),
        coupon({ code: "BBB", endsAt: "2026-10-01T00:00:00Z" }),
        coupon({ code: "CCC", maxUses: 5, usedCount: 5 }),
      ],
      NOW,
    );
    expect(choices.map((c) => [c.code, c.valid, c.status])).toEqual([
      ["VOLTA10", true, "Valendo"],
      ["AAA", false, "Desligado"],
      ["BBB", false, "Expirado"],
      ["CCC", false, "Esgotado"],
    ]);
    expect(choices[0].label).toMatch(/^VOLTA10 · 10% · Valendo até 31\/12\/26/);
  });
});

describe("couponSelectOptions", () => {
  const choices = toCouponChoices([coupon({})], NOW);

  it("tem 'Nenhum cupom' e os cupons", () => {
    expect(couponSelectOptions(choices, "VOLTA10").map((o) => o.value)).toEqual([NO_COUPON, "VOLTA10"]);
  });

  it("código salvo que não existe continua visível como 'não encontrado'", () => {
    const options = couponSelectOptions(choices, "Testestestestes");
    expect(options.at(-1)).toEqual({ value: "TESTESTESTESTES", label: "TESTESTESTESTES · não encontrado em Cupons" });
  });
});

describe("couponChoiceProblem", () => {
  const choices = toCouponChoices([coupon({}), coupon({ code: "OFF", isActive: false })], NOW);

  it("cupom valendo: sem aviso", () => {
    expect(couponChoiceProblem(choices, "volta10")).toBeNull();
  });

  it("vazio, inexistente ou que não vale: avisa que a loja não mostra", () => {
    expect(couponChoiceProblem(choices, "")).toMatch(/não aparece/);
    expect(couponChoiceProblem(choices, "TESTE")).toMatch(/não existe/);
    expect(couponChoiceProblem(choices, "OFF")).toMatch(/desligado/);
  });
});

describe("valor do select ↔ valor salvo", () => {
  it("vazio no banco = 'Nenhum cupom' no select, e volta vazio ao salvar", () => {
    expect(couponSelectValue("")).toBe(NO_COUPON);
    expect(couponSavedValue(NO_COUPON)).toBe("");
    expect(couponSelectValue(" volta10 ")).toBe("VOLTA10");
    expect(couponSavedValue("VOLTA10")).toBe("VOLTA10");
  });
});
