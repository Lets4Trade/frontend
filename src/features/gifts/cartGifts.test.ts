import { describe, expect, it } from "vitest";
import { cartGifts, formatGift, parseGifts } from "./cartGifts";
import { toOrderGift } from "./orderGift";

const RULE = { gameSlug: "diablo-4", gameName: "Diablo 4", everyCents: 5000, amount: 50_000_000, label: "de Ouro", maxAmount: null };
const SC = { ...RULE, serverSlug: "softcore", serverLabel: "Softcore" };
const HC = { ...RULE, serverSlug: "hardcore", serverLabel: "Hardcore", amount: 20_000_000, everyCents: 2000 };

const line = (gameSlug: string, platform: string, unitPriceCents: number, quantity = 1, serverSlug?: string) => ({
  gameSlug,
  platform,
  unitPriceCents,
  quantity,
  ...(serverSlug ? { serverSlug } : {}),
});

describe("parseGifts", () => {
  it("lê a resposta por servidor (teto ausente = sem teto) e descarta item malformado", () => {
    expect(
      parseGifts([
        { ...RULE, label: " de Ouro ", maxAmount: undefined, serverSlug: "softcore", serverLabel: "Softcore" },
        { ...RULE, serverLabel: "Sem slug" }, // sem servidor: descartado
        { gameSlug: "poe", serverSlug: "std", everyCents: 1000, amount: 10, label: "Divine", maxAmount: 5 }, // teto < um brinde
        { gameSlug: "x", serverSlug: "s", everyCents: 0, amount: 1, label: "a" },
        { gameSlug: "y", serverSlug: "s", everyCents: 100, amount: 1.5, label: "a" },
        { gameSlug: "z", serverSlug: "s", everyCents: 100, amount: 1, label: "" },
        null,
      ]),
    ).toEqual([SC]);
    expect(parseGifts(null)).toEqual([]);
  });
});

describe("formatGift", () => {
  it("abrevia como a aba Gold", () => {
    expect(formatGift(150_000_000, "de Ouro")).toBe("150Mi de Ouro");
    expect(formatGift(2_500_000_000, "Gold")).toBe("2,5Bi Gold");
  });
});

describe("cartGifts — por servidor (2026-11-23)", () => {
  it("cada servidor conta SEPARADO, com a sua regra; servidor sem regra não rende", () => {
    const gifts = cartGifts(
      [
        line("diablo-4", "Softcore", 2490, 2, "softcore"),
        line("poe", "Standard", 9999, 1, "std"),
        line("diablo-4", "Hardcore", 6000, 1, "hardcore"),
        line("diablo-4", "Temporada", 9000, 1, "temporada"), // sem regra
        line("diablo-4", "Softcore", 1000, 1, "softcore"),
      ],
      [SC, HC],
    );
    expect(gifts.map((gift) => [gift.key, gift.serverLabel, gift.paidCents])).toEqual([
      ["diablo-4/softcore", "Softcore", 4980 + 1000],
      ["diablo-4/hardcore", "Hardcore", 6000],
    ]);
    expect(gifts[0].result).toEqual({ amount: 50_000_000, steps: 1, capped: false, missingCents: 4020 });
    expect(gifts[1].result).toMatchObject({ amount: 60_000_000, steps: 3 });
  });

  it("dois servidores com o mesmo nome: casa pelo slug", () => {
    const pc = { ...SC, serverSlug: "standard", serverLabel: "Standard" };
    const xbox = { ...SC, serverSlug: "standard-xbox", serverLabel: "Standard", amount: 1 };
    const [gift] = cartGifts([line("diablo-4", "Standard", 6000, 1, "standard-xbox")], [pc, xbox]);
    expect(gift.key).toBe("diablo-4/standard-xbox");
    expect(gift.result.amount).toBe(1);
  });

  it("carrinho antigo (sem slug): casa pelo rótulo só se ele for único no jogo", () => {
    expect(cartGifts([line("diablo-4", "Softcore", 6000)], [SC, HC])[0].key).toBe("diablo-4/softcore");
    const twin = { ...SC, serverSlug: "softcore-xbox" };
    expect(cartGifts([line("diablo-4", "Softcore", 6000)], [SC, twin])).toEqual([]);
  });

  it("as coins do checkout abatem da base", () => {
    const [gift] = cartGifts(
      [line("diablo-4", "Softcore", 6000, 1, "softcore"), line("diablo-4", "Softcore", 4000, 1, "softcore")],
      [SC],
      [1000, 0],
    );
    expect(gift.paidCents).toBe(9000);
    expect(gift.result.amount).toBe(50_000_000);
  });

  it("abaixo do primeiro passo: brinde zero e quanto falta", () => {
    const [gift] = cartGifts([line("diablo-4", "Softcore", 4000, 1, "softcore")], [SC]);
    expect(gift.result).toMatchObject({ amount: 0, missingCents: 1000 });
  });

  it("sem regras ou carrinho vazio: nada", () => {
    expect(cartGifts([line("diablo-4", "Softcore", 4000, 1, "softcore")], [])).toEqual([]);
    expect(cartGifts([], [SC])).toEqual([]);
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
