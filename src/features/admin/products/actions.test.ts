// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSessionRole } from "@/features/auth/session";
import { apiDelete, apiPatchFormData, apiPostFormData, apiPut } from "@/lib/serverApi";
import { revalidatePath } from "next/cache";
import { apiFail, apiOk, bigImage, formEntries, smallImage } from "@/test/actionFixtures";
import {
  createProductAction,
  deleteProductAction,
  saveProductOrderAction,
  updateProductAction,
} from "./actions";

vi.mock("@/features/auth/session", () => ({ getSessionRole: vi.fn() }));
vi.mock("@/lib/serverApi", () => ({
  apiDelete: vi.fn(),
  apiPatchFormData: vi.fn(),
  apiPostFormData: vi.fn(),
  apiPut: vi.fn(),
}));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }));

const role = vi.mocked(getSessionRole);
const post = vi.mocked(apiPostFormData);
const patch = vi.mocked(apiPatchFormData);
const del = vi.mocked(apiDelete);
const put = vi.mocked(apiPut);

const CREATED = apiOk({ name: "500M Divine", game: { name: "Path of Exile 2" } });

function productForm(extra: Record<string, string | File> = {}): FormData {
  const form = new FormData();
  form.set("gameId", "game1");
  form.set("name", " 500M Divine ");
  form.set("priceCents", "5000");
  form.set("platform", "STEAM");
  form.set("productType", "GOLD");
  form.set("serverId", "srv1");
  form.set("categoryId", "");
  for (const [k, v] of Object.entries(extra)) form.set(k, v);
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  role.mockResolvedValue("ADMIN");
  post.mockResolvedValue(CREATED);
  patch.mockResolvedValue(CREATED);
  del.mockResolvedValue(apiOk({ id: "p1" }));
  put.mockResolvedValue(apiOk({ count: 2 }));
});

