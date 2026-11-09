import { describe, expect, it } from "vitest";
import type { Pricing } from "@/features/pricing/quote";
import { atLimit, filterAddons, formatQuantity, initialQuantity, snapQuantity, toggleAddon, validPresets } from "./configurator";

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

  it("formatQuantity abrevia: K, Mi, Bi e Tri", () => {
    expect(formatQuantity(999)).toBe("999");
    expect(formatQuantity(1_000)).toBe("1K");
    expect(formatQuantity(500_000)).toBe("500K");
    expect(formatQuantity(1_000_000)).toBe("1Mi");
    expect(formatQuantity(2_500_000_000)).toBe("2,5Bi");
    expect(formatQuantity(1_000_000_000_000)).toBe("1Tri");
    // Nunca arredonda para cima: 1.999.999 não pode aparecer como 2Mi.
    expect(formatQuantity(1_999_999)).toBe("1,99Mi");
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

describe("toggleAddon (limites de serviços e subserviços, 2026-11-09)", () => {
  const pricing: Pricing = {
    mode: "FIXED",
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

  it("no limite (máximo 2) o terceiro é ignorado", () => {
    expect(toggleAddon(pricing, ["campanha", "mapas"], "chefes")).toEqual(["campanha", "mapas"]);
    expect(toggleAddon(pricing, ["mapas"], "chefes")).toEqual(["mapas", "chefes"]);
  });

  it("máximo 1 TROCA a escolha (subserviço)", () => {
    expect(toggleAddon(pricing, ["campanha", "ato-1"], "ato-2")).toEqual(["campanha", "ato-2"]);
  });

  it("máximo 1 de serviços troca e leva junto os subserviços do antigo", () => {
    const one = { ...pricing, maxAddons: 1 };
    expect(toggleAddon(one, ["campanha", "ato-1"], "mapas")).toEqual(["mapas"]);
  });

  it("caixinha do serviço com subserviços: marcar abre (entra na escolha); desmarcar tira os subserviços", () => {
    expect(toggleAddon(pricing, ["mapas"], "campanha")).toEqual(["mapas", "campanha"]);
    expect(toggleAddon(pricing, ["campanha", "ato-1", "mapas"], "campanha")).toEqual(["mapas"]);
  });

  it("subserviço sem o serviço marcado é ignorado; desmarcar o último mantém o serviço", () => {
    expect(toggleAddon(pricing, ["mapas"], "ato-1")).toEqual(["mapas"]);
    expect(toggleAddon(pricing, ["campanha", "ato-1"], "ato-1")).toEqual(["campanha"]);
  });

  it("no limite de serviços (máx 2), marcar outro serviço é ignorado", () => {
    expect(toggleAddon(pricing, ["mapas", "chefes"], "campanha")).toEqual(["mapas", "chefes"]);
  });

  it("atLimit só apaga os outros com máximo acima de 1", () => {
    expect(atLimit(2, 2)).toBe(true);
    expect(atLimit(1, 1)).toBe(false);
    expect(atLimit(5, undefined)).toBe(false);
  });
});
