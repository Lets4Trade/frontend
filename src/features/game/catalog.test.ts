import { describe, expect, it } from "vitest";
import { activeCategory, buildHref, categoryChoice, parseCatalogQuery, scopedCategories } from "./catalog";
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
    // Seleção única (2026-10-08): de várias na URL, vale a primeira do escopo.
    expect(ok.categories).toEqual(["hc-boost"]);

    const outOfScope = parseCatalogQuery({ aba: "moedas", servidor: "hc", categoria: "hc-boost" }, page);
    expect(outOfScope.categories).toEqual([]);
    expect(scopedCategories(page, outOfScope).map((category) => category.id)).toEqual(["global"]);
  });

  it("buildHref preserva a aba", () => {
    const query = parseCatalogQuery({ aba: "power-leveling" }, page);
    expect(buildHref("poe2", query, { server: "hc" })).toBe("/games/poe2?aba=power-leveling&servidor=hc");
  });
});

describe("categoria: seleção única (2026-10-08)", () => {
  const query = { tab: "moedas", server: "sc", categories: [] as string[], sort: null, search: "", page: 1 };
  const items = toGameCategories([
    { slug: "orbs", label: "Orbs", children: [{ slug: "divine", label: "Divine" }] },
    { slug: "itens", label: "Itens" },
  ] as never);

  it("categoryChoice: topo troca/limpa; subcategoria escolhe e, de novo, volta para a mãe", () => {
    const [orbs, itens] = items;
    const divine = orbs.children[0];
    expect(categoryChoice(query, orbs, null)).toEqual([orbs.id]);
    const onOrbs = { ...query, categories: [orbs.id] };
    expect(categoryChoice(onOrbs, itens, orbs)).toEqual([itens.id]);
    expect(categoryChoice(onOrbs, orbs, orbs)).toEqual([]);
    expect(categoryChoice(onOrbs, divine, orbs)).toEqual([divine.id]);
    const onDivine = { ...query, categories: [divine.id] };
    expect(categoryChoice(onDivine, divine, orbs)).toEqual([orbs.id]);
    // Mãe marcada (por causa da filha): clicar nela limpa tudo.
    expect(categoryChoice(onDivine, orbs, orbs)).toEqual([]);
  });

  it("activeCategory é a escolhida ou a mãe da subcategoria escolhida", () => {
    expect(activeCategory(items, query)).toBeNull();
    expect(activeCategory(items, { ...query, categories: ["itens"] })?.id).toBe("itens");
    const divine = items[0].children[0].id;
    expect(activeCategory(items, { ...query, categories: [divine] })?.id).toBe(items[0].id);
  });
});

