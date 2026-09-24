import { describe, expect, it } from "vitest";
import { formatCount, parseCount } from "./CountUp";

describe("parseCount", () => {
  it("preserva prefixo e sufixo", () => {
    const parsed = parseCount("+4000")!;
    expect(parsed).toMatchObject({ prefix: "+", target: 4000, suffix: "" });
    expect(formatCount(parsed, 1)).toBe("+1");
    expect(formatCount(parsed, 4000)).toBe("+4000");
  });

  it("mantém o ponto de milhar quando o texto usa", () => {
    const parsed = parseCount("4.000+")!;
    expect(parsed.target).toBe(4000);
    expect(formatCount(parsed, 1250)).toBe("1.250+");
  });

  it("não anima texto sem número, nem número ≤ 1", () => {
    expect(parseCount("REFERÊNCIAS")).toBeNull();
    expect(parseCount("+1")).toBeNull();
    expect(parseCount("")).toBeNull();
  });

  it("aceita texto depois do número", () => {
    const parsed = parseCount("+5 anos")!;
    expect(formatCount(parsed, 3)).toBe("+3 anos");
  });
});
