import { describe, expect, it } from "vitest";
import {
  addonsTitle,
  isPriceCents,
  lineTotalCents,
  MAX_PRICE_CENTS,
  priceCentsToPoints,
  pricingSchema,
  quantityDiscountPercent,
  quote,
  type Pricing,
} from "./quote";

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

describe("quote — desconto por quantidade (2026-10-27)", () => {
  const GOLD: Pricing = {
    mode: "QUANTITY",
    unitLabel: "Gold",
    min: 1,
    max: 1000,
    step: 1,
    presets: [1, 100, 500],
    unitSize: 1_000_000,
    discounts: [
      { from: 100, percent: 3 },
      { from: 500, percent: 5 },
    ],
  };

  it("vale da quantidade para cima, a maior faixa alcançada", () => {
    expect(quantityDiscountPercent(GOLD, 99)).toBe(0);
    expect(quantityDiscountPercent(GOLD, 100)).toBe(3);
    expect(quantityDiscountPercent(GOLD, 499)).toBe(3);
    expect(quantityDiscountPercent(GOLD, 600)).toBe(5);
  });

  it("o total ganha a linha de desconto; sem faixa, nada muda", () => {
    const off = quote(5, GOLD, { quantity: 500 });
    expect(off.ok && off.totalCents).toBe(2375);
    expect(off.ok && off.lines[off.lines.length - 1]).toEqual({ label: "Desconto por quantidade (5%)", cents: -125 });

    const plain = quote(5, GOLD, { quantity: 10 });
    expect(plain.ok && plain.totalCents).toBe(50);
    expect(plain.ok && plain.lines).toHaveLength(1);
  });

  it("recusa percentual fora de 1 a 90, faixa repetida e faixa fora do mínimo/máximo", () => {
    const withDiscounts = (discounts: unknown) => pricingSchema.safeParse({ ...GOLD, discounts }).success;
    expect(withDiscounts([{ from: 100, percent: 91 }])).toBe(false);
    expect(withDiscounts([{ from: 100, percent: 0 }])).toBe(false);
    expect(withDiscounts([{ from: 100, percent: 3 }, { from: 100, percent: 5 }])).toBe(false);
    expect(withDiscounts([{ from: 2000, percent: 5 }])).toBe(false);
    expect(withDiscounts([{ from: 100, percent: 3 }])).toBe(true);
  });
});

describe("preço com fração de centavo e base 0 (2026-11-09)", () => {
  const QTY: Pricing = { mode: "QUANTITY", unitLabel: "Gold", min: 1, max: 100_000, step: 1 };

  it("isPriceCents: até 2 casas em centavos, sem negativo nem acima do teto", () => {
    expect(isPriceCents(0)).toBe(true);
    expect(isPriceCents(3.5)).toBe(true);
    expect(isPriceCents(3.51)).toBe(true);
    expect(isPriceCents(3.512)).toBe(false);
    expect(isPriceCents(-1)).toBe(false);
    expect(isPriceCents(MAX_PRICE_CENTS + 1)).toBe(false);
    expect(priceCentsToPoints(3.51)).toBe(351);
  });

  it("linha de catálogo desce ao centavo: R$ 0,035 × 3 = R$ 0,105 → R$ 0,10", () => {
    expect(lineTotalCents(3.5, 3)).toBe(10);
    expect(lineTotalCents(3.5, 1)).toBe(3);
    // Preço inteiro: igual a antes.
    expect(lineTotalCents(1290, 3)).toBe(3870);
    // R$ 10,9256 → R$ 10,92 (o exemplo do pedido).
    expect(lineTotalCents(1092.56, 1)).toBe(1092);
    expect(lineTotalCents(3.5, 0)).toBe(0);
  });

  it("quantidade com unitário de R$ 0,035: total para baixo, linha com a fração", () => {
    const result = quote(3.5, QTY, { quantity: 1001 });
    // 1001 × 0,035 = R$ 35,035 → R$ 35,03.
    expect(result).toMatchObject({ ok: true, totalCents: 3503 });
    if (result.ok) expect(result.lines[0].cents).toBeCloseTo(3503.5, 6);
  });

  it("total abaixo de R$ 0,01 é recusado", () => {
    expect(quote(0.5, QTY, { quantity: 1 })).toMatchObject({ ok: false });
  });

  it("base 0 em faixa de nível: o preço vem das faixas", () => {
    const levels: Pricing = {
      mode: "LEVEL_RANGE",
      unitLabel: "Nível",
      min: 1,
      max: 10,
      bands: [{ from: 1, to: 10, pricePerLevelCents: 100, hoursPerLevel: 1 }],
    };
    expect(quote(0, levels, { levelFrom: 1, levelTo: 4 })).toMatchObject({ ok: true, totalCents: 300 });
  });

  it("base 0 em preço fixo sem adicional: sem preço; com adicional em R$, cobra o adicional", () => {
    const fixed: Pricing = {
      mode: "FIXED",
      addons: [{ id: "prio", label: "Prioridade", kind: "FIXED", value: 500 }],
    };
    expect(quote(0, fixed, {})).toMatchObject({ ok: false });
    expect(quote(0, fixed, { addonIds: ["prio"] })).toMatchObject({ ok: true, totalCents: 500 });
  });

  it("preço base inválido (3 casas em centavos ou negativo) é recusado", () => {
    expect(quote(3.512, QTY, { quantity: 1 })).toMatchObject({ ok: false });
    expect(quote(-1, QTY, { quantity: 1 })).toMatchObject({ ok: false });
  });
});

