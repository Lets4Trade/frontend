import { describe, expect, it } from "vitest";
import { formatPercent, parsePercent, tierProblem, type AdminLoyaltyTier } from "./types";

const base = (): AdminLoyaltyTier[] => [
  { tier: "BRONZE", name: "Bronze", minSpentCents: 0, cashbackBps: 100 },
  { tier: "PRATA", name: "Prata", minSpentCents: 50_000, cashbackBps: 150 },
  { tier: "OURO", name: "Ouro", minSpentCents: 250_000, cashbackBps: 250 },
  { tier: "DIAMANTE", name: "Diamante", minSpentCents: 1_000_000, cashbackBps: 350 },
  { tier: "ADAMANTIUM", name: "Adamantium", minSpentCents: 2_000_000, cashbackBps: 500 },
];

describe("níveis de fidelidade no painel", () => {
  it("percentual: vírgula ou ponto, até 2 casas", () => {
    expect(parsePercent("2,5")).toBe(250);
    expect(parsePercent("1.25%")).toBe(125);
    expect(parsePercent("0")).toBe(0);
    expect(parsePercent("2,555")).toBeNaN();
    expect(parsePercent("abc")).toBeNaN();
    expect(formatPercent(250)).toBe("2,5");
  });

  it("tabela padrão é válida", () => {
    expect(tierProblem(base())).toBeNull();
  });

  it("aponta o campo do primeiro problema", () => {
    const flat = base();
    flat[2].minSpentCents = 50_000;
    expect(tierProblem(flat)).toMatchObject({ index: 2, field: "minSpentCents" });

    const bronze = base();
    bronze[0].minSpentCents = 1;
    expect(tierProblem(bronze)).toMatchObject({ index: 0, field: "minSpentCents" });

    const pct = base();
    pct[1].cashbackBps = Number.NaN;
    expect(tierProblem(pct)).toMatchObject({ index: 1, field: "cashbackBps" });

    const high = base();
    high[4].cashbackBps = 5_001;
    expect(tierProblem(high)).toMatchObject({ index: 4, field: "cashbackBps" });

    const unnamed = base();
    unnamed[3].name = " ";
    expect(tierProblem(unnamed)).toMatchObject({ index: 3, field: "name" });
  });
});
