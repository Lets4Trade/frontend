// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSessionRole } from "@/features/auth/session";
import { apiDelete, apiGet, apiPost, apiPut, apiPutFormData } from "@/lib/serverApi";
import { revalidatePath, updateTag } from "next/cache";
import { apiFail, apiOk, bigImage, formEntries, smallImage } from "@/test/actionFixtures";
import { LAYOUT_TAG } from "./layoutContent";
import {
  addSectionItemAction,
  deleteSectionItemAction,
  loadSectionItemsAction,
  publishPageAction,
  removeVideoAction,
  reorderSectionItemsAction,
  resetSectionAction,
  saveItemFieldsAction,
  saveSectionAction,
  saveSectionItemAction,
  saveTabAction,
  saveVideoLinkAction,
  setSectionItemGameAction,
  uploadItemImageAction,
  uploadSectionImageAction,
  videoUploadedAction,
} from "./actions";

vi.mock("@/features/auth/session", () => ({ getSessionRole: vi.fn() }));
vi.mock("@/lib/serverApi", () => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiPutFormData: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));

const role = vi.mocked(getSessionRole);
const del = vi.mocked(apiDelete);
const get = vi.mocked(apiGet);
const post = vi.mocked(apiPost);
const put = vi.mocked(apiPut);
const putForm = vi.mocked(apiPutFormData);

const ALL_APIS = [del, get, post, put, putForm];
const ITEM = { id: "i1", title: "T", isActive: true, imageUrl: null, secondaryImageUrl: null };

function form(fields: Record<string, string | File>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

function expectStoreRevalidated() {
  expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  expect(revalidatePath).toHaveBeenCalledWith("/games", "layout");
  expect(revalidatePath).toHaveBeenCalledWith("/admin/sessoes");
  expect(updateTag).toHaveBeenCalledWith(LAYOUT_TAG);
}

function expectNothingRevalidated() {
  expect(revalidatePath).not.toHaveBeenCalled();
  expect(updateTag).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
  role.mockResolvedValue("ADMIN");
  del.mockResolvedValue(apiOk({ key: "home:hero", id: "i1" }));
  get.mockResolvedValue(apiOk([ITEM]));
  post.mockResolvedValue(apiOk([ITEM]));
  put.mockResolvedValue(apiOk({ page: "home", count: 1 }));
  putForm.mockResolvedValue(apiOk({ ...ITEM, key: "home:hero" }));
});

describe("guarda de papel", () => {
  const calls = [
    ["saveSectionAction", () => saveSectionAction(form({ key: "home:hero" }))],
    ["resetSectionAction", () => resetSectionAction("home:hero")],
    ["saveTabAction", () => saveTabAction(form({ key: "gold" }))],
    ["saveSectionItemAction", () => saveSectionItemAction(form({ sectionKey: "home:faq" }))],
    ["deleteSectionItemAction", () => deleteSectionItemAction("home:faq", "i1")],
    ["reorderSectionItemsAction", () => reorderSectionItemsAction("home:faq", ["i1"])],
    ["loadSectionItemsAction", () => loadSectionItemsAction("home:faq")],
    [
      "publishPageAction",
      () => publishPageAction({ page: "home", texts: {}, order: [] }),
    ],
    [
      "uploadSectionImageAction",
      () => uploadSectionImageAction(form({ key: "home:hero", image: smallImage() })),
    ],
    [
      "saveItemFieldsAction",
      () => saveItemFieldsAction({ sectionKey: "home:faq", id: "i1", fields: {} }),
    ],
    [
      "uploadItemImageAction",
      () =>
        uploadItemImageAction(form({ sectionKey: "home:faq", id: "i1", image: smallImage() })),
    ],
    ["addSectionItemAction", () => addSectionItemAction("home:faq", "item")],
    ["saveVideoLinkAction", () => saveVideoLinkAction("home:video", "https://youtu.be/x")],
    ["removeVideoAction", () => removeVideoAction("home:video")],
    ["videoUploadedAction", () => videoUploadedAction()],
  ] as const;

  it.each(calls)("%s sem sessão → unauthenticated, sem API", async (_n, call) => {
    role.mockResolvedValue(null);
    expect(await call()).toEqual({ ok: false, reason: "unauthenticated" });
    for (const api of ALL_APIS) expect(api).not.toHaveBeenCalled();
    expectNothingRevalidated();
  });

  it.each(calls)("%s não-ADMIN → forbidden, sem API", async (_n, call) => {
    role.mockResolvedValue("USER");
    expect(await call()).toEqual({ ok: false, reason: "forbidden" });
    for (const api of ALL_APIS) expect(api).not.toHaveBeenCalled();
    expectNothingRevalidated();
  });
});

