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

describe("adicional percentual NEGATIVO (desconto, 2026-10-09)", () => {
  const WITH_DISCOUNT: Pricing = {
    ...LEVELS,
    addons: [
      ...(LEVELS.addons ?? []),
      { id: "metade", label: "Promoção", kind: "PERCENT", value: -50 },
      { id: "gratis", label: "Cortesia", kind: "PERCENT", value: -100 },
    ],
  };

  it("schema aceita % até −100 e recusa abaixo disso e R$ negativo", () => {
    expect(pricingSchema.safeParse(WITH_DISCOUNT).success).toBe(true);
    const below = { ...LEVELS, addons: [{ id: "x", label: "X", kind: "PERCENT", value: -101 }] };
    expect(pricingSchema.safeParse(below).success).toBe(false);
    const fixedNegative = { ...LEVELS, addons: [{ id: "x", label: "X", kind: "FIXED", value: -100 }] };
    expect(pricingSchema.safeParse(fixedNegative).success).toBe(false);
  });

  it("desconta sobre o subtotal do serviço e a linha sai negativa", () => {
    const result = quote(0, WITH_DISCOUNT, { levelFrom: 1, levelTo: 11, addonIds: ["metade"] });
    // 10 níveis × 300 = 3000; −50% = −1500
    expect(result).toMatchObject({ ok: true, totalCents: 1500 });
    if (result.ok) expect(result.lines[result.lines.length - 1]).toEqual({ label: "Promoção", cents: -1500 });
  });

  it("−100% zera o serviço mas mantém os outros adicionais", () => {
    const result = quote(0, WITH_DISCOUNT, { levelFrom: 1, levelTo: 11, addonIds: ["gratis", "stream"] });
    expect(result).toMatchObject({ ok: true, totalCents: 1500 });
  });

  it("total zerado pelo desconto é recusado com motivo (não dá para cobrar R$ 0)", () => {
    const result = quote(0, WITH_DISCOUNT, { levelFrom: 1, levelTo: 11, addonIds: ["gratis"] });
    expect(result).toMatchObject({ ok: false, message: "Com esses adicionais o valor fica zerado. Escolha outra combinação." });
  });
});

describe("quote — sem teto de nível, horas e quantidade (2026-10-20)", () => {
  it("intervalo de bilhões de níveis é contado por faixa, sem travar", () => {
    const huge: Pricing = {
      mode: "LEVEL_RANGE",
      unitLabel: "Paragon",
      min: 0,
      max: 5_000_000_000,
      bands: [{ from: 0, to: 5_000_000_000, pricePerLevelCents: 0, hoursPerLevel: 0.000001 }],
    };
    expect(pricingSchema.safeParse(huge).success).toBe(true);
    const started = Date.now();
    // Preço zero por nível: só o base — o que importa é não andar nível a nível.
    const result = quote(100, huge, { levelFrom: 0, levelTo: 4_000_000_000 });
    expect(Date.now() - started).toBeLessThan(50);
    expect(result).toMatchObject({ ok: true, totalCents: 100, hours: 4000 });
  });

  it("faixas sobrepostas: vale a PRIMEIRA da lista, como na conta nível a nível", () => {
    const overlap: Pricing = {
      mode: "LEVEL_RANGE",
      unitLabel: "Nível",
      min: 0,
      max: 100,
      bands: [
        { from: 50, to: 60, pricePerLevelCents: 1000, hoursPerLevel: 0 },
        { from: 0, to: 100, pricePerLevelCents: 10, hoursPerLevel: 0 },
      ],
    };
    // 40..49 → 10 cada (100); 50..59 → 1000 cada (10.000); 60..69 → 10 cada (100)
    expect(quote(0, overlap, { levelFrom: 40, levelTo: 70 })).toMatchObject({ ok: true, totalCents: 10_200 });
  });

  it("buraco entre faixas: aponta o primeiro nível sem preço", () => {
    const withGap = { ...LEVELS, bands: [LEVELS.bands[0], { ...LEVELS.bands[1], from: 61 }] };
    expect(pricingSchema.safeParse(withGap).success).toBe(false);
    expect(quote(0, withGap, { levelFrom: 58, levelTo: 62 })).toMatchObject({
      ok: false,
      message: "O nível 60 não tem preço configurado.",
    });
  });

  it("horas e quantidade sem o teto antigo (10.000 h e 1.000.000)", () => {
    const gold: Pricing = { mode: "QUANTITY", unitLabel: "Gold", min: 1, max: 50_000_000_000, step: 1, hoursPerUnit: 0, baseHours: 20_000 };
    expect(pricingSchema.safeParse(gold).success).toBe(true);
    expect(quote(1, gold, { quantity: 30_000_000 })).toMatchObject({ ok: true, totalCents: 30_000_000, hours: 20_000 });
  });
});

describe("quote — tamanho da unidade (2026-10-23)", () => {
  const GOLD: Pricing = { mode: "QUANTITY", unitLabel: "Gold", min: 1, max: 1000, step: 1, presets: [1, 10], unitSize: 1_000_000 };

  it("10 unidades de 1Mi = 10.000.000 Gold, pelo preço de 10 unidades", () => {
    const result = quote(150, GOLD, { quantity: 10 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.totalCents).toBe(1500);
    expect(result.summary).toBe("10.000.000 Gold");
    expect(result.lines[0].label).toBe("10 × 1.000.000 Gold");
    expect(result.selection).toEqual({ quantity: 10 });
  });

  it("sem tamanho (ou 1) continua como antes", () => {
    const { unitSize: _unused, ...plain } = GOLD as Extract<Pricing, { mode: "QUANTITY" }>;
    const result = quote(150, plain, { quantity: 10 });
    expect(result.ok && result.summary).toBe("10 Gold");
  });

  it("total que não cabe no inteiro exato é recusado", () => {
    const huge: Pricing = { ...GOLD, max: 9_000_000_000, unitSize: 9_000_000_000 } as Pricing;
    expect(quote(1, huge, { quantity: 9_000_000_000 }).ok).toBe(false);
  });

  it("schema aceita o tamanho e recusa zero", () => {
    expect(pricingSchema.safeParse(GOLD).success).toBe(true);
    expect(pricingSchema.safeParse({ ...GOLD, unitSize: 0 }).success).toBe(false);
  });
});
