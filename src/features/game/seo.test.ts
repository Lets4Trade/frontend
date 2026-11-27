// @vitest-environment node
import { describe, expect, it } from "vitest";
import { tabSeoDescription, tabSeoTitle, titleHasBrand } from "./seo";

const coins = { label: "CURRENCYS", layout: "CATALOG" };

describe("título e descrição do Google por aba (2026-11-27)", () => {
  it("sem texto no painel, vale o automático", () => {
    expect(tabSeoTitle("Path of Exile", coins)).toBe("Compre Currencys Path of Exile");
    expect(tabSeoDescription("Path of Exile", coins)).toMatch(/^Compre Currencys Path of Exile na Lets4Trade: \+1\.000 referências/);
  });

  it("o escrito no painel vence o automático", () => {
    const tab = { ...coins, seoTitle: "Compre Aqui Divine Orb", seoDescription: "Divine Orb com entrega imediata." };
    expect(tabSeoTitle("Path of Exile", tab)).toBe("Compre Aqui Divine Orb");
    expect(tabSeoDescription("Path of Exile", tab)).toBe("Divine Orb com entrega imediata.");
  });

  it("texto só de espaços conta como vazio", () => {
    expect(tabSeoTitle("Path of Exile", { ...coins, seoTitle: "   " })).toBe("Compre Currencys Path of Exile");
  });

  it("título com a marca não ganha a marca de novo", () => {
    expect(titleHasBrand("Divine Orb | Lets4Trade.com")).toBe(true);
    expect(titleHasBrand("Divine Orb | Lets 4 Trade")).toBe(true);
    expect(titleHasBrand("Compre Aqui Divine Orb")).toBe(false);
  });
});
