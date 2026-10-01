// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { MAX_HISTORY, normalizeHistory, readHistory, withTerm, writeHistory } from "./searchHistory";

describe("histórico de busca", () => {
  beforeEach(() => window.localStorage.clear());

  it("mais recente primeiro, sem repetir (ignora maiúscula) e com teto", () => {
    let history: string[] = [];
    for (const term of ["divine", "gold", "Divine", "a", "  chaos   orb "]) history = withTerm(history, term);
    expect(history).toEqual(["chaos orb", "Divine", "gold"]);
    const many = Array.from({ length: 10 }, (_, index) => `termo ${index}`);
    expect(normalizeHistory(many)).toHaveLength(MAX_HISTORY);
  });

  it("lixo no armazenamento vira lista vazia", () => {
    window.localStorage.setItem("lets4trade:busca-recente", "{nao é json");
    expect(readHistory()).toEqual([]);
    expect(normalizeHistory({})).toEqual([]);
    expect(normalizeHistory([1, null, "ok"])).toEqual(["ok"]);
  });

  it("grava e lê; lista vazia apaga a chave", () => {
    writeHistory(["gold"]);
    expect(readHistory()).toEqual(["gold"]);
    writeHistory([]);
    expect(window.localStorage.getItem("lets4trade:busca-recente")).toBeNull();
  });
});
