// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { SITE_TITLE_TEMPLATE, withSiteName } from "@/lib/siteTitle";
import { buildSeoDescription, buildTabTitle } from "./content";

vi.mock("@/lib/publicApi", () => ({
  publicApiGet: vi.fn(),
  backendAsset: (path: string | null | undefined) => path ?? null,
}));
vi.mock("@/features/site/content", () => ({
  getSectionsFor: vi.fn(),
  getSectionItemsFor: vi.fn(),
}));

describe("buildTabTitle (título da aba do navegador)", () => {
  it("segue o padrão MMOEXP: Compre + aba + jogo", () => {
    expect(buildTabTitle("ARC Raiders", { label: "MOEDAS", layout: "QUANTITY" })).toBe(
      "Compre Moedas ARC Raiders",
    );
    expect(buildTabTitle("Diablo 4", { label: "ITENS", layout: "CATALOG" })).toBe(
      "Compre Itens Diablo 4",
    );
  });

  it("aba de venda vira frase de venda", () => {
    expect(buildTabTitle("Diablo 4", { label: "VENDA PRA NÓS", layout: "SELL" })).toBe(
      "Venda seus itens de Diablo 4",
    );
  });

  it("jogo sem aba ainda tem frase", () => {
    expect(buildTabTitle("Diablo 4", undefined)).toBe("Compre itens de Diablo 4");
  });

  it("marca no fim, sempre igual", () => {
    expect(withSiteName("Compre Itens Diablo 4")).toBe("Compre Itens Diablo 4 | Lets 4 Trade");
    expect(SITE_TITLE_TEMPLATE.replace("%s", "Compre Itens Diablo 4")).toBe(
      "Compre Itens Diablo 4 | Lets 4 Trade",
    );
  });
});

describe("buildSeoDescription (descrição da página)", () => {
  it("segue a aba ativa, como o título", () => {
    expect(buildSeoDescription("ARC Raiders", { label: "ITENS", layout: "CATALOG" })).toBe(
      "Compre Itens ARC Raiders na Lets4Trade: entrega rápida, suporte e preço justo.",
    );
    expect(buildSeoDescription("ARC Raiders", { label: "MOEDAS", layout: "QUANTITY" })).toBe(
      "Compre Moedas ARC Raiders na Lets4Trade: entrega rápida, suporte e preço justo.",
    );
  });
});
