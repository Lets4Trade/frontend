import { describe, expect, it } from "vitest";
import { buildHref, parseCatalogQuery, scopedCategories } from "./catalog";
import { tabsFromApi, toGameCategories } from "./storefrontTabs";
import type { GamePage } from "./types";

function makePage(): GamePage {
  const tabs = tabsFromApi("poe2", [
    { slug: "moedas", label: "MOEDAS", layout: "CATALOG" },
    { slug: "power-leveling", label: "POWER LEVELING", layout: "SERVICE" },
    { slug: "fidelidade", label: "FIDELIDADE", layout: "LINK", linkHref: "/fidelidade" },
  ]);
  return {
    slug: "poe2",
    name: "Path of Exile 2",
    tabs,
    activeTabId: "moedas",
    servers: {
      label: "Selecionar servidor",
      items: [
        { slug: "sc", label: "SC" },
        { slug: "hc", label: "HC" },
      ],
    },
    categories: {
      label: "Selecionar categoria",
      items: toGameCategories([
        { slug: "global", label: "Global" },
        { slug: "hc-boost", label: "HC boost", serverSlug: "hc", tabSlug: "power-leveling" },
      ]),
    },
  } as unknown as GamePage;
}

describe("parseCatalogQuery com abas do banco", () => {
  const page = makePage();

  it("aceita aba SERVICE nova (slug que não existe no código)", () => {
    expect(parseCatalogQuery({ aba: "power-leveling" }, page).tab).toBe("power-leveling");
  });

  it("recusa aba LINK e aba inventada (cai na padrão)", () => {
    expect(parseCatalogQuery({ aba: "fidelidade" }, page).tab).toBe("moedas");
    expect(parseCatalogQuery({ aba: "boosting" }, page).tab).toBe("moedas");
  });

  it("valida categoria contra o ESCOPO (servidor + aba)", () => {
    const ok = parseCatalogQuery(
      { aba: "power-leveling", servidor: "hc", categoria: ["hc-boost", "global"] },
      page,
    );
    expect(ok.categories).toEqual(["hc-boost", "global"]);

    const outOfScope = parseCatalogQuery({ aba: "moedas", servidor: "hc", categoria: "hc-boost" }, page);
    expect(outOfScope.categories).toEqual([]);
    expect(scopedCategories(page, outOfScope).map((category) => category.id)).toEqual(["global"]);
  });

  it("buildHref preserva a aba", () => {
    const query = parseCatalogQuery({ aba: "power-leveling" }, page);
    expect(buildHref("poe2", query, { server: "hc" })).toBe("/games/poe2?aba=power-leveling&servidor=hc");
  });
});
