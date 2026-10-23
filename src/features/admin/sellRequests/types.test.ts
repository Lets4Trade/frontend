import { describe, expect, it } from "vitest";
import { formatSentAt, platformLabel, toSellRequest, toSellRequestPage } from "./types";

/** Propostas de "Venda pra nós" no painel (2026-10-23). */

const ROW = {
  id: "s1",
  gameName: "Path of Exile 2",
  platform: "steam",
  server: "sa",
  productType: "gold",
  discord: "fulano",
  whatsapp: "(11) 91234-5678",
  description: "Tenho 10k de gold",
  status: "NEW",
  createdAt: "2026-10-23T18:30:00.000Z",
  user: null,
};

describe("toSellRequest", () => {
  it("lê a linha e recusa situação desconhecida", () => {
    expect(toSellRequest(ROW)).toMatchObject({ id: "s1", status: "NEW", user: null });
    expect(toSellRequest({ ...ROW, status: "HACK" })).toBeNull();
    expect(toSellRequest({ ...ROW, user: { id: "u1", username: "ana" } })?.user).toEqual({ id: "u1", name: "ana" });
  });

  it("página descarta linhas quebradas", () => {
    const page = toSellRequestPage({ items: [ROW, { id: 1 }], total: 1, page: 1, pageCount: 1, newCount: 1 });
    expect(page?.items).toHaveLength(1);
    expect(page?.newCount).toBe(1);
  });
});

describe("rótulos", () => {
  it("valor da lista vira rótulo; desconhecido aparece como veio", () => {
    expect(platformLabel("steam")).toBe("Steam");
    expect(platformLabel("xbox")).toBe("xbox");
  });

  it("data no fuso de São Paulo", () => {
    expect(formatSentAt("2026-10-23T18:30:00.000Z")).toBe("23/10/2026 às 15:30");
  });
});
