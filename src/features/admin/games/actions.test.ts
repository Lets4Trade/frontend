// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSessionRole } from "@/features/auth/session";
import { apiDelete, apiPostFormData } from "@/lib/serverApi";
import { revalidatePath, updateTag } from "next/cache";
import { GAMES_MENU_TAG } from "@/features/game/menuGames";
import { apiFail, apiOk, bigImage, formEntries, smallImage } from "@/test/actionFixtures";
import { createGameAction, deactivateGameAction } from "./actions";

vi.mock("@/features/auth/session", () => ({ getSessionRole: vi.fn() }));
vi.mock("@/lib/serverApi", () => ({ apiPostFormData: vi.fn(), apiDelete: vi.fn() }));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }));

const role = vi.mocked(getSessionRole);
const post = vi.mocked(apiPostFormData);

function validForm(extra: Record<string, string | File> = {}): FormData {
  const form = new FormData();
  form.set("name", "  Path of Exile 2  ");
  form.set("platform", "STEAM");
  form.set("productType", "GOLD");
  form.set("servers", "Standard, Hardcore , ,");
  for (const [k, v] of Object.entries(extra)) form.set(k, v);
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  role.mockResolvedValue("ADMIN");
  post.mockResolvedValue(apiOk({ slug: "path-of-exile-2", name: "Path of Exile 2" }));
});

describe("createGameAction", () => {
  it("sem sessão → unauthenticated, sem chamar a API", async () => {
    role.mockResolvedValue(null);
    expect(await createGameAction(validForm())).toEqual({ ok: false, reason: "unauthenticated" });
    expect(post).not.toHaveBeenCalled();
  });

  it("não-ADMIN → forbidden, sem chamar a API", async () => {
    role.mockResolvedValue("USER");
    expect(await createGameAction(validForm())).toEqual({ ok: false, reason: "forbidden" });
    expect(post).not.toHaveBeenCalled();
  });

  it.each([
    ["nome curto", { name: "a" }],
    ["plataforma fora do enum", { platform: "ATARI" }],
    ["tipo fora do enum", { productType: "NFT" }],
    ["servidor longo demais", { servers: "x".repeat(121) }],
  ])("input inválido (%s) → invalid, sem chamar a API", async (_l, extra) => {
    const result = await createGameAction(validForm(extra));
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
    expect(post).not.toHaveBeenCalled();
  });

  it("imagem acima de 5 MB é recusada antes de subir", async () => {
    const result = await createGameAction(validForm({ image: bigImage() }));
    expect(result).toEqual({
      ok: false,
      reason: "invalid",
      message: "A imagem precisa ter no máximo 5 MB.",
    });
    expect(post).not.toHaveBeenCalled();
  });

  it("caminho feliz: monta só os campos do CreateGameDto, e o extra injetado não viaja", async () => {
    const image = smallImage();
    const result = await createGameAction(
      validForm({ image, role: "ADMIN", isActive: "false", createdById: "hack" }),
    );

    expect(result).toEqual({ ok: true, slug: "path-of-exile-2", name: "Path of Exile 2" });
    expect(post).toHaveBeenCalledTimes(1);
    const [path, body] = post.mock.calls[0];
    expect(path).toBe("/admin/games");
    const entries = formEntries(body);
    expect(Object.keys(entries).sort()).toEqual(
      ["image", "name", "platforms", "productTypes", "servers"].sort(),
    );
    expect(entries).toMatchObject({
      name: "Path of Exile 2",
      platforms: "STEAM",
      productTypes: "GOLD",
      servers: "Standard,Hardcore",
    });
    expect((entries.image as File).name).toBe("arte.png");
    expect(updateTag).toHaveBeenCalledWith(GAMES_MENU_TAG);
  });

  it("link escolhido viaja (é campo do DTO desde 2026-09-25); vazio não viaja", async () => {
    await createGameAction(validForm({ slug: " meu-jogo " }));
    expect(formEntries(post.mock.calls[0][1]).slug).toBe("meu-jogo");

    post.mockClear();
    await createGameAction(validForm({ slug: "" }));
    expect(formEntries(post.mock.calls[0][1])).not.toHaveProperty("slug");
  });

  it("409 (link em uso) vira mensagem própria", async () => {
    post.mockResolvedValue(apiFail(409, "texto do backend"));
    const result = await createGameAction(validForm({ slug: "diablo" }));
    expect(result).toEqual({
      ok: false,
      reason: "invalid",
      message: "Esse link já está em uso por outro jogo. Escolha outro.",
    });
  });

  it("sem imagem, o campo nem aparece no corpo", async () => {
    await createGameAction(validForm());
    expect(formEntries(post.mock.calls[0][1])).not.toHaveProperty("image");
  });

  it.each([
    [401, { ok: false, reason: "unauthenticated" }],
    [403, { ok: false, reason: "forbidden" }],
    [
      400,
      {
        ok: false,
        reason: "invalid",
        message: "O servidor recusou os dados enviados. Confira os campos.",
      },
    ],
    [404, { ok: false, reason: "error" }],
    [500, { ok: false, reason: "error" }],
    [0, { ok: false, reason: "error" }],
  ])("status %i da API vira %o, sem invalidar cache", async (status, expected) => {
    post.mockResolvedValue(apiFail(status, "<script>eco do cliente</script>"));
    expect(await createGameAction(validForm())).toEqual(expected);
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("deactivateGameAction", () => {
  const del = vi.mocked(apiDelete);

  it("não-ADMIN é recusado sem chamar a API", async () => {
    role.mockResolvedValue("USER");
    const result = await deactivateGameAction("g1");
    expect(result.ok).toBe(false);
    expect(del).not.toHaveBeenCalled();
  });

  it.each(["../orders", "a/b", "", "x".repeat(101)])("id fora do formato (%j) não vira URL", async (id) => {
    const result = await deactivateGameAction(id);
    expect(result.ok).toBe(false);
    expect(del).not.toHaveBeenCalled();
  });

  it("sucesso: DELETE no id e derruba o cache do menu GAMES", async () => {
    del.mockResolvedValue(apiOk({ id: "g1" }));
    await expect(deactivateGameAction("g1")).resolves.toEqual({ ok: true });
    expect(del).toHaveBeenCalledWith("/admin/games/g1");
    expect(updateTag).toHaveBeenCalledWith(GAMES_MENU_TAG);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/builder");
  });

  it("404 tem mensagem própria e não invalida cache", async () => {
    del.mockResolvedValue(apiFail(404));
    const result = await deactivateGameAction("g1");
    expect(result).toEqual({ ok: false, message: "Este game já não existe." });
    expect(updateTag).not.toHaveBeenCalled();
  });
});
