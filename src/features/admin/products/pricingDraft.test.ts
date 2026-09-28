import { describe, expect, it } from "vitest";
import { quote, type Pricing } from "@/features/pricing/quote";
import { addonIds, draftToPricing, emptyDraft, pricingToDraft } from "./pricingDraft";

describe("draftToPricing", () => {
  it("FIXED sem nada extra", () => {
    expect(draftToPricing(emptyDraft("FIXED"))).toEqual({ ok: true, pricing: { mode: "FIXED" } });
  });

  it("QUANTITY com faixas, horas e adicionais (ids derivados do rótulo)", () => {
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
        tiers: [{ from: 10, unitPriceCents: 4000 }],
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
      expect(q).toMatchObject({ ok: true, totalCents: 48000 });
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
