import { describe, expect, it } from "vitest";
import { quote, type Pricing } from "@/features/pricing/quote";
import { addonIds, draftToPricing, emptyDraft, parsePresets, pricingToDraft } from "./pricingDraft";
import { parseHighlights } from "./schema";

describe("draftToPricing", () => {
  it("FIXED sem nada extra", () => {
    expect(draftToPricing(emptyDraft("FIXED"))).toEqual({ ok: true, pricing: { mode: "FIXED" } });
  });

  it("QUANTITY com horas e adicionais (ids derivados do rótulo); faixas não são gravadas", () => {
    const draft = emptyDraft("QUANTITY");
    draft.unitLabel = " Horas ";
    draft.min = "1";
    draft.max = "20";
    draft.step = "1";
    draft.hoursPerUnit = "1";
    draft.baseHours = "0,5";
    draft.tiers = [{ key: "a", from: "10", unitPriceCents: 4000 }];
    draft.addons = [
      { key: "b", id: null, label: "Prioridade", kind: "PERCENT", percent: "20", cents: 0, extraHours: "" },
      { key: "c", id: null, label: "Prioridade", kind: "FIXED", percent: "", cents: 1500, extraHours: "2" },
    ];
    const result = draftToPricing(draft);
    expect(result).toEqual({
      ok: true,
      pricing: {
        mode: "QUANTITY",
        unitLabel: "Horas",
        min: 1,
        max: 20,
        step: 1,
        hoursPerUnit: 1,
        baseHours: 0.5,
        addons: [
          { id: "prioridade", label: "Prioridade", kind: "PERCENT", value: 20 },
          { id: "prioridade-2", label: "Prioridade", kind: "FIXED", value: 1500, extraHours: 2 },
        ],
      },
    });
    // O que o editor gera o `quote` aceita.
    if (result.ok) {
      const q = quote(5000, result.pricing, { quantity: 10, addonIds: ["prioridade"] });
      // 10 × R$ 50 (sem faixa) + 20% de prioridade.
      expect(q).toMatchObject({ ok: true, totalCents: 60000 });
    }
  });

  it("LEVEL_RANGE com buraco entre faixas é recusado pelo schema do contrato", () => {
    const draft = emptyDraft("LEVEL_RANGE");
    draft.min = "1";
    draft.max = "50";
    draft.bands = [
      { key: "a", from: "1", to: "20", pricePerLevelCents: 100, hoursPerLevel: "0.1" },
      { key: "b", from: "30", to: "50", pricePerLevelCents: 200, hoursPerLevel: "0.2" },
    ];
    const result = draftToPricing(draft);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("20");
  });

  it("número fracionado em campo inteiro → recusa com o nome do campo", () => {
    const draft = emptyDraft("QUANTITY");
    draft.min = "1.5";
    const result = draftToPricing(draft);
    expect(result).toMatchObject({ ok: false, message: expect.stringContaining("Mínimo") });
  });

  it("campo vazio → recusa, nunca vira zero calado", () => {
    const draft = emptyDraft("QUANTITY");
    draft.max = "";
    expect(draftToPricing(draft).ok).toBe(false);
  });
});

describe("pricingToDraft ↔ draftToPricing", () => {
  it("ida e volta preserva a regra e o id gravado do adicional", () => {
    const pricing: Pricing = {
      mode: "LEVEL_RANGE",
      unitLabel: "Nível",
      min: 1,
      max: 100,
      bands: [
        { from: 1, to: 50, pricePerLevelCents: 100, hoursPerLevel: 0.1 },
        { from: 50, to: 100, pricePerLevelCents: 300, hoursPerLevel: 0.2 },
      ],
      addons: [{ id: "id-antigo", label: "Rótulo novo", kind: "FIXED", value: 1000 }],
      baseHours: 1,
    };
    expect(draftToPricing(pricingToDraft(pricing))).toEqual({ ok: true, pricing });
  });

  it("null = FIXED", () => {
    expect(pricingToDraft(null).mode).toBe("FIXED");
  });
});

describe("addonIds", () => {
  it("rótulo sem letras vira adicional-N", () => {
    expect(addonIds([{ id: null, label: "!!!" }, { id: null, label: "" }])).toEqual(["adicional-1", "adicional-2"]);
  });
});

describe("quantidades prontas (presets)", () => {
  function goldDraft(presets: string) {
    const draft = emptyDraft("QUANTITY");
    draft.unitLabel = "Gold";
    draft.min = "100";
    draft.max = "1000000";
    draft.step = "100";
    draft.presets = presets;
    return draft;
  }

  it("lê vírgula/espaço e ponto de milhar", () => {
    expect(parsePresets("100, 500;1.000  5.000")).toEqual([100, 500, 1000, 5000]);
    expect(parsePresets("")).toEqual([]);
  });

  it("válidos entram no Pricing e voltam ao rascunho", () => {
    const result = draftToPricing(goldDraft("100, 1.000, 500.000"));
    expect(result).toMatchObject({ ok: true, pricing: { presets: [100, 1000, 500000] } });
    if (result.ok) expect(pricingToDraft(result.pricing).presets).toBe("100, 1000, 500000");
  });

  it("vazio = sem presets", () => {
    const result = draftToPricing(goldDraft(" "));
    expect(result.ok && "presets" in result.pricing).toBe(false);
  });

  it("fora de mínimo/máximo/passo → mensagem do zod", () => {
    expect(draftToPricing(goldDraft("100, 150"))).toEqual({
      ok: false,
      message: "A quantidade pronta 150 está fora de mínimo/máximo/passo.",
    });
  });

  it("não-número e lista longa são recusados com o nome do campo", () => {
    expect(draftToPricing(goldDraft("100, 1x"))).toMatchObject({ ok: false });
    const many = Array.from({ length: 25 }, (_, i) => (i + 1) * 100).join(",");
    expect(draftToPricing(goldDraft(many))).toEqual({
      ok: false,
      message: "Quantidades prontas: no máximo 24 itens.",
    });
  });
});

describe("parseHighlights (campo Tópicos do card)", () => {
  it("uma linha por tópico, normalizado", () => {
    expect(parseHighlights(" a \r\n\r\nb\n")).toEqual({ ok: true, highlights: ["a", "b"] });
  });

  it("7 linhas → mensagem do zod", () => {
    expect(parseHighlights("1\n2\n3\n4\n5\n6\n7")).toEqual({
      ok: false,
      message: "O card aceita no máximo 6 tópicos.",
    });
  });
});
