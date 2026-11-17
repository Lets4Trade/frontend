import { describe, expect, it } from "vitest";
import { parseCatalogQuery, scopePageToQuery, tabShowsOnServer } from "./catalog";
import { tabsFromApi } from "./storefrontTabs";
import type { GamePage } from "./types";

/** Abas por servidor (2026-11-17): MOEDAS em todos, BOOSTING só em "temp". */
function makePage(): GamePage {
  const tabs = tabsFromApi("d4", [
    { slug: "moedas", label: "MOEDAS", layout: "CATALOG" },
    { slug: "boosting", label: "BOOSTING", layout: "PACKAGES", serverSlugs: ["temp"] },
    { slug: "carry", label: "CARRY", layout: "PACKAGES", serverSlugs: ["sc", "temp"] },
  ]);
  return {
    slug: "d4",
    name: "Diablo",
    tabs,
    activeTabId: "moedas",
    servers: { label: "Servidor", items: [{ slug: "sc", label: "SC" }, { slug: "hc", label: "HC" }, { slug: "temp", label: "Temp" }] },
    categories: { label: "Categoria", items: [] },
  } as unknown as GamePage;
}

describe("abas por servidor (2026-11-17)", () => {
  const page = makePage();

  it("tabShowsOnServer: sem lista = todos", () => {
    expect(tabShowsOnServer({}, "hc")).toBe(true);
    expect(tabShowsOnServer({ serverSlugs: ["temp"] }, "hc")).toBe(false);
    expect(tabShowsOnServer({ serverSlugs: ["temp"] }, "temp")).toBe(true);
  });

  it("aba restrita: servidor de fora cai no primeiro DELA", () => {
    expect(parseCatalogQuery({ aba: "boosting", servidor: "sc" }, page).server).toBe("temp");
    expect(parseCatalogQuery({ aba: "boosting" }, page).server).toBe("temp");
    expect(parseCatalogQuery({ aba: "carry", servidor: "temp" }, page).server).toBe("temp");
  });

  it("sem ?aba=, mas com servidor: a padrão é a primeira aba daquele servidor", () => {
    expect(parseCatalogQuery({ servidor: "temp" }, page).tab).toBe("moedas");
  });

  it("recorte: fileira só com as abas do servidor; servidores só os da aba", () => {
    const hc = parseCatalogQuery({ aba: "moedas", servidor: "hc" }, page);
    const scopedHc = scopePageToQuery(page, hc);
    expect(scopedHc.tabs.map((tab) => tab.id)).toEqual(["moedas"]);
    expect(scopedHc.servers.items.map((server) => server.slug)).toEqual(["sc", "hc", "temp"]);

    const carry = parseCatalogQuery({ aba: "carry", servidor: "sc" }, page);
    const scopedCarry = scopePageToQuery(page, carry);
    expect(scopedCarry.tabs.map((tab) => tab.id)).toEqual(["moedas", "carry"]);
    expect(scopedCarry.servers.items.map((server) => server.slug)).toEqual(["sc", "temp"]);
  });

  it("dado da API: slug fora do formato é descartado", () => {
    const [tab] = tabsFromApi("d4", [{ slug: "x", label: "X", layout: "CATALOG", serverSlugs: ["ok", "<b>", 3] }]);
    expect(tab.serverSlugs).toEqual(["ok"]);
  });
});
