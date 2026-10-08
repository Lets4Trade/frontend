// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSessionRole } from "@/features/auth/session";
import { apiDelete, apiPostFormData, apiPut, apiPutFormData } from "@/lib/serverApi";
import { revalidatePath, updateTag } from "next/cache";
import { GAMES_MENU_TAG } from "@/features/game/menuGames";
import { apiFail, apiOk, bigImage, formEntries, smallImage } from "@/test/actionFixtures";
import {
  removeBannerAction,
  reorderBannersAction,
  savePageAction,
  uploadBannerAction,
  uploadLogoAction,
  type SavePagePayload,
} from "./actions";

vi.mock("@/features/auth/session", () => ({ getSessionRole: vi.fn() }));
vi.mock("@/lib/serverApi", () => ({
  apiDelete: vi.fn(),
  apiPostFormData: vi.fn(),
  apiPut: vi.fn(),
  apiPutFormData: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));

const role = vi.mocked(getSessionRole);
const put = vi.mocked(apiPut);
const putForm = vi.mocked(apiPutFormData);
const postForm = vi.mocked(apiPostFormData);
const del = vi.mocked(apiDelete);

function page(over: Partial<SavePagePayload> = {}): SavePagePayload {
  return {
    name: "  Path of Exile 2 ",
    heading: "Compre Gold",
    serversLabel: "Ligas",
    categoriesLabel: "Categorias",
    descriptionGroups: [
      {
        title: " Sobre o jogo ",
        items: [
          { subtitle: " O que é? ", text: " Texto " },
          { subtitle: "  ", text: "" },
        ],
      },
      { title: " ", items: [{ subtitle: "", text: " " }] },
      { title: "Entrega", items: [] },
    ],
    servers: [
      { id: "s1", label: " Standard " },
      { label: "   " },
      { label: "Hardcore" },
    ],
    categories: [],
    sectionOrder: ["banner", "catalog"],
    ...over,
  };
}

function imageForm(file: File | null): FormData {
  const form = new FormData();
  if (file) form.set("image", file);
  form.set("extra", "injetado");
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  role.mockResolvedValue("ADMIN");
  put.mockResolvedValue(apiOk({ id: "g1", slug: "poe2" }));
  putForm.mockResolvedValue(apiOk({ imageUrl: "https://cdn.example/logo.png" }));
  postForm.mockResolvedValue(apiOk({ id: "b1", imageUrl: "https://cdn.example/b.png" }));
  del.mockResolvedValue(apiOk({ id: "b1" }));
});