describe("serviços: título, limite e subserviços (2026-11-09)", () => {
  const services: Pricing = {
    mode: "FIXED",
    addonsTitle: "Escolha suas campanhas:",
    maxAddons: 2,
    addons: [
      {
        id: "campanha",
        label: "Campanha",
        kind: "FIXED",
        value: 1000,
        maxChildren: 1,
        children: [
          { id: "ato-1", label: "Ato 1", kind: "FIXED", value: 200 },
          { id: "ato-2", label: "Ato 2", kind: "FIXED", value: 300 },
        ],
      },
      { id: "mapas", label: "Mapas", kind: "FIXED", value: 500 },
      { id: "chefes", label: "Chefes", kind: "FIXED", value: 700 },
    ],
  };

  it("título do painel e padrão por modo", () => {
    expect(addonsTitle(services)).toBe("Escolha suas campanhas:");
    expect(addonsTitle({ mode: "FIXED" })).toBe("Selecionar serviços:");
    expect(addonsTitle({ mode: "QUANTITY" })).toBe("Adicionais:");
  });

  it("grupo (2026-11-11): o subserviço vale sozinho, sem o valor do grupo, e a linha mostra o caminho", () => {
    const result = quote(0, services, { addonIds: ["ato-2"] });
    expect(result).toMatchObject({ ok: true, totalCents: 300 });
    if (result.ok) {
      expect(result.selection.addonIds).toEqual(["ato-2"]);
      expect(result.lines.map((line) => line.label)).toEqual(["Serviço", "Campanha › Ato 2"]);
    }
  });

  it("id do grupo na escolha (carrinho antigo) é ignorado: não cobra nem sai na escolha", () => {
    const result = quote(0, services, { addonIds: ["campanha", "ato-2"] });
    expect(result).toMatchObject({ ok: true, totalCents: 300 });
    if (result.ok) expect(result.selection.addonIds).toEqual(["ato-2"]);
    // Só o grupo: nada escolhido de fato.
    expect(quote(0, services, { addonIds: ["campanha"] })).toMatchObject({ ok: false });
  });

  it("recusa mais serviços que o limite; o grupo e os subserviços não contam nele", () => {
    const one = { ...services, maxAddons: 1 };
    expect(quote(0, one, { addonIds: ["mapas", "chefes"] })).toMatchObject({ ok: false });
    expect(quote(0, one, { addonIds: ["mapas", "ato-1"] })).toMatchObject({ ok: true, totalCents: 700 });
    expect(quote(0, services, { addonIds: ["mapas", "chefes"] })).toMatchObject({ ok: true, totalCents: 1200 });
  });

  it("recusa mais subserviços que o limite do grupo", () => {
    expect(quote(0, services, { addonIds: ["ato-1", "ato-2"] })).toMatchObject({ ok: false });
    expect(quote(0, services, { addonIds: ["ato-1"] })).toMatchObject({ ok: true, totalCents: 200 });
  });

  it("grupo obrigatório (2026-11-11): sem subserviço escolhido recusa; com um, passa", () => {
    const required: Pricing = {
      mode: "FIXED",
      addons: [
        {
          id: "rota",
          label: "Rota",
          kind: "FIXED",
          value: 0,
          required: true,
          children: [
            { id: "campanha-a", label: "Campanha", kind: "FIXED", value: 100 },
            { id: "mapas-a", label: "Mapas", kind: "FIXED", value: 200 },
          ],
        },
        { id: "extra", label: "Extra", kind: "FIXED", value: 50 },
      ],
    };
    expect(quote(1000, required, {})).toMatchObject({ ok: false, message: 'Escolha pelo menos uma opção em "Rota".' });
    expect(quote(1000, required, { addonIds: ["extra"] })).toMatchObject({ ok: false });
    expect(quote(1000, required, { addonIds: ["mapas-a"] })).toMatchObject({ ok: true, totalCents: 1200 });
  });

  it("id repetido entre serviço e subserviço é recusado no schema", () => {
    const bad = {
      mode: "FIXED",
      addons: [
        { id: "x", label: "X", kind: "FIXED", value: 1, children: [{ id: "x", label: "Y", kind: "FIXED", value: 1 }] },
      ],
    };
    expect(pricingSchema.safeParse(bad).success).toBe(false);
  });

  it("subserviço em R$ negativo é recusado; limite fora de 1..20 também", () => {
    const negative = {
      mode: "FIXED",
      addons: [{ id: "a", label: "A", kind: "FIXED", value: 1, children: [{ id: "b", label: "B", kind: "FIXED", value: -1 }] }],
    };
    expect(pricingSchema.safeParse(negative).success).toBe(false);
    expect(pricingSchema.safeParse({ mode: "FIXED", maxAddons: 0 }).success).toBe(false);
    expect(pricingSchema.safeParse({ mode: "FIXED", maxAddons: 21 }).success).toBe(false);
  });
});
