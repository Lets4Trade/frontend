import { describe, expect, it } from "vitest";
import { buildHref, parseCatalogQuery } from "./catalog";
import { showsGenericFilters } from "./layouts";
import { pickPackageVariant } from "./packages";
import type { GamePage, GameProduct } from "./types";

const product = (id: string, tabId: string, serverSlug?: string): GameProduct => ({
  id,
  name: "Campanha",
  priceCents: 1000,
  tabId,
  highlights: [],
  serverSlug,
});

describe("pickPackageVariant", () => {
  const variants = [product("aaaaaaaa1", "boosting", "sc"), product("aaaaaaaa2", "boosting", "hc")];

  it("abre o pacote pedido, desta aba", () => {
    expect(pickPackageVariant(variants, "aaaaaaaa2", "boosting")?.serverSlug).toBe("hc");
  });

  it("id de outra aba ou desconhecido não abre", () => {
    expect(pickPackageVariant([product("bbbbbbbb1", "gold")], "bbbbbbbb1", "boosting")).toBeNull();
    expect(pickPackageVariant(variants, "zzzzzzzz9", "boosting")).toBeNull();
  });
});

describe("?pacote= na URL", () => {
  const page = {
    activeTabId: "boosting",
    tabs: [{ id: "boosting", label: "BOOSTING", layout: "PACKAGES" }],
    servers: { label: "Servidor", items: [{ slug: "sc", label: "SC" }] },
    categories: { items: [] },
  } as unknown as GamePage;

  it("lê só id válido", () => {
    expect(parseCatalogQuery({ aba: "boosting", pacote: "cmu6da9o4000ubrzk" }, page).pkg).toBe("cmu6da9o4000ubrzk");
    expect(parseCatalogQuery({ aba: "boosting", pacote: "../x" }, page).pkg).toBeUndefined();
    expect(parseCatalogQuery({ aba: "boosting", pacote: "seed-poe2-campanha" }, page).pkg).toBe("seed-poe2-campanha");
  });

  it("só fica no link que o pede", () => {
    const query = parseCatalogQuery({ aba: "boosting", pacote: "cmu6da9o4000ubrzk" }, page);
    expect(buildHref("poe2", query, {})).not.toContain("pacote=");
    expect(buildHref("poe2", query, { pkg: "cmu6da9o4000ubrzk" })).toContain("pacote=cmu6da9o4000ubrzk");
  });

  it("com pacote aberto os filtros genéricos somem", () => {
    expect(showsGenericFilters("PACKAGES")).toBe(true);
    expect(showsGenericFilters("PACKAGES", true)).toBe(false);
    expect(showsGenericFilters("CATALOG", true)).toBe(true);
  });
});
