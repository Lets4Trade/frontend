import { beforeEach, describe, expect, it, vi } from "vitest";

const apiPost = vi.fn();
const apiPut = vi.fn();
const apiDelete = vi.fn();
const apiGet = vi.fn();
const role = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/session", () => ({ getSessionRole: () => role() }));
vi.mock("@/lib/serverApi", () => ({
  apiPost: (...args: unknown[]) => apiPost(...args),
  apiPut: (...args: unknown[]) => apiPut(...args),
  apiDelete: (...args: unknown[]) => apiDelete(...args),
  apiGet: (...args: unknown[]) => apiGet(...args),
}));

import { deleteCouponAction, saveCouponAction } from "./actions";
import type { CouponPayload } from "./types";

const INPUT: CouponPayload = {
  code: " teste10 ",
  description: "  ",
  isActive: true,
  kind: "PERCENT",
  value: 1000,
  maxDiscountCents: null,
  minSubtotalCents: null,
  startsAt: null,
  endsAt: null,
  maxUses: null,
  maxUsesPerUser: null,
  gameIds: ["g1", "g1", "bad id!"],
  tabIds: [],
  productIds: [],
  allowCoins: true,
  rewardsOnDiscounted: false,
};

describe("saveCouponAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    role.mockResolvedValue("ADMIN");
    apiPost.mockResolvedValue({ ok: true, data: { id: "c1", code: "TESTE10", kind: "PERCENT", value: 1000 } });
  });

  it("só ADMIN", async () => {
    role.mockResolvedValue("EDITOR");
    expect(await saveCouponAction(null, INPUT)).toEqual({ ok: false, reason: "forbidden" });
    role.mockResolvedValue(null);
    expect(await saveCouponAction(null, INPUT)).toEqual({ ok: false, reason: "unauthenticated" });
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("limpa o que chega (código em maiúsculas, ids únicos e válidos) e cria", async () => {
    const result = await saveCouponAction(null, INPUT);
    expect(result.ok).toBe(true);
    expect(apiPost).toHaveBeenCalledWith(
      "/admin/coupons",
      expect.objectContaining({ code: "TESTE10", description: null, gameIds: ["g1"], rewardsOnDiscounted: false }),
    );
  });

  it("recusa regra inválida sem ir à rede; repassa a mensagem do 409", async () => {
    expect(await saveCouponAction(null, { ...INPUT, value: 0 })).toMatchObject({ ok: false, reason: "invalid" });
    expect(apiPost).not.toHaveBeenCalled();
    apiPut.mockResolvedValue({ ok: false, status: 409, reason: "error", message: "Já existe um cupom com este código." });
    expect(await saveCouponAction("c1", INPUT)).toEqual({
      ok: false,
      reason: "conflict",
      message: "Já existe um cupom com este código.",
    });
  });
});

describe("deleteCouponAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    role.mockResolvedValue("ADMIN");
  });

  it("devolve a mensagem do backend quando o cupom já foi usado", async () => {
    apiDelete.mockResolvedValue({ ok: false, status: 409, reason: "error", message: "Este cupom já foi usado em pedidos." });
    expect(await deleteCouponAction("c1")).toMatchObject({ ok: false, reason: "conflict", message: "Este cupom já foi usado em pedidos." });
    expect(await deleteCouponAction("bad id!")).toMatchObject({ ok: false, reason: "invalid" });
  });
});
