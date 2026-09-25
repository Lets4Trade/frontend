// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSessionRole } from "@/features/auth/session";
import { apiPatch } from "@/lib/serverApi";
import { revalidatePath } from "next/cache";
import { apiFail, apiOk } from "@/test/actionFixtures";
import { updateOrderAction } from "./actions";

vi.mock("@/features/auth/session", () => ({ getSessionRole: vi.fn() }));
vi.mock("@/lib/serverApi", () => ({ apiPatch: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));

const role = vi.mocked(getSessionRole);
const patch = vi.mocked(apiPatch);
const ORDER = { id: "o1", status: "DELIVERED", assigneeId: null, assigneeName: null };

beforeEach(() => {
  vi.clearAllMocks();
  role.mockResolvedValue("ADMIN");
  patch.mockResolvedValue(apiOk(ORDER));
});

describe("updateOrderAction", () => {
  it("sem sessão → unauthenticated, sem API", async () => {
    role.mockResolvedValue(null);
    expect(await updateOrderAction("o1", { status: "PAID" })).toEqual({
      ok: false,
      reason: "unauthenticated",
    });
    expect(patch).not.toHaveBeenCalled();
  });

  it("não-ADMIN → forbidden, sem API", async () => {
    role.mockResolvedValue("USER");
    expect(await updateOrderAction("o1", { status: "PAID" })).toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(patch).not.toHaveBeenCalled();
  });

  it.each([
    ["id vazio", "", { status: "PAID" }],
    ["id com cara de caminho", "../users/u1", { status: "PAID" }],
    ["id longo demais", "x".repeat(101), { status: "PAID" }],
    ["patch nulo", "o1", null],
    ["nada para alterar", "o1", {}],
  ])("input inválido (%s) → invalid, sem API", async (_l, id, body) => {
    expect(
      await updateOrderAction(id, body as { status?: string; assigneeId?: string | null }),
    ).toMatchObject({ ok: false, reason: "invalid" });
    expect(patch).not.toHaveBeenCalled();
  });

  it("só o que veio viaja: status sozinho não apaga o atendente", async () => {
    const injected = { status: "PAID", totalCents: 1, userId: "hack" } as { status: string };
    expect(await updateOrderAction("o1", injected)).toEqual({ ok: true, order: ORDER });
    expect(patch).toHaveBeenCalledWith("/admin/orders/o1", { status: "PAID" });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/pedidos");
  });

  it("assigneeId null viaja como null (desatribuir)", async () => {
    await updateOrderAction("o1", { assigneeId: null });
    expect(patch).toHaveBeenCalledWith("/admin/orders/o1", { assigneeId: null });
  });

  it.each([
    [401, { ok: false, reason: "unauthenticated" }],
    [403, { ok: false, reason: "forbidden" }],
    [400, { ok: false, reason: "invalid", message: "Atendente não encontrado" }],
    [404, { ok: false, reason: "invalid", message: "Atendente não encontrado" }],
    [500, { ok: false, reason: "error", message: "Atendente não encontrado" }],
    [0, { ok: false, reason: "error" }],
  ])("status %i → %o", async (status, expected) => {
    patch.mockResolvedValue(apiFail(status, status === 0 ? undefined : "Atendente não encontrado"));
    expect(await updateOrderAction("o1", { status: "PAID" })).toEqual(
      status === 0 ? { ...expected, message: undefined } : expected,
    );
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
