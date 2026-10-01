import { describe, expect, it } from "vitest";
import { pricingSchema, quote, type Pricing } from "./quote";

const LEVELS: Pricing = {
  mode: "LEVEL_RANGE",
  unitLabel: "Nível",
  min: 1,
  max: 100,
  bands: [
    { from: 1, to: 60, pricePerLevelCents: 300, hoursPerLevel: 0.25 },
    { from: 60, to: 100, pricePerLevelCents: 1000, hoursPerLevel: 1 },
  ],
  addons: [
    { id: "prioridade", label: "Prioridade", kind: "PERCENT", value: 20 },
    { id: "stream", label: "Stream ao vivo", kind: "FIXED", value: 1500, extraHours: 0 },
  ],
};

describe("quote — faixa de nível", () => {
  it("soma cada nível pela faixa em que cai, mais o preço base", () => {
    const result = quote(1000, LEVELS, { levelFrom: 58, levelTo: 62 });
    // 58, 59 → 300 cada; 60, 61 → 1000 cada; + base 1000
    expect(result).toMatchObject({ ok: true, totalCents: 1000 + 600 + 2000, hours: 2.5 });
  });

  it("percentual incide só sobre o subtotal do serviço", () => {
    const result = quote(0, LEVELS, { levelFrom: 1, levelTo: 11, addonIds: ["stream", "prioridade"] });
    // 10 níveis × 300 = 3000; +20% = 600; +1500 fixo
    expect(result).toMatchObject({ ok: true, totalCents: 5100 });
    if (result.ok) expect(result.summary).toBe("Nível 1 → 11 · Prioridade, Stream ao vivo");
  });

  it("recusa início >= fim e fora da faixa, em vez de corrigir", () => {
    expect(quote(0, LEVELS, { levelFrom: 50, levelTo: 50 }).ok).toBe(false);
    expect(quote(0, LEVELS, { levelFrom: 0, levelTo: 10 }).ok).toBe(false);
    expect(quote(0, LEVELS, { levelFrom: 90, levelTo: 101 }).ok).toBe(false);
  });

  it("recusa adicional que não existe", () => {
    expect(quote(0, LEVELS, { levelFrom: 1, levelTo: 2, addonIds: ["hack"] }).ok).toBe(false);
  });
});

describe("quote — quantidade", () => {
  const HOURS: Pricing = {
    mode: "QUANTITY",
    unitLabel: "Horas",
    min: 1,
    max: 10,
    step: 1,
    hoursPerUnit: 1,
    tiers: [{ from: 5, unitPriceCents: 8000 }],
  };

  it("é sempre quantidade × preço — faixa salva é IGNORADA (sem desconto por quantidade, 2026-10-01)", () => {
    expect(quote(10000, HOURS, { quantity: 4 })).toMatchObject({ ok: true, totalCents: 40000, hours: 4 });
    expect(quote(10000, HOURS, { quantity: 5 })).toMatchObject({ ok: true, totalCents: 50000, hours: 5 });
    // O caso do usuário: 10 itens de R$ 10 = R$ 100, mesmo com uma faixa antiga.
    const withTier = { ...HOURS, max: 20, tiers: [{ from: 10, unitPriceCents: 910 }] };
    expect(quote(1000, withTier, { quantity: 10 })).toMatchObject({ ok: true, totalCents: 10000 });
  });

  it("respeita o passo", () => {
    expect(quote(100, { ...HOURS, min: 2, step: 2 }, { quantity: 3 }).ok).toBe(false);
  });
});

describe("quote — fixo", () => {
  it("é o preço do produto; zero é recusado", () => {
    expect(quote(2500, { mode: "FIXED" }, {})).toMatchObject({ ok: true, totalCents: 2500 });
    expect(quote(0, { mode: "FIXED" }, {}).ok).toBe(false);
  });
});

describe("pricingSchema", () => {
  it("aceita a regra de exemplo", () => {
    expect(pricingSchema.safeParse(LEVELS).success).toBe(true);
  });

  it("recusa buraco entre faixas (nível sem preço)", () => {
    const withGap = { ...LEVELS, bands: [LEVELS.bands[0], { ...LEVELS.bands[1], from: 61 }] };
    expect(pricingSchema.safeParse(withGap).success).toBe(false);
  });

  it("recusa ids de adicional repetidos e mínimo acima do máximo", () => {
    expect(
      pricingSchema.safeParse({ ...LEVELS, addons: [LEVELS.addons![0], LEVELS.addons![0]] }).success,
    ).toBe(false);
    expect(pricingSchema.safeParse({ ...LEVELS, min: 200 }).success).toBe(false);
  });
});
