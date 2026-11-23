import { describe, expect, it } from "vitest";
import { isNewsSource, newsSourceOptions, newsSourceValue } from "./newsSource";

const ID_A = "cmabc0000000000000000000a";
const ID_B = "cmabc0000000000000000000b";
const ID_C = "cmabc0000000000000000000c";

describe("newsSourceValue", () => {
  it("padrão, todos e outro jogo", () => {
    expect(newsSourceValue({})).toBe("own");
    expect(newsSourceValue({ newsAll: false, newsGameId: null })).toBe("own");
    expect(newsSourceValue({ newsAll: true, newsGameId: ID_B })).toBe("all");
    expect(newsSourceValue({ newsGameId: ID_B })).toBe(ID_B);
    expect(newsSourceValue({ newsGameId: "../x" })).toBe("own");
  });
});

describe("isNewsSource", () => {
  it("aceita só own, all e id bem formado", () => {
    expect(isNewsSource("own")).toBe(true);
    expect(isNewsSource("all")).toBe(true);
    expect(isNewsSource(ID_B)).toBe(true);
    expect(isNewsSource("x y")).toBe(false);
    expect(isNewsSource(undefined)).toBe(false);
  });
});

describe("newsSourceOptions", () => {
  const game = { id: ID_A, name: "Diablo" };
  const games = [game, { id: ID_C, name: "Path of Exile 2" }, { id: ID_B, name: "ARC Raiders" }];

  it("deste jogo, todos e os OUTROS em ordem alfabética", () => {
    expect(newsSourceOptions(game, games, "own").map((option) => option.value)).toEqual(["own", "all", ID_B, ID_C]);
    expect(newsSourceOptions(game, games, "own")[0].label).toContain("Diablo");
  });

  it("jogo gravado que sumiu da lista aparece como removido", () => {
    const options = newsSourceOptions(game, games, "cmabc000000000000000000zz");
    expect(options.at(-1)).toEqual({ value: "cmabc000000000000000000zz", label: "Jogo removido — escolha outro" });
  });
});
