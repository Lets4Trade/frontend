import { describe, expect, it } from "vitest";
import { DEFAULT_QUANTITY_PRICING } from "@/features/pricing/quote";
import {
  defaultTabId,
  parseServiceContent,
  readHighlights,
  readPricing,
  safeLinkHref,
  scopeCategories,
  tabsFromApi,
  toGameCategories,
  withEffectivePricing,
} from "./storefrontTabs";
import type { GameProduct } from "./types";

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

describe("layouts v2 (QUANTITY, PACKAGES, SELL)", () => {
  const tabs = tabsFromApi("poe2", [
    { slug: "gold", label: "GOLD", layout: "QUANTITY", content: { sections: [{ title: "Entrega", items: ["Rápida"] }] } },
    { slug: "pacotes", label: "PACOTES", layout: "PACKAGES", content: { sections: [{ title: "T", items: ["x"] }] } },
    { slug: "venda", label: "VENDA PRA NÓS", layout: "SELL", linkHref: "/venda", content: { sections: [{ title: "T", items: ["x"] }] } },
  ]);

  it("aceita os três; SELL é aba da própria página (não navega para fora)", () => {
    expect(tabs.map((tab) => [tab.id, tab.layout, tab.href])).toEqual([
      ["gold", "QUANTITY", "/games/poe2"],
      ["pacotes", "PACKAGES", "/games/poe2?aba=pacotes"],
      ["venda", "SELL", "/games/poe2?aba=venda"],
    ]);
  });

  it("textos da esquerda valem para QUANTITY e PACKAGES, não para SELL", () => {
    expect(tabs[0].content?.sections[0].title).toBe("Entrega");
    expect(tabs[1].content).toBeDefined();
    expect(tabs[2].content).toBeUndefined();
  });

  it("ícone de reserva por layout", () => {
    const [custom] = tabsFromApi("poe2", [{ slug: "ouro-x", label: "OURO", layout: "QUANTITY" }]);
    expect(custom.icon.src).toBe("/icons/game/tab-gold.svg");
  });
});

describe("readHighlights", () => {
  it("ausente/estranho = []; saneia como o backend", () => {
    expect(readHighlights(undefined)).toEqual([]);
    expect(readHighlights("x")).toEqual([]);
    const extra = Array.from({ length: 12 }, (_, i) => `t${i}`);
    expect(readHighlights(["  a  ", "", 3, "b".repeat(300), ...extra])).toEqual([
      "a",
      "b".repeat(200),
      ...extra.slice(0, 10),
    ]);
  });
});

describe("withEffectivePricing", () => {
  const base: GameProduct = { id: "p", name: "Gold", priceCents: 10, tabId: "gold", highlights: [] };

  it("QUANTITY sem regra usa o padrão; SERVICE/PACKAGES sem regra = FIXED", () => {
    expect(withEffectivePricing([base], "QUANTITY")[0].pricing).toEqual(DEFAULT_QUANTITY_PRICING);
    expect(withEffectivePricing([base], "PACKAGES")[0].pricing).toEqual({ mode: "FIXED" });
    expect(withEffectivePricing([base], "SERVICE")[0].pricing).toEqual({ mode: "FIXED" });
  });

  it("regra salva vence; CATALOG não ganha regra; inválida continua inválida", () => {
    const saved = { ...base, pricing: { mode: "FIXED" as const, baseHours: 2 } };
    expect(withEffectivePricing([saved], "QUANTITY")[0].pricing).toEqual({ mode: "FIXED", baseHours: 2 });
    expect(withEffectivePricing([base], "CATALOG")[0].pricing).toBeUndefined();
    const invalid = { ...base, pricingInvalid: true };
    expect(withEffectivePricing([invalid], "QUANTITY")[0]).toEqual(invalid);
  });
});

describe("tabHrefWithServer (servidor se mantém ao trocar de aba)", async () => {
  const { tabHrefWithServer } = await import("./storefrontTabs");
  it("anexa o servidor nas abas da página e não mexe em aba de link", () => {
    expect(tabHrefWithServer({ href: "/games/poe2?aba=boosting", layout: "PACKAGES" }, "hardcore")).toBe(
      "/games/poe2?aba=boosting&servidor=hardcore",
    );
    expect(tabHrefWithServer({ href: "/games/poe2", layout: "CATALOG" }, "hardcore")).toBe("/games/poe2?servidor=hardcore");
    expect(tabHrefWithServer({ href: "/fidelidade", layout: "LINK" }, "hardcore")).toBe("/fidelidade");
    expect(tabHrefWithServer({ href: "/games/poe2", layout: "CATALOG" }, "")).toBe("/games/poe2");
  });
});