describe("recusa de imagem acima de 5 MB (antes de gastar banda)", () => {
  const TOO_LARGE = {
    ok: false,
    reason: "invalid",
    message: "A imagem precisa ter no máximo 5 MB.",
  };

  it.each([
    ["saveSectionAction", () => saveSectionAction(form({ key: "home:hero", image: bigImage() }))],
    ["saveTabAction (ícone)", () => saveTabAction(form({ key: "gold", icon: bigImage() }))],
    [
      "saveSectionItemAction (arte)",
      () => saveSectionItemAction(form({ sectionKey: "home:faq", image: bigImage() })),
    ],
    [
      "saveSectionItemAction (arte secundária)",
      () => saveSectionItemAction(form({ sectionKey: "home:faq", secondaryImage: bigImage() })),
    ],
    [
      "uploadSectionImageAction",
      () => uploadSectionImageAction(form({ key: "home:hero", image: bigImage() })),
    ],
    [
      "uploadItemImageAction",
      () => uploadItemImageAction(form({ sectionKey: "home:faq", id: "i1", image: bigImage() })),
    ],
  ])("%s", async (_n, call) => {
    expect(await call()).toEqual(TOO_LARGE);
    expect(putForm).not.toHaveBeenCalled();
  });
});

describe("saveSectionAction", () => {
  it("sem chave → invalid, sem API", async () => {
    expect(await saveSectionAction(form({ key: "  " }))).toMatchObject({
      ok: false,
      reason: "invalid",
    });
    expect(putForm).not.toHaveBeenCalled();
  });

  it("caminho feliz: só os campos do SaveSectionDto; ausente vira vazio; extra não viaja", async () => {
    const image = smallImage();
    const result = await saveSectionAction(
      form({ key: "home:hero", title: "Oi", image, extras: '{"x":"y"}', isActive: "false" }),
    );
    expect(result).toMatchObject({ ok: true });

    const [path, body] = putForm.mock.calls[0];
    expect(path).toBe("/admin/sections");
    const entries = formEntries(body);
    expect(Object.keys(entries).sort()).toEqual(
      ["body", "footnote", "image", "key", "subtitle", "title"].sort(),
    );
    expect(entries).toMatchObject({ key: "home:hero", title: "Oi", subtitle: "", body: "" });
    expectStoreRevalidated();
  });

  it.each([
    [401, { ok: false, reason: "unauthenticated" }],
    [400, { ok: false, reason: "invalid", message: "Chave de sessão inválida" }],
    [404, { ok: false, reason: "invalid", message: "Chave de sessão inválida" }],
    [403, { ok: false, reason: "error", message: "Chave de sessão inválida" }],
    [500, { ok: false, reason: "error", message: "Chave de sessão inválida" }],
    [0, { ok: false, reason: "error", message: "Chave de sessão inválida" }],
  ])("status %i → %o, sem revalidar", async (status, expected) => {
    putForm.mockResolvedValue(apiFail(status, "Chave de sessão inválida"));
    expect(await saveSectionAction(form({ key: "home:hero" }))).toEqual(expected);
    expectNothingRevalidated();
  });
});

describe("resetSectionAction", () => {
  it("codifica a chave e revalida", async () => {
    await resetSectionAction("home:hero/../x");
    expect(del).toHaveBeenCalledWith("/admin/sections/home%3Ahero%2F..%2Fx");
    expectStoreRevalidated();
  });
});

