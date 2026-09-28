import { describe, expect, it } from "vitest";
import {
  defaultTabId,
  parseServiceContent,
  readPricing,
  safeLinkHref,
  scopeCategories,
  tabsFromApi,
  toGameCategories,
} from "./storefrontTabs";

describe("tabsFromApi", () => {
  const tabs = tabsFromApi("poe2", [
    { slug: "moedas", label: "MOEDAS", iconUrl: "/icons/game/tab-moedas.svg", layout: "CATALOG" },
    {
      slug: "boosting",
      label: "BOOSTING",
      iconUrl: "/uploads/tabs/x.webp",
      layout: "SERVICE",
      content: { sections: [{ title: "Requirements", items: ["Conta", 42, "  "] }, { title: "", items: [] }] },
    },
    { slug: "venda", label: "VENDA PRA NÓS", layout: "LINK", linkHref: "/venda" },
    { slug: "ruim", label: "X", layout: "LINK", linkHref: "javascript:alert(1)" },
    { slug: "Maiuscula", label: "X", layout: "CATALOG" },
    { slug: "estranha", label: "X", layout: "GRID" },
  ]);

  it("usa o slug como id, primeira não-LINK sem ?aba=, LINK leva ao linkHref", () => {
    expect(tabs.map((tab) => [tab.id, tab.layout, tab.href])).toEqual([
      ["moedas", "CATALOG", "/games/poe2"],
      ["boosting", "SERVICE", "/games/poe2?aba=boosting"],
      ["venda", "LINK", "/venda"],
    ]);
  });

  it("ícone padrão fica no Next; upload vai para o backend", () => {
    expect(tabs[0].icon.src).toBe("/icons/game/tab-moedas.svg");
    expect(tabs[1].icon.src).toMatch(/\/uploads\/tabs\/x\.webp$/);
    expect(tabs[2].icon.src).toBe("/icons/game/tab-venda.svg");
  });

  it("saneia o conteúdo SERVICE (só texto, sem seção vazia)", () => {
    expect(tabs[1].content).toEqual({ sections: [{ title: "Requirements", items: ["Conta"] }] });
    expect(tabs[0].content).toBeUndefined();
  });
});

describe("defaultTabId", () => {
  it("é a primeira aba que não é LINK; sem nenhuma, vazio", () => {
    const tabs = tabsFromApi("poe2", [
      { slug: "venda", label: "VENDA", layout: "LINK", linkHref: "/venda" },
      { slug: "gold", label: "GOLD", layout: "CATALOG" },
    ]);
    expect(defaultTabId(tabs)).toBe("gold");
    // Aba de modelo sem ícone cai no ícone do modelo.
    expect(tabs[1].icon.src).toBe("/icons/game/tab-gold.svg");
    expect(defaultTabId(tabsFromApi("poe2", []))).toBe("");
  });
});

describe("categorias com escopo", () => {
  const tree = toGameCategories([
    {
      id: "c1",
      slug: "global",
      label: "Global",
      children: [
        { id: "c2", slug: "filha-sc", label: "Filha SC", serverSlug: "sc" },
        { id: "c3", slug: "filha-livre", label: "Filha" },
      ],
    },
    { id: "c4", slug: "so-sc-boost", label: "SC Boost", serverSlug: "sc", tabSlug: "boosting" },
    { id: "c5", slug: "so-hc", label: "HC", serverSlug: "hc" },
    { id: "c6", slug: "so-moedas", label: "Moedas", tabSlug: "moedas" },
  ]);

  it("mapeia serverSlug/tabSlug (nulo = todos)", () => {
    expect(tree[0]).toMatchObject({ id: "global", serverSlug: null, tabSlug: null });
    expect(tree[0].children[0]).toMatchObject({ id: "filha-sc", parentId: "global", serverSlug: "sc" });
    expect(tree[1]).toMatchObject({ serverSlug: "sc", tabSlug: "boosting" });
  });

  it("(servidor OU global) E (aba OU global)", () => {
    const ids = (server: string, tab: string) =>
      scopeCategories(tree, server, tab).map((root) => [root.id, root.children.map((child) => child.id)]);
    expect(ids("sc", "boosting")).toEqual([
      ["global", ["filha-sc", "filha-livre"]],
      ["so-sc-boost", []],
    ]);
    expect(ids("hc", "moedas")).toEqual([
      ["global", ["filha-livre"]],
      ["so-hc", []],
      ["so-moedas", []],
    ]);
  });
});

describe("helpers", () => {
  it("safeLinkHref aceita só caminho interno ou https", () => {
    expect(safeLinkHref("/fidelidade")).toBe("/fidelidade");
    expect(safeLinkHref("https://example.com/x")).toBe("https://example.com/x");
    expect(safeLinkHref("//evil.com")).toBeNull();
    expect(safeLinkHref("javascript:alert(1)")).toBeNull();
    expect(safeLinkHref("http://x.com")).toBeNull();
  });

  it("parseServiceContent ignora formato inesperado", () => {
    expect(parseServiceContent("<b>oi</b>")).toBeUndefined();
    expect(parseServiceContent({ sections: "x" })).toBeUndefined();
  });

  it("readPricing valida a regra", () => {
    expect(readPricing(null)).toEqual({});
    expect(readPricing({ mode: "FIXED" })).toEqual({ pricing: { mode: "FIXED" } });
    expect(readPricing({ mode: "QUANTITY" })).toEqual({ pricingInvalid: true });
  });
});