describe("guarda de papel (todas as actions)", () => {
  const calls = [
    ["savePageAction", () => savePageAction("g1", page())],
    ["uploadLogoAction", () => uploadLogoAction("g1", imageForm(smallImage()))],
    ["uploadBannerAction", () => uploadBannerAction("g1", imageForm(smallImage()))],
    ["removeBannerAction", () => removeBannerAction("g1", "b1")],
    ["reorderBannersAction", () => reorderBannersAction("g1", ["b1"])],
  ] as const;

  it.each(calls)("%s sem sessão → unauthenticated, sem API", async (_n, call) => {
    role.mockResolvedValue(null);
    expect(await call()).toEqual({ ok: false, reason: "unauthenticated" });
    expect(put).not.toHaveBeenCalled();
    expect(putForm).not.toHaveBeenCalled();
    expect(postForm).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it.each(calls)("%s não-ADMIN → forbidden, sem API", async (_n, call) => {
    role.mockResolvedValue("USER");
    expect(await call()).toEqual({ ok: false, reason: "forbidden" });
    expect(put).not.toHaveBeenCalled();
    expect(putForm).not.toHaveBeenCalled();
    expect(postForm).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });
});

describe("savePageAction", () => {
  it.each([
    ["nome vazio", page({ name: "   " })],
    ["servers que não é lista", { ...page(), servers: "x" } as unknown as SavePagePayload],
    ["corpo nulo", null as unknown as SavePagePayload],
  ])("input inválido (%s) → invalid, sem API", async (_l, payload) => {
    expect(await savePageAction("g1", payload)).toMatchObject({ ok: false, reason: "invalid" });
    expect(put).not.toHaveBeenCalled();
  });

  it("caminho feliz: corpo do SaveGamePageDto, linhas vazias descartadas, extra não viaja", async () => {
    const injected = {
      ...page(),
      isActive: false,
      createdById: "hack",
      // Legado (FASE 5): o backend não aceita mais — não pode viajar.
      productTypes: ["GOLD"],
      servers: [{ id: "s1", label: "A", slug: "x", key: "k" }],
    } as unknown as SavePagePayload;

    const result = await savePageAction("g 1", injected);
    expect(result).toEqual({ ok: true, data: { id: "g1", slug: "poe2" } });

    const [path, body] = put.mock.calls[0];
    expect(path).toBe("/admin/game-page/g%201");
    expect(body).toEqual({
      name: "Path of Exile 2",
      heading: "Compre Gold",
      serversLabel: "Ligas",
      categoriesLabel: "Categorias",
      descriptionGroups: [
        { title: "Sobre o jogo", items: [{ subtitle: "O que é?", text: "Texto" }] },
        { title: "Entrega", items: [] },
      ],
      servers: [{ id: "s1", label: "A" }],
      categories: [],
      sectionOrder: ["banner", "catalog"],
    });
  });

  it("recusa descrição acima dos tetos, sem chamar a API", async () => {
    const tooLongText = page({
      descriptionGroups: [{ title: "T", items: [{ subtitle: "Oi", text: "x".repeat(5001) }] }],
    });
    // 21 textos de 5.000 passam um a um, mas estouram os 100 mil do total.
    const tooMuchTotal = page({
      descriptionGroups: [
        { title: "T", items: Array.from({ length: 21 }, () => ({ subtitle: "S", text: "x".repeat(5000) })) },
      ],
    });
    const tooManyGroups = page({
      descriptionGroups: Array.from({ length: 31 }, (_, i) => ({ title: `T${i}`, items: [] })),
    });

    for (const payload of [tooLongText, tooMuchTotal, tooManyGroups]) {
      expect(await savePageAction("g1", payload)).toMatchObject({ ok: false, reason: "invalid" });
    }
    expect(put).not.toHaveBeenCalled();
  });

  it("apara rótulos e descarta linhas em branco", async () => {
    await savePageAction("g1", page());
    const body = put.mock.calls[0][1] as { servers: unknown[] };
    expect(body.servers).toEqual([
      { id: "s1", label: "Standard" },
      { id: undefined, label: "Hardcore" },
    ]);
  });

  it("categorias viajam em árvore (children sempre presente)", async () => {
    await savePageAction(
      "g1",
      page({
        categories: [
          { id: "c1", label: " Moedas ", children: [{ label: "Ouro" }, { label: " " }] },
          { label: "Itens" },
        ],
      }),
    );
    expect((put.mock.calls[0][1] as { categories: unknown }).categories).toEqual([
      { id: "c1", label: "Moedas", children: [{ id: undefined, label: "Ouro" }] },
      { id: undefined, label: "Itens", children: [] },
    ]);
  });

  it("categoria sem nome com subcategoria → invalid, sem API", async () => {
    const result = await savePageAction(
      "g1",
      page({ categories: [{ label: "", children: [{ label: "Ouro" }] }] }),
    );
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
    expect(put).not.toHaveBeenCalled();
  });

  it("sucesso invalida vitrine, builder, home (slides do hero) e o menu GAMES", async () => {
    await savePageAction("g1", page());
    expect(revalidatePath).toHaveBeenCalledWith("/games/poe2");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/builder", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(updateTag).toHaveBeenCalledWith(GAMES_MENU_TAG);
  });

  it("link (slug) viaja quando preenchido e fica de fora quando vazio", async () => {
    await savePageAction("g1", { ...page(), slug: " poe-2 " });
    expect((put.mock.calls[0][1] as { slug?: string }).slug).toBe("poe-2");

    put.mockClear();
    await savePageAction("g1", { ...page(), slug: "" });
    expect(put.mock.calls[0][1]).not.toHaveProperty("slug");
  });

  it("link acima de 80 é recusado sem chamar a API", async () => {
    const result = await savePageAction("g1", { ...page(), slug: "a".repeat(81) });
    expect(result.ok).toBe(false);
    expect(put).not.toHaveBeenCalled();
  });

  it("409 (link em uso) é recusa de DADO e leva a mensagem do backend", async () => {
    put.mockResolvedValue(apiFail(409, "Esse link já está em uso por outro jogo"));
    const result = await savePageAction("g1", { ...page(), slug: "diablo" });
    expect(result).toEqual({
      ok: false,
      reason: "invalid",
      message: "Esse link já está em uso por outro jogo",
    });
  });

  it.each([
    [401, { ok: false, reason: "unauthenticated" }],
    [400, { ok: false, reason: "invalid", message: "120 produtos ligados" }],
    [403, { ok: false, reason: "error", message: "120 produtos ligados" }],
    [404, { ok: false, reason: "error", message: "120 produtos ligados" }],
    [500, { ok: false, reason: "error", message: "120 produtos ligados" }],
    [0, { ok: false, reason: "error", message: "120 produtos ligados" }],
  ])("status %i → %o (mensagem do backend preservada)", async (status, expected) => {
    put.mockResolvedValue(apiFail(status, "120 produtos ligados"));
    expect(await savePageAction("g1", page())).toEqual(expected);
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe.each([
  ["uploadLogoAction", uploadLogoAction, putForm, "/admin/game-page/g1/logo"],
  ["uploadBannerAction", uploadBannerAction, postForm, "/admin/game-page/g1/banners"],
] as const)("%s", (_name, action, api, path) => {
  it("sem arquivo → invalid, sem API", async () => {
    expect(await action("g1", imageForm(null))).toMatchObject({ ok: false, reason: "invalid" });
    expect(api).not.toHaveBeenCalled();
  });

  it("imagem acima de 5 MB é recusada antes de subir", async () => {
    expect(await action("g1", imageForm(bigImage()))).toEqual({
      ok: false,
      reason: "invalid",
      message: "A imagem precisa ter no máximo 5 MB.",
    });
    expect(api).not.toHaveBeenCalled();
  });

  it("caminho feliz: só a imagem viaja", async () => {
    const result = await action("g1", imageForm(smallImage()));
    expect(result).toMatchObject({ ok: true });
    const [calledPath, body] = api.mock.calls[0];
    expect(calledPath).toBe(path);
    expect(Object.keys(formEntries(body))).toEqual(["image"]);
  });

  it.each([
    [401, "unauthenticated"],
    [400, "invalid"],
    [500, "error"],
    [0, "error"],
  ])("status %i → %s", async (status, reason) => {
    api.mockResolvedValue(apiFail(status));
    expect(await action("g1", imageForm(smallImage()))).toMatchObject({ ok: false, reason });
  });
});

describe("removeBannerAction", () => {
  it("codifica os dois ids no caminho", async () => {
    expect(await removeBannerAction("g/1", "b?1")).toEqual({ ok: true, data: { id: "b1" } });
    expect(del).toHaveBeenCalledWith("/admin/game-page/g%2F1/banners/b%3F1");
  });

  it("falha repassa o motivo", async () => {
    del.mockResolvedValue(apiFail(404, "Banner não encontrado"));
    expect(await removeBannerAction("g1", "b1")).toEqual({
      ok: false,
      reason: "error",
      message: "Banner não encontrado",
    });
  });
});

describe("reorderBannersAction", () => {
  it("manda só os ids, na ordem, para a rota do jogo", async () => {
    put.mockResolvedValue(apiOk({ ids: ["b2", "b1"] }));
    expect(await reorderBannersAction("g 1", ["b2", "b1"])).toEqual({ ok: true, data: { ids: ["b2", "b1"] } });
    expect(put).toHaveBeenCalledWith("/admin/game-page/g%201/banners/order", { ids: ["b2", "b1"] });
  });

  it("lista acima do teto ou com id inválido é recusada sem API", async () => {
    const tooMany = Array.from({ length: 11 }, (_, i) => `b${i}`);
    for (const ids of [tooMany, [""], [42 as unknown as string]]) {
      expect(await reorderBannersAction("g1", ids)).toMatchObject({ ok: false, reason: "invalid" });
    }
    expect(put).not.toHaveBeenCalled();
  });
});