describe("saveTabAction", () => {
  it("sem chave → invalid", async () => {
    expect(await saveTabAction(form({}))).toMatchObject({ ok: false, reason: "invalid" });
    expect(putForm).not.toHaveBeenCalled();
  });

  it("só o que veio viaja (trocar rótulo não apaga ícone), e extra não viaja", async () => {
    await saveTabAction(form({ key: "gold", label: "Ouro", slug: "hack" }));
    expect(formEntries(putForm.mock.calls[0][1])).toEqual({ key: "gold", label: "Ouro" });
    expect(putForm.mock.calls[0][0]).toBe("/admin/sections/tabs");
    expectStoreRevalidated();
  });

  it.each(["true", "false"])("isActive %s viaja como veio", async (value) => {
    await saveTabAction(form({ key: "gold", isActive: value }));
    expect(formEntries(putForm.mock.calls[0][1])).toEqual({ key: "gold", isActive: value });
  });

  it.each(["on", "1", ""])("isActive %o fora de true/false → invalid, sem API", async (value) => {
    expect(await saveTabAction(form({ key: "gold", isActive: value }))).toMatchObject({
      ok: false,
      reason: "invalid",
    });
    expect(putForm).not.toHaveBeenCalled();
  });
});

describe("saveSectionItemAction", () => {
  it("sem sectionKey → invalid, sem API", async () => {
    expect(await saveSectionItemAction(form({}))).toMatchObject({ ok: false, reason: "invalid" });
    expect(putForm).not.toHaveBeenCalled();
  });

  it("caminho feliz: campos do SaveSectionItemDto, id só quando existe", async () => {
    await saveSectionItemAction(
      form({ sectionKey: "home:faq", id: "", title: "P?", isActive: "true", position: "9" }),
    );
    const entries = formEntries(putForm.mock.calls[0][1]);
    expect(entries).toEqual({
      sectionKey: "home:faq",
      title: "P?",
      body: "",
      href: "",
      isActive: "true",
    });
    expectStoreRevalidated();
  });

  it("edição com checkbox DESMARCADO (ausente do FormData) manda isActive=false", async () => {
    await saveSectionItemAction(form({ sectionKey: "home:faq", id: "i1", title: "P" }));
    expect(formEntries(putForm.mock.calls[0][1])).toMatchObject({ id: "i1", isActive: "false" });
  });

  it.each(["true", "on"])("edição com checkbox marcado (%s) manda isActive=true", async (value) => {
    await saveSectionItemAction(form({ sectionKey: "home:faq", id: "i1", isActive: value }));
    expect(formEntries(putForm.mock.calls[0][1])).toMatchObject({ isActive: "true" });
  });

  it("valor estranho no checkbox vira false, nunca é repassado cru", async () => {
    await saveSectionItemAction(form({ sectionKey: "home:faq", id: "i1", isActive: "yes" }));
    expect(formEntries(putForm.mock.calls[0][1])).toMatchObject({ isActive: "false" });
  });

  it("cadastro sem checkbox não manda isActive (item novo nasce visível)", async () => {
    await saveSectionItemAction(form({ sectionKey: "home:faq", title: "Novo" }));
    expect(formEntries(putForm.mock.calls[0][1])).not.toHaveProperty("isActive");
  });
});

describe("deleteSectionItemAction / reorderSectionItemsAction / loadSectionItemsAction", () => {
  it("delete codifica id e chave", async () => {
    await deleteSectionItemAction("home:faq", "i/1");
    expect(del).toHaveBeenCalledWith("/admin/section-items/i%2F1?key=home%3Afaq");
    expectStoreRevalidated();
  });

  it("reorder manda só sectionKey e ids", async () => {
    await reorderSectionItemsAction("home:faq", ["b", "a"]);
    expect(post).toHaveBeenCalledWith("/admin/section-items/reorder", {
      sectionKey: "home:faq",
      ids: ["b", "a"],
    });
    expectStoreRevalidated();
  });

  it("load não revalida nada (é leitura)", async () => {
    expect(await loadSectionItemsAction("home:faq")).toMatchObject({ ok: true });
    expect(get).toHaveBeenCalledWith("/admin/section-items?key=home%3Afaq");
    expectNothingRevalidated();
  });

  it("falha do reorder não revalida", async () => {
    post.mockResolvedValue(apiFail(400, "A lista mudou"));
    expect(await reorderSectionItemsAction("home:faq", ["a"])).toEqual({
      ok: false,
      reason: "invalid",
      message: "A lista mudou",
    });
    expectNothingRevalidated();
  });
});

