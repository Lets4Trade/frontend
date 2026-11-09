import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { quote } from "@/features/pricing/quote";
import { PricingEditor } from "./PricingEditor";
import { draftToPricing, moveItem, pricingToDraft, type PricingDraft } from "./pricingDraft";

/**
 * Subir/descer faixas e adicionais (2026-11-09): antes só dava para pôr linha
 * nova no fim, e encaixar um valor num nível do meio obrigava a refazer tudo.
 */
describe("moveItem", () => {
  it("sobe e desce trocando com a vizinha", () => {
    expect(moveItem(["a", "b", "c"], 2, -1)).toEqual(["a", "c", "b"]);
    expect(moveItem(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
  });

  it("nas pontas devolve a lista igual (cópia)", () => {
    const list = ["a", "b"];
    expect(moveItem(list, 0, -1)).toEqual(["a", "b"]);
    expect(moveItem(list, 1, 1)).toEqual(["a", "b"]);
    expect(moveItem(list, 0, -1)).not.toBe(list);
  });
});

const LEVELS = pricingToDraft({
  mode: "LEVEL_RANGE",
  unitLabel: "Nível",
  min: 1,
  max: 100,
  bands: [
    { from: 1, to: 100, pricePerLevelCents: 100, hoursPerLevel: 0 },
    // Faixa do meio criada por último, com outro preço.
    { from: 30, to: 40, pricePerLevelCents: 500, hoursPerLevel: 0 },
  ],
  addons: [
    { id: "prioridade", label: "Prioridade", kind: "PERCENT", value: 20 },
    { id: "stream", label: "Stream", kind: "FIXED", value: 1000 },
  ],
});

function setup(draft: PricingDraft) {
  const onChange = vi.fn();
  render(<PricingEditor draft={draft} onChange={onChange} basePriceCents={0} />);
  return onChange;
}

describe("PricingEditor — ordem das linhas", () => {
  it("subir a faixa 2 a põe em primeiro, e aí ela vale para os níveis 30–39", () => {
    const onChange = setup(LEVELS);
    // Antes: a 1ª faixa (1–100) cobre tudo, a do meio não vale.
    const before = draftToPricing(LEVELS);
    expect(before.ok && quote(0, before.pricing, { levelFrom: 30, levelTo: 31 })).toMatchObject({ totalCents: 100 });

    fireEvent.click(screen.getByLabelText("Subir faixa 2"));
    const next: PricingDraft = onChange.mock.calls[0][0];
    expect(next.bands.map((band) => band.from)).toEqual(["30", "1"]);
    const after = draftToPricing(next);
    expect(after.ok && quote(0, after.pricing, { levelFrom: 30, levelTo: 31 })).toMatchObject({ totalCents: 500 });
    expect(after.ok && quote(0, after.pricing, { levelFrom: 50, levelTo: 51 })).toMatchObject({ totalCents: 100 });
  });

  it("primeira linha não sobe e última não desce", () => {
    setup(LEVELS);
    expect(screen.getByLabelText("Subir faixa 1")).toBeDisabled();
    expect(screen.getByLabelText("Descer faixa 2")).toBeDisabled();
    expect(screen.getByLabelText("Descer faixa 1")).toBeEnabled();
  });

  it("descer o adicional 1 troca a ordem e mantém os ids gravados", () => {
    const onChange = setup(LEVELS);
    fireEvent.click(screen.getByLabelText("Descer adicional 1"));
    const next: PricingDraft = onChange.mock.calls[0][0];
    expect(next.addons.map((addon) => addon.id)).toEqual(["stream", "prioridade"]);
  });

  it("remover continua funcionando", () => {
    const onChange = setup(LEVELS);
    fireEvent.click(screen.getByLabelText("Remover adicional 2"));
    expect((onChange.mock.calls[0][0] as PricingDraft).addons.map((addon) => addon.id)).toEqual(["prioridade"]);
  });
});
