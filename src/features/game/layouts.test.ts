import { describe, expect, it } from "vitest";
import { catalogBlockFor, showsGenericFilters } from "./layouts";
import type { GameTabLayout } from "./types";

describe("qual bloco cada layout desenha", () => {
  const cases: [GameTabLayout, string, boolean][] = [
    ["CATALOG", "catalog", true],
    ["SERVICE", "service", false],
    ["QUANTITY", "quantity", false],
    ["PACKAGES", "packages", true],
    ["SELL", "sell", false],
  ];

  it.each(cases)("%s → bloco %s, filtros genéricos %s", (layout, block, generic) => {
    expect(catalogBlockFor(layout)).toBe(block);
    expect(showsGenericFilters(layout)).toBe(generic);
  });
});
