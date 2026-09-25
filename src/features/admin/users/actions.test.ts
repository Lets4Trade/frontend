// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSessionRole } from "@/features/auth/session";
import { apiDelete, apiGet, apiPatch } from "@/lib/serverApi";
import { revalidatePath } from "next/cache";
import { apiFail, apiOk } from "@/test/actionFixtures";
import {
  deleteUserAction,
  getUserDetailAction,
  updateUserAction,
  type UserEdit,
} from "./actions";

vi.mock("@/features/auth/session", () => ({ getSessionRole: vi.fn() }));
vi.mock("@/lib/serverApi", () => ({ apiDelete: vi.fn(), apiGet: vi.fn(), apiPatch: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));

const role = vi.mocked(getSessionRole);
const get = vi.mocked(apiGet);
const patch = vi.mocked(apiPatch);
const del = vi.mocked(apiDelete);

const EXPIRED = "Sua sessão expirou. Entre de novo para continuar.";
const NO_PERMISSION = "Sua conta não tem permissão para isso.";

function edit(over: Partial<UserEdit> = {}): UserEdit {
  return {
    name: "  Maria Silva ",
    whatsapp: " (11) 99999-0000 ",
    discord: " maria#1 ",
    role: "USER",
    isActive: true,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  role.mockResolvedValue("ADMIN");
  get.mockResolvedValue(apiOk({ id: "u1" }));
  patch.mockResolvedValue(apiOk({}));
  del.mockResolvedValue(apiOk({}));
});

describe("getUserDetailAction", () => {
  it("sem sessão / não-ADMIN não chamam a API", async () => {
    role.mockResolvedValue(null);
    expect(await getUserDetailAction("u1")).toEqual({ ok: false, message: EXPIRED });
    role.mockResolvedValue("USER");
    expect(await getUserDetailAction("u1")).toEqual({ ok: false, message: NO_PERMISSION });
    expect(get).not.toHaveBeenCalled();
  });

  it("id com cara de caminho é recusado", async () => {
    expect(await getUserDetailAction("../orders")).toMatchObject({ ok: false });
    expect(get).not.toHaveBeenCalled();
  });

  it("404 e o resto têm mensagens distintas", async () => {
    get.mockResolvedValue(apiFail(404));
    expect(await getUserDetailAction("u1")).toEqual({
      ok: false,
      message: "Este usuário não existe mais.",
    });
    get.mockResolvedValue(apiFail(0));
    expect(await getUserDetailAction("u1")).toEqual({
      ok: false,
      message: "Não conseguimos carregar os dados agora.",
    });
  });
});

describe("updateUserAction", () => {
  it("sem sessão / não-ADMIN não chamam a API", async () => {
    role.mockResolvedValue(null);
    expect(await updateUserAction("u1", edit())).toEqual({ ok: false, message: EXPIRED });
    role.mockResolvedValue("USER");
    expect(await updateUserAction("u1", edit())).toEqual({ ok: false, message: NO_PERMISSION });
    expect(patch).not.toHaveBeenCalled();
  });

  it.each([
    ["nome curto", edit({ name: "ab" })],
    ["nome acima dos 30 do DTO", edit({ name: "x".repeat(31) })],
    ["nome que não é texto", { ...edit(), name: 42 } as unknown as UserEdit],
    ["isActive como texto", { ...edit(), isActive: "false" } as unknown as UserEdit],
    ["corpo nulo", null as unknown as UserEdit],
  ])("input inválido (%s) → recusa sem API", async (_l, value) => {
    expect(await updateUserAction("u1", value)).toMatchObject({ ok: false });
    expect(patch).not.toHaveBeenCalled();
  });

  it("caminho feliz: só os campos do UpdateUserDto, aparados; credencial injetada não viaja", async () => {
    const injected = { ...edit(), email: "x@y.z", password: "p", passwordHash: "h" } as UserEdit;
    expect(await updateUserAction("u1", injected)).toEqual({ ok: true });
    expect(patch).toHaveBeenCalledWith("/admin/users/u1", {
      name: "Maria Silva",
      whatsapp: "(11) 99999-0000",
      discord: "maria#1",
      role: "USER",
      isActive: true,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/usuarios");
  });

  it("WhatsApp e Discord vazios viajam como \"\" — é assim que se APAGA o campo", async () => {
    await updateUserAction("u1", edit({ whatsapp: "   ", discord: "" }));
    const body = patch.mock.calls[0][1] as Record<string, unknown>;
    expect(body.whatsapp).toBe("");
    expect(body.discord).toBe("");
  });

  it.each([
    [403, "Ação bloqueada"],
    [409, "Este nome já está em uso"],
    [400, "Confira os campos"],
    [404, "Este usuário não existe mais."],
    [500, "Não conseguimos salvar agora"],
    [0, "Não conseguimos salvar agora"],
  ])("status %i → mensagem própria, sem revalidar", async (status, text) => {
    patch.mockResolvedValue(apiFail(status, "texto do backend"));
    const result = await updateUserAction("u1", edit());
    expect(result).toMatchObject({ ok: false, message: expect.stringContaining(text) });
    expect(JSON.stringify(result)).not.toContain("texto do backend");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("deleteUserAction", () => {
  it("sem sessão / não-ADMIN / id inválido não chamam a API", async () => {
    role.mockResolvedValue(null);
    expect(await deleteUserAction("u1")).toEqual({ ok: false, message: EXPIRED });
    role.mockResolvedValue("USER");
    expect(await deleteUserAction("u1")).toEqual({ ok: false, message: NO_PERMISSION });
    role.mockResolvedValue("ADMIN");
    expect(await deleteUserAction("u1?x=1")).toMatchObject({ ok: false });
    expect(del).not.toHaveBeenCalled();
  });

  it("caminho feliz chama DELETE e revalida", async () => {
    expect(await deleteUserAction("u1")).toEqual({ ok: true });
    expect(del).toHaveBeenCalledWith("/admin/users/u1");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/usuarios");
  });

  it("403 (último admin) explica a trava", async () => {
    del.mockResolvedValue(apiFail(403));
    expect(await deleteUserAction("u1")).toMatchObject({
      ok: false,
      message: expect.stringContaining("Ação bloqueada"),
    });
  });
});