describe("publishPageAction", () => {
  it("rascunho malformado → invalid, sem API", async () => {
    const bad = { page: "home", texts: null, order: [] } as unknown as Parameters<
      typeof publishPageAction
    >[0];
    expect(await publishPageAction(bad)).toMatchObject({ ok: false, reason: "invalid" });
    for (const api of ALL_APIS) expect(api).not.toHaveBeenCalled();
  });

  it("sessão de OUTRA página é recusada antes de gravar", async () => {
    const result = await publishPageAction({
      page: "home",
      texts: { "sobre:hero": { title: "x" } },
      order: [],
    });
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
    expect(putForm).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it("item de OUTRA página é recusado", async () => {
    const result = await publishPageAction({
      page: "home",
      texts: {},
      items: [{ sectionKey: "sobre:faq", id: "i1", fields: { title: "x" } }],
      order: [],
    });
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
    expect(putForm).not.toHaveBeenCalled();
  });

  it("caminho feliz: só campos tocados, extras em JSON, depois a ordem", async () => {
    const result = await publishPageAction({
      page: "home",
      texts: { "home:hero": { title: "Novo", "extra.cta": "Compre", junk: "x" } },
      order: [{ key: "home:hero", hidden: false }],
    });
    expect(result).toEqual({ ok: true, data: { sections: 1, items: 0 } });

    const entries = formEntries(putForm.mock.calls[0][1]);
    expect(entries).toEqual({ key: "home:hero", title: "Novo", extras: '{"cta":"Compre"}' });
    expect(put).toHaveBeenCalledWith("/admin/sections/layout", {
      page: "home",
      items: [{ key: "home:hero", hidden: false }],
    });
    expectStoreRevalidated();
  });

  it("para na primeira sessão que falha e não grava a ordem", async () => {
    putForm.mockResolvedValue(apiFail(0));
    const result = await publishPageAction({
      page: "home",
      texts: { "home:hero": { title: "a" }, "home:faq": { title: "b" } },
      order: [],
    });
    expect(result).toMatchObject({ ok: false, reason: "error" });
    expect(putForm).toHaveBeenCalledTimes(1);
    expect(put).not.toHaveBeenCalled();
    expectNothingRevalidated();
  });
});

describe("uploadSectionImageAction / uploadItemImageAction", () => {
  it("sem imagem → invalid", async () => {
    expect(await uploadSectionImageAction(form({ key: "home:hero" }))).toMatchObject({
      ok: false,
      reason: "invalid",
    });
    expect(await uploadItemImageAction(form({ sectionKey: "home:faq", id: "i1" }))).toMatchObject(
      { ok: false, reason: "invalid" },
    );
    expect(putForm).not.toHaveBeenCalled();
  });

  it("slot secundário grava em secondaryImage", async () => {
    await uploadSectionImageAction(form({ key: "home:hero", slot: "secondary", image: smallImage() }));
    expect(Object.keys(formEntries(putForm.mock.calls[0][1])).sort()).toEqual(
      ["key", "secondaryImage"].sort(),
    );
    expectStoreRevalidated();
  });

  it("campo desconhecido do item cai na arte principal", async () => {
    await uploadItemImageAction(
      form({ sectionKey: "home:faq", id: "i1", field: "passwordHash", image: smallImage() }),
    );
    expect(Object.keys(formEntries(putForm.mock.calls[0][1])).sort()).toEqual(
      ["id", "image", "sectionKey"].sort(),
    );
  });
});

describe("saveItemFieldsAction / addSectionItemAction", () => {
  it("item sem id → invalid", async () => {
    expect(
      await saveItemFieldsAction({ sectionKey: "home:faq", id: "", fields: {} }),
    ).toMatchObject({ ok: false, reason: "invalid" });
    expect(putForm).not.toHaveBeenCalled();
  });

  it("só os campos tocados viajam (o resto não é apagado)", async () => {
    await saveItemFieldsAction({
      sectionKey: "home:faq",
      id: "i1",
      fields: { title: "Nova", isActive: "false" },
    });
    expect(formEntries(putForm.mock.calls[0][1])).toEqual({
      sectionKey: "home:faq",
      id: "i1",
      title: "Nova",
    });
  });

  it("add sem sessão-chave → invalid; com chave cria com rótulo limitado a 120", async () => {
    expect(await addSectionItemAction("", "x")).toMatchObject({ ok: false, reason: "invalid" });
    await addSectionItemAction("home:faq", "y".repeat(200));
    const entries = formEntries(putForm.mock.calls[0][1]);
    expect((entries.title as string).length).toBe(120);
    expectStoreRevalidated();
  });
});

describe("vídeo", () => {
  it("link é aparado e só key+url viajam", async () => {
    await saveVideoLinkAction("home:video", "  https://youtu.be/abc  ");
    expect(put).toHaveBeenCalledWith("/admin/sections/video-link", {
      key: "home:video",
      url: "https://youtu.be/abc",
    });
    expectStoreRevalidated();
  });

  it("remover codifica a chave", async () => {
    await removeVideoAction("home:video");
    expect(del).toHaveBeenCalledWith("/admin/sections/video?key=home%3Avideo");
  });

  it("link recusado (400) → invalid com a mensagem do backend", async () => {
    put.mockResolvedValue(apiFail(400, "Use um link do YouTube"));
    expect(await saveVideoLinkAction("home:video", "http://evil")).toEqual({
      ok: false,
      reason: "invalid",
      message: "Use um link do YouTube",
    });
    expectNothingRevalidated();
  });
});

describe("jogo do item (slides do hero, 2026-09-25)", () => {
  it("saveSectionItemAction repassa gameId quando o formulário tem o campo", async () => {
    await saveSectionItemAction(form({ sectionKey: "home:hero", id: "i1", gameId: "g1", isActive: "true" }));
    expect(formEntries(putForm.mock.calls[0][1])).toMatchObject({ gameId: "g1" });
  });

  it("formulário sem o campo NÃO manda gameId (as outras listas não mexem no vínculo)", async () => {
    await saveSectionItemAction(form({ sectionKey: "home:faq", id: "i1", title: "P" }));
    expect(formEntries(putForm.mock.calls[0][1])).not.toHaveProperty("gameId");
  });

  it("gameId fora do formato é recusado sem API", async () => {
    const result = await saveSectionItemAction(form({ sectionKey: "home:hero", gameId: "../x" }));
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
    expect(putForm).not.toHaveBeenCalled();
  });

  it("setSectionItemGameAction manda SÓ chave, id e gameId", async () => {
    putForm.mockResolvedValue(apiOk({ id: "i1", isActive: true }));
    await setSectionItemGameAction("home:hero", "i1", "g1");
    expect(formEntries(putForm.mock.calls[0][1])).toEqual({ sectionKey: "home:hero", id: "i1", gameId: "g1" });
    expectStoreRevalidated();
  });

  it("setSectionItemGameAction: não-ADMIN e id inválido não chamam a API", async () => {
    role.mockResolvedValue("USER");
    expect((await setSectionItemGameAction("home:hero", "i1", "g1")).ok).toBe(false);
    role.mockResolvedValue("ADMIN");
    expect((await setSectionItemGameAction("home:hero", "i/1", "g1")).ok).toBe(false);
    expect(putForm).not.toHaveBeenCalled();
  });
});
