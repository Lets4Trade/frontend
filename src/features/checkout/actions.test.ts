import { beforeEach, describe, expect, it, vi } from "vitest";

const apiPost = vi.fn();
vi.mock("@/lib/serverApi", () => ({ apiPost: (...args: unknown[]) => apiPost(...args) }));

import { checkoutAction } from "./actions";

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
