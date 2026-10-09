import { describe, expect, it } from "vitest";
import { estimateCashback, formatBps } from "./cashback";

describe("estimateCashback", () => {
  it("1% em R$ 100 = 100 Lets Coins (1 coin = 1 centavo)", () => {
    expect(estimateCashback([{ unitPriceCents: 10_000, quantity: 1 }], 100)).toEqual({ coins: 100, cents: 100 });
  });

  it("arredonda POR LINHA (cada linha é um pedido), como o backend", () => {
    // 1,5% de R$ 3,90 = 5,85 → 5; duas linhas → 10 (arredondar o total daria 11).
    const items = [
      { unitPriceCents: 390, quantity: 1 },
      { unitPriceCents: 390, quantity: 1 },
    ];
    expect(estimateCashback(items, 150)).toEqual({ coins: 10, cents: 10 });
  });

  it("a linha vale preço × quantidade", () => {
    expect(estimateCashback([{ unitPriceCents: 2_490, quantity: 3 }], 250)).toEqual({ coins: 186, cents: 186 });
  });

  it("cotação diferente de 1 centavo e casos vazios", () => {
    expect(estimateCashback([{ unitPriceCents: 10_000, quantity: 1 }], 100, 10)).toEqual({ coins: 10, cents: 100 });
    expect(estimateCashback([], 100)).toEqual({ coins: 0, cents: 0 });
    expect(estimateCashback([{ unitPriceCents: 10_000, quantity: 1 }], 0)).toEqual({ coins: 0, cents: 0 });
  });
});

describe("formatBps", () => {
  it("formata em pt-BR", () => {
    expect(formatBps(100)).toBe("1%");
    expect(formatBps(150)).toBe("1,5%");
    expect(formatBps(250)).toBe("2,5%");
  });
});
