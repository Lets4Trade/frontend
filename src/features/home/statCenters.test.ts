import { describe, expect, it } from "vitest";
import { statCenters } from "./HomeNav";

describe("statCenters", () => {
  it("dois contadores: as posições do arquivo", () => {
    expect(statCenters(2)).toEqual([340, 1444.75]);
  });

  it("três: dois à esquerda do menu, um à direita", () => {
    const [a, b, c] = statCenters(3);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(679); // antes do primeiro ladrilho
    expect(c).toBe(1444.75);
  });

  it("quatro: dois de cada lado, sem invadir o menu (679–1135)", () => {
    const centers = statCenters(4);
    expect(centers).toHaveLength(4);
    expect(centers.slice(0, 2).every((x) => x + 90 < 679)).toBe(true);
    expect(centers.slice(2).every((x) => x - 90 > 1135)).toBe(true);
  });

  it("mais de quatro é cortado; zero não desenha nada", () => {
    expect(statCenters(7)).toHaveLength(4);
    expect(statCenters(0)).toEqual([]);
  });
});