describe("createProductAction", () => {
  it("sem sessão → unauthenticated, sem API", async () => {
    role.mockResolvedValue(null);
    expect(await createProductAction(productForm())).toEqual({ ok: false, reason: "unauthenticated" });
    expect(post).not.toHaveBeenCalled();
  });

  it("não-ADMIN → forbidden, sem API", async () => {
    role.mockResolvedValue("USER");
    expect(await createProductAction(productForm())).toEqual({ ok: false, reason: "forbidden" });
    expect(post).not.toHaveBeenCalled();
  });

  it.each([
    ["sem jogo", { gameId: "" }],
    ["nome curto", { name: "x" }],
    ["preço zero", { priceCents: "0" }],
    ["preço fracionado", { priceCents: "10.5" }],
    ["preço acima do teto", { priceCents: "10000001" }],
    ["preço não numérico", { priceCents: "abc" }],
    ["sem plataforma", { platform: "" }],
    ["sem tipo", { productType: "" }],
  ])("input inválido (%s) → invalid, sem API", async (_l, extra) => {
    expect(await createProductAction(productForm(extra))).toMatchObject({
      ok: false,
      reason: "invalid",
    });
    expect(post).not.toHaveBeenCalled();
  });

  it("imagem acima de 5 MB é recusada", async () => {
    expect(await createProductAction(productForm({ image: bigImage() }))).toEqual({
      ok: false,
      reason: "invalid",
      message: "A imagem precisa ter no máximo 5 MB.",
    });
    expect(post).not.toHaveBeenCalled();
  });

  it("caminho feliz: só campos do CreateProductDto, priceCents inteiro, extra não viaja", async () => {
    const result = await createProductAction(
      productForm({ image: smallImage(), isActive: "false", position: "1", slug: "x" }),
    );
    expect(result).toEqual({ ok: true, name: "500M Divine", gameName: "Path of Exile 2" });

    const [path, body] = post.mock.calls[0];
    expect(path).toBe("/admin/products");
    const entries = formEntries(body);
    // `categoryId` vazio não viaja.
    expect(Object.keys(entries).sort()).toEqual(
      ["gameId", "image", "name", "platform", "priceCents", "productType", "serverId"].sort(),
    );
    expect(entries).toMatchObject({
      gameId: "game1",
      name: "500M Divine",
      priceCents: "5000",
      platform: "STEAM",
      productType: "GOLD",
      serverId: "srv1",
    });
    expect(Number.isInteger(Number(entries.priceCents))).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/produtos");
  });

  it.each([
    [401, { ok: false, reason: "unauthenticated" }],
    [403, { ok: false, reason: "forbidden" }],
    [400, { ok: false, reason: "invalid" }],
    [404, { ok: false, reason: "invalid" }],
    [500, { ok: false, reason: "error" }],
    [0, { ok: false, reason: "error" }],
  ])("status %i → %o, e a mensagem do backend não é ecoada", async (status, expected) => {
    post.mockResolvedValue(apiFail(status, "eco <b>do cliente</b>"));
    const result = await createProductAction(productForm());
    expect(result).toMatchObject(expected);
    expect(JSON.stringify(result)).not.toContain("eco");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateProductAction", () => {
  it("sem sessão / não-ADMIN não chamam a API", async () => {
    role.mockResolvedValue(null);
    expect(await updateProductAction("p1", productForm())).toEqual({
      ok: false,
      reason: "unauthenticated",
    });
    role.mockResolvedValue("USER");
    expect(await updateProductAction("p1", productForm())).toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(patch).not.toHaveBeenCalled();
  });

  it("id com cara de caminho é recusado sem API", async () => {
    expect(await updateProductAction("../orders", productForm())).toMatchObject({
      ok: false,
      reason: "invalid",
    });
    expect(patch).not.toHaveBeenCalled();
  });

  it("input inválido → invalid, sem API", async () => {
    expect(await updateProductAction("p1", productForm({ priceCents: "-3" }))).toMatchObject({
      ok: false,
      reason: "invalid",
    });
    expect(patch).not.toHaveBeenCalled();
  });

  it("imagem acima de 5 MB é recusada", async () => {
    expect(await updateProductAction("p1", productForm({ image: bigImage() }))).toMatchObject({
      ok: false,
      reason: "invalid",
      message: "A imagem precisa ter no máximo 5 MB.",
    });
    expect(patch).not.toHaveBeenCalled();
  });

  it("caminho feliz: gameId NÃO viaja (UpdateProductDto o omite), sem imagem mantém a arte", async () => {
    const result = await updateProductAction("p1", productForm({ categoryId: "cat1" }));
    expect(result).toEqual({ ok: true, name: "500M Divine", gameName: "Path of Exile 2" });

    const [path, body] = patch.mock.calls[0];
    expect(path).toBe("/admin/products/p1");
    const entries = formEntries(body);
    expect(entries).not.toHaveProperty("gameId");
    expect(entries).not.toHaveProperty("image");
    expect(entries).toMatchObject({ priceCents: "5000", serverId: "srv1", categoryId: "cat1" });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/produtos");
  });

  it("servidor e categoria VAZIOS viajam como \"\" — é assim que o PATCH remove", async () => {
    await updateProductAction("p1", productForm({ serverId: "", categoryId: "" }));
    const entries = formEntries(patch.mock.calls[0][1]);
    expect(entries).toHaveProperty("serverId", "");
    expect(entries).toHaveProperty("categoryId", "");
  });

  it("no CADASTRO, vazio continua não viajando", async () => {
    await createProductAction(productForm({ serverId: "", categoryId: "" }));
    const entries = formEntries(post.mock.calls[0][1]);
    expect(entries).not.toHaveProperty("serverId");
    expect(entries).not.toHaveProperty("categoryId");
  });

  it.each([
    [401, "unauthenticated"],
    [403, "forbidden"],
    [400, "invalid"],
    [404, "invalid"],
    [500, "error"],
    [0, "error"],
  ])("status %i → %s", async (status, reason) => {
    patch.mockResolvedValue(apiFail(status));
    expect(await updateProductAction("p1", productForm())).toMatchObject({ ok: false, reason });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("deleteProductAction", () => {
  it.each([[null], ["USER" as const]])("sessão %s não chama a API", async (r) => {
    role.mockResolvedValue(r);
    expect(await deleteProductAction("p1")).toMatchObject({ ok: false });
    expect(del).not.toHaveBeenCalled();
  });

  it("id inválido não chama a API", async () => {
    expect(await deleteProductAction("a/b")).toMatchObject({ ok: false });
    expect(del).not.toHaveBeenCalled();
  });

  it("caminho feliz chama DELETE e revalida a listagem", async () => {
    expect(await deleteProductAction("p1")).toEqual({ ok: true });
    expect(del).toHaveBeenCalledWith("/admin/products/p1");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/produtos");
  });

  it.each([
    [404, "Este produto já não existe."],
    [403, "Não conseguimos excluir agora. Tente novamente em instantes."],
    [500, "Não conseguimos excluir agora. Tente novamente em instantes."],
    [0, "Não conseguimos excluir agora. Tente novamente em instantes."],
  ])("status %i → mensagem própria", async (status, message) => {
    del.mockResolvedValue(apiFail(status));
    expect(await deleteProductAction("p1")).toEqual({ ok: false, message });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("saveProductOrderAction", () => {
  it.each([[null], ["USER" as const]])("sessão %s não chama a API", async (r) => {
    role.mockResolvedValue(r);
    expect(await saveProductOrderAction("g1", "GOLD", ["a"])).toMatchObject({ ok: false });
    expect(put).not.toHaveBeenCalled();
  });

  it.each([
    ["lista vazia", []],
    ["acima de 300", Array.from({ length: 301 }, (_, i) => `p${i}`)],
    ["id que não é texto", [1, 2] as unknown as string[]],
  ])("lista inválida (%s) → recusa sem API", async (_l, ids) => {
    expect(await saveProductOrderAction("g1", "GOLD", ids)).toEqual({
      ok: false,
      message: "Lista de produtos inválida.",
    });
    expect(put).not.toHaveBeenCalled();
  });

  it("caminho feliz manda só gameId, type e ids", async () => {
    expect(await saveProductOrderAction("g1", "GOLD", ["b", "a"])).toEqual({ ok: true });
    expect(put).toHaveBeenCalledWith("/admin/products/order", {
      gameId: "g1",
      type: "GOLD",
      ids: ["b", "a"],
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/produtos");
  });

  it("400 repassa a mensagem do backend (é acionável); o resto vira genérico", async () => {
    put.mockResolvedValue(apiFail(400, "Produto p9 não é deste jogo"));
    expect(await saveProductOrderAction("g1", "GOLD", ["p9"])).toEqual({
      ok: false,
      message: "Produto p9 não é deste jogo",
    });
    put.mockResolvedValue(apiFail(0));
    expect(await saveProductOrderAction("g1", "GOLD", ["p9"])).toMatchObject({
      ok: false,
      message: expect.stringContaining("Não conseguimos salvar a ordem"),
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
