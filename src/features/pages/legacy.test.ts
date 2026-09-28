import { describe, expect, it } from "vitest";
import { normalizeBlocks, normalizeProductGridProps } from "./legacy";
import type { Block } from "./types";

describe("normalizeProductGridProps (espelho do backend)", () => {
  it("productType legado vira tabSlug minúsculo e sai do objeto", () => {
    expect(normalizeProductGridProps({ gameId: "g1", productType: "MOEDAS", limit: 8 })).toEqual({
      gameId: "g1",
      tabSlug: "moedas",
      limit: 8,
    });
  });

  it("tabSlug presente vence o productType", () => {
    expect(normalizeProductGridProps({ tabSlug: "gold", productType: "MOEDAS" })).toEqual({ tabSlug: "gold" });
  });

  it("sem productType devolve o MESMO objeto", () => {
    const props = { gameId: "g1", tabSlug: "gold" };
    expect(normalizeProductGridProps(props)).toBe(props);
  });
});

describe("normalizeBlocks", () => {
  it("só mexe no productGrid", () => {
    const faq = { id: "faq123", type: "faq", props: { items: [], productType: "X" } } as unknown as Block;
    const grid = {
      id: "grid12",
      type: "productGrid",
      props: { gameId: "g1", productType: "GOLD", limit: 8, sort: "destaque" },
    } as unknown as Block;
    const [a, b] = normalizeBlocks([faq, grid]);
    expect(a).toBe(faq);
    expect(b.props).toEqual({ gameId: "g1", tabSlug: "gold", limit: 8, sort: "destaque" });
  });
});
