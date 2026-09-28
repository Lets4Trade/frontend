import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSessionRole } from "@/features/auth/session";
import { apiGet, apiPost, apiPostFormData, apiPut } from "@/lib/serverApi";
import { revalidatePath } from "next/cache";
import { apiFail, apiOk, bigImage, formEntries, smallImage } from "@/test/actionFixtures";
import {
  listRevisionsAction,
  publishAction,
  resolveRefsAction,
  restoreRevisionAction,
  saveDraftAction,
  uploadPageAssetAction,
} from "./actions";

vi.mock("@/features/auth/session", () => ({ getSessionRole: vi.fn() }));
vi.mock("@/lib/serverApi", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPostFormData: vi.fn(),
  apiPut: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const role = vi.mocked(getSessionRole);
const get = vi.mocked(apiGet);
const post = vi.mocked(apiPost);
const postForm = vi.mocked(apiPostFormData);
const put = vi.mocked(apiPut);

beforeEach(() => {
  vi.clearAllMocks();
  role.mockResolvedValue("ADMIN");
});

describe("guarda de papel", () => {
  it.each([
    [null, "unauthenticated"],
    ["USER", "forbidden"],
  ] as const)("papel %s → %s, sem chamar a API", async (r, reason) => {
    role.mockResolvedValue(r);
    expect(await saveDraftAction("home", [], 0)).toEqual({ ok: false, reason });
    expect(await publishAction("home", 1)).toEqual({ ok: false, reason });
    expect(put).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });

  it("EDITOR edita conteúdo: salva o rascunho", async () => {
    role.mockResolvedValue("EDITOR");
    put.mockResolvedValue(apiOk({ draftRevision: 1, hasUnpublishedChanges: true }));
    expect((await saveDraftAction("home", [], 0)).ok).toBe(true);
  });

  it("resolveRefs de não-admin devolve refs vazias em vez de erro", async () => {
    role.mockResolvedValue("USER");
    expect(await resolveRefsAction([])).toEqual({ games: {}, products: {} });
    expect(post).not.toHaveBeenCalled();
  });
});

describe("slug vai para a URL: formato fechado", () => {
  it.each(["../orders", "Home", "a/b", ""])("slug %j é recusado sem API", async (slug) => {
    expect((await saveDraftAction(slug, [], 0)).ok).toBe(false);
    expect((await listRevisionsAction(slug)).ok).toBe(false);
    expect(put).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
  });

  it("versão de restauração precisa ser inteiro ≥ 1", async () => {
    expect((await restoreRevisionAction("home", 0)).ok).toBe(false);
    expect((await restoreRevisionAction("home", 1.5)).ok).toBe(false);
    expect(post).not.toHaveBeenCalled();
  });
});

describe("rascunho e publicação", () => {
  it("salva com a revisão lida e devolve a nova", async () => {
    put.mockResolvedValue(apiOk({ draftRevision: 4, hasUnpublishedChanges: true }));
    const result = await saveDraftAction("home", [], 3);
    expect(put).toHaveBeenCalledWith("/admin/pages/home/draft", { blocks: [], draftRevision: 3 });
    expect(result).toEqual({ ok: true, data: { draftRevision: 4, hasUnpublishedChanges: true } });
  });

  it("409 vira `conflict` com a mensagem; 400 vira `invalid` com a mensagem do backend", async () => {
    put.mockResolvedValue(apiFail(409, "A página foi alterada em outra aba. Recarregue."));
    expect(await saveDraftAction("home", [], 1)).toMatchObject({ ok: false, reason: "conflict" });

    put.mockResolvedValue(apiFail(400, "Bloco 2 (Perguntas): pergunta 1 está vazia"));
    expect(await saveDraftAction("home", [], 1)).toEqual({
      ok: false,
      reason: "invalid",
      message: "Bloco 2 (Perguntas): pergunta 1 está vazia",
    });
  });

  it("publicar invalida o render da loja só no sucesso", async () => {
    post.mockResolvedValue(apiFail(500));
    await publishAction("home", 2);
    expect(revalidatePath).not.toHaveBeenCalled();

    post.mockResolvedValue(apiOk({ version: 3, publishedAt: "2026-09-25T00:00:00Z" }));
    expect(await publishAction("home", 2)).toMatchObject({ ok: true, data: { version: 3 } });
    expect(post).toHaveBeenLastCalledWith("/admin/pages/home/publish", { draftRevision: 2 });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});

describe("upload de imagem", () => {
  it("recusa acima de 5 MB e sem arquivo, sem chamar a API", async () => {
    const big = new FormData();
    big.set("image", bigImage());
    expect((await uploadPageAssetAction(big)).ok).toBe(false);
    expect((await uploadPageAssetAction(new FormData())).ok).toBe(false);
    expect(postForm).not.toHaveBeenCalled();
  });

  it("repassa SÓ a imagem (campo extra não viaja)", async () => {
    postForm.mockResolvedValue(apiOk({ url: "/uploads/pages/a.webp" }));
    const form = new FormData();
    form.set("image", smallImage());
    form.set("folder", "../../etc");
    const result = await uploadPageAssetAction(form);
    expect(result).toEqual({ ok: true, data: { url: "/uploads/pages/a.webp" } });
    expect(Object.keys(formEntries(postForm.mock.calls[0][1]))).toEqual(["image"]);
  });
});
