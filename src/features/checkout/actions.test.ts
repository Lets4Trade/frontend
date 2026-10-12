import { beforeEach, describe, expect, it, vi } from "vitest";

const apiPost = vi.fn();
vi.mock("@/lib/serverApi", () => ({ apiPost: (...args: unknown[]) => apiPost(...args) }));

import { checkoutAction, previewCouponAction } from "./actions";

const ok = {
  ok: true,
  data: {
    payment: { id: "pay1", amountCents: 1000, status: "PENDING", expiresAt: "2026-09-28T00:00:00Z" },
    references: ["R1"],
    count: 1,
  },
};

describe("checkoutAction", () => {
  beforeEach(() => {
    apiPost.mockReset();
    apiPost.mockResolvedValue(ok);
  });

  it("manda a escolha do serviço (só os campos do schema) e o catálogo sem ela", async () => {
    const result = await checkoutAction(
      [
        { productId: "cat", units: 3 },
        {
          productId: "srv",
          units: 1,
          selection: { levelFrom: 1, levelTo: 50, addonIds: ["prioridade"], price: 1 } as never,
        },
      ],
      0,
    );
    expect(result.ok).toBe(true);
    expect(apiPost).toHaveBeenCalledWith("/orders", {
      items: [
        { productId: "cat", units: 3 },
        { productId: "srv", units: 1, selection: { levelFrom: 1, levelTo: 50, addonIds: ["prioridade"] } },
      ],
      coins: 0,
    });
  });

  it("brinde: manda só escolhas que estão no carrinho (2026-10-12)", async () => {
    await checkoutAction([{ productId: "a", units: 1 }, { productId: "b", units: 1 }], 0, ["b", "fora", 7 as never]);
    expect(apiPost).toHaveBeenCalledWith("/orders", {
      items: [
        { productId: "a", units: 1 },
        { productId: "b", units: 1 },
      ],
      coins: 0,
      giftProductIds: ["b"],
    });
  });

  it("recusa serviço com mais de 1 unidade ou escolha inválida, sem chamar a API", async () => {
    expect(await checkoutAction([{ productId: "srv", units: 2, selection: {} }])).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(
      await checkoutAction([{ productId: "srv", units: 1, selection: { quantity: -1 } }]),
    ).toEqual({ ok: false, reason: "invalid" });
    expect(apiPost).not.toHaveBeenCalled();
  });
});

describe("cupom (2026-10-12)", () => {
  beforeEach(() => {
    apiPost.mockReset();
  });

  it("checkout manda o código normalizado; código malformado não vai", async () => {
    apiPost.mockResolvedValue(ok);
    await checkoutAction([{ productId: "a", units: 1 }], 0, [], " dez10 ");
    expect(apiPost.mock.calls[0][1]).toMatchObject({ couponCode: "DEZ10" });
    await checkoutAction([{ productId: "a", units: 1 }], 0, [], "x");
    expect(apiPost.mock.calls[1][1]).not.toHaveProperty("couponCode");
  });

  it("checkout: recusa de cupom no backend vira reason coupon com a mensagem", async () => {
    apiPost.mockResolvedValue({ ok: false, status: 400, reason: "error", message: "Cupom inválido ou expirado." });
    expect(await checkoutAction([{ productId: "a", units: 1 }], 0, [], "DEZ10")).toEqual({
      ok: false,
      reason: "coupon",
      message: "Cupom inválido ou expirado.",
    });
  });

  it("prévia: lê a regra (falso apagado pelo backend = falso) e trata 429 e 401", async () => {
    apiPost.mockResolvedValue({
      ok: true,
      data: { code: "DEZ10", kind: "PERCENT", value: 1000, eligibleProductIds: ["a"], rewardsOnDiscounted: true },
    });
    const res = await previewCouponAction("dez10", [{ productId: "a", units: 2 }]);
    expect(apiPost).toHaveBeenCalledWith("/orders/coupon-preview", { code: "DEZ10", items: [{ productId: "a", units: 2 }] });
    expect(res).toEqual({
      ok: true,
      coupon: {
        code: "DEZ10",
        kind: "PERCENT",
        value: 1000,
        maxDiscountCents: null,
        minSubtotalCents: null,
        allowCoins: false,
        rewardsOnDiscounted: true,
        eligibleProductIds: ["a"],
      },
    });

    apiPost.mockResolvedValue({ ok: false, status: 429, reason: "error" });
    expect(await previewCouponAction("DEZ10", [{ productId: "a", units: 1 }])).toMatchObject({ ok: false, message: /Muitas tentativas/ });
    apiPost.mockResolvedValue({ ok: false, status: 401, reason: "unauthenticated" });
    expect(await previewCouponAction("DEZ10", [{ productId: "a", units: 1 }])).toEqual({ ok: false, reason: "unauthenticated" });
  });
});
