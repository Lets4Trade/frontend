import { describe, expect, it } from "vitest";
import type { Pricing } from "@/features/pricing/quote";
import { filterAddons, formatQuantity, initialQuantity, snapQuantity, validPresets } from "./configurator";

const gold: Extract<Pricing, { mode: "QUANTITY" }> = {
  mode: "QUANTITY",
  unitLabel: "Gold",
  min: 1000,
  max: 1_000_000,
  step: 1000,
  presets: [50_000, 5000, 5000, 10_000],
};

describe("quantidade", () => {
  it("snapQuantity prende ao min/max/passo", () => {
    expect(snapQuantity(gold, 0)).toBe(1000);
    expect(snapQuantity(gold, 2400)).toBe(2000);
    expect(snapQuantity(gold, 2600)).toBe(3000);
    expect(snapQuantity(gold, 5_000_000)).toBe(1_000_000);
    expect(snapQuantity(gold, Number.NaN)).toBe(1000);
    // Máximo fora da grade do passo: nunca passa do máximo.
    expect(snapQuantity({ min: 1, max: 10, step: 4 }, 10)).toBe(9);
  });

  it("validPresets: sem repetição, em ordem, só os que a regra aceita", () => {
    expect(validPresets(gold)).toEqual([5000, 10_000, 50_000]);
    expect(validPresets({ ...gold, presets: [1500, 2000] })).toEqual([2000]);
    expect(validPresets({ ...gold, presets: undefined })).toEqual([]);
  });

  it("initialQuantity: primeira pronta, ou o mínimo", () => {
    expect(initialQuantity(gold)).toBe(5000);
    expect(initialQuantity({ ...gold, presets: [] })).toBe(1000);
  });

  it("formatQuantity usa milhar pt-BR", () => {
    expect(formatQuantity(1_000_000)).toBe("1.000.000");
  });
});

describe("filterAddons", () => {
  const addons = [
    { id: "a", label: "Prioridade", kind: "PERCENT" as const, value: 10 },
    { id: "b", label: "Classe Épica", kind: "FIXED" as const, value: 1000 },
    { id: "c", label: "Stream", kind: "FIXED" as const, value: 1000 },
  ];

  it("busca vazia devolve tudo", () => {
    expect(filterAddons(addons, "  ")).toHaveLength(3);
  });

  it("ignora caixa e acento", () => {
    expect(filterAddons(addons, "EPICA").map((addon) => addon.id)).toEqual(["b"]);
  });

  it("marcados continuam na lista", () => {
    expect(filterAddons(addons, "epica", ["c"]).map((addon) => addon.id)).toEqual(["b", "c"]);
  });
});
