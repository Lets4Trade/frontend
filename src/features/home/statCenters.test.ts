import { describe, expect, it } from "vitest";
import { statCenters } from "./HomeNav";

// Desde 2026-11-18: os atalhos saíram do meio da faixa, e os contadores se
// espalham por igual na largura toda (1820), cada um no centro da sua fatia.
describe("statCenters", () => {
  it("dois: um em cada metade", () => {
    expect(statCenters(2)).toEqual([455, 1365]);
  });

  it("quatro: um por quarto, com o mesmo vão entre todos", () => {
    expect(statCenters(4)).toEqual([227.5, 682.5, 1137.5, 1592.5]);
  });

  it("um sozinho fica no meio; três dividem em terços", () => {
    expect(statCenters(1)).toEqual([910]);
    expect(statCenters(3).map(Math.round)).toEqual([303, 910, 1517]);
  });

  it("mais de quatro é cortado; zero não desenha nada", () => {
    expect(statCenters(7)).toHaveLength(4);
    expect(statCenters(0)).toEqual([]);
  });
});
