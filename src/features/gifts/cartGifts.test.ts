import { describe, expect, it } from "vitest";
import { cartGifts, formatGift, parseGifts } from "./cartGifts";
import { toOrderGift } from "./orderGift";

const D4 = { gameSlug: "diablo-4", gameName: "Diablo 4", everyCents: 5000, amount: 50_000_000, label: "de Ouro", maxAmount: null };

const line = (productId: string, gameSlug: string, platform: string, unitPriceCents: number, quantity = 1) => ({
  productId,
  gameSlug,
  platform,
  unitPriceCents,
  quantity,
});

describe("parseGifts", () => {
  it("lê a resposta (teto ausente = sem teto) e descarta item malformado", () => {
    expect(
      parseGifts([
        { gameSlug: "diablo-4", gameName: "Diablo 4", everyCents: 5000, amount: 50_000_000, label: " de Ouro " },
        { gameSlug: "poe", everyCents: 1000, amount: 10, label: "Divine", maxAmount: 5 }, // teto < um brinde
        { gameSlug: "x", everyCents: 0, amount: 1, label: "a" },
        { gameSlug: "y", everyCents: 100, amount: 1.5, label: "a" },
        { gameSlug: "z", everyCents: 100, amount: 1, label: "" },
        null,
      ]),
    ).toEqual([D4]);
    expect(parseGifts(null)).toEqual([]);
  });
});

describe("formatGift", () => {
  it("abrevia como a aba Gold", () => {
    expect(formatGift(150_000_000, "de Ouro")).toBe("150Mi de Ouro");
    expect(formatGift(2_500_000_000, "Gold")).toBe("2,5Bi Gold");
  });
});

describe("cartGifts", () => {
  it("soma as linhas do jogo, acumula a cada passo e lista os servidores", () => {
    const [gift, ...rest] = cartGifts(
      [
        line("gold-sc", "diablo-4", "Softcore", 2490, 2),
        line("poe-x", "poe", "Standard", 9999),
        line("gold-hc", "diablo-4", "Hardcore", 6000),
        line("gold-sc-2", "diablo-4", "Softcore", 1000),
      ],
      [D4],
    );
    expect(rest).toEqual([]); // PoE sem regra
    expect(gift.paidCents).toBe(4980 + 6000 + 1000);
    expect(gift.result).toEqual({ amount: 100_000_000, steps: 2, capped: false, missingCents: 3020 });
    expect(gift.servers).toEqual([
      { productId: "gold-sc", label: "Softcore" },
      { productId: "gold-hc", label: "Hardcore" },
    ]);
  });

  it("as coins do checkout abatem da base", () => {
    const [gift] = cartGifts([line("a", "diablo-4", "SC", 6000), line("b", "diablo-4", "SC", 4000)], [D4], [1000, 0]);
    expect(gift.paidCents).toBe(9000);
    expect(gift.result.amount).toBe(50_000_000);
  });

  it("abaixo do primeiro passo: brinde zero e quanto falta", () => {
    const [gift] = cartGifts([line("a", "diablo-4", "SC", 4000)], [D4]);
    expect(gift.result).toMatchObject({ amount: 0, missingCents: 1000 });
  });

  it("sem regras ou carrinho vazio: nada", () => {
    expect(cartGifts([line("a", "diablo-4", "SC", 4000)], [])).toEqual([]);
    expect(cartGifts([], [D4])).toEqual([]);
  });
});

describe("toOrderGift", () => {
  it("lê o brinde congelado no pedido e recusa formato estranho", () => {
    expect(toOrderGift({ amount: 150_000_000, label: "de Ouro", server: "Softcore", everyCents: 5000 })).toEqual({
      text: "150Mi de Ouro",
      server: "Softcore",
    });
    expect(toOrderGift({ amount: "150", label: "de Ouro" })).toBeNull();
    expect(toOrderGift({ amount: 10, label: "" })).toBeNull();
    expect(toOrderGift(null)).toBeNull();
  });
});
