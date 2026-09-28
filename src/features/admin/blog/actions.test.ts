// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath, updateTag } from "next/cache";
import { getSessionRole } from "@/features/auth/session";
import { BLOG_TAG } from "@/features/blog/format";
import { apiDelete, apiPatchFormData, apiPostFormData } from "@/lib/serverApi";
import { apiFail, apiOk, bigImage, formEntries, smallImage } from "@/test/actionFixtures";
import { createBlogPostAction, deleteBlogPostAction, updateBlogPostAction } from "./actions";

vi.mock("@/features/auth/session", async () => {
  const actual = await vi.importActual<typeof import("@/features/auth/session")>("@/features/auth/session");
  return { canEditContent: actual.canEditContent, getSessionRole: vi.fn() };
});
vi.mock("@/lib/serverApi", () => ({
  apiPostFormData: vi.fn(),
  apiPatchFormData: vi.fn(),
  apiDelete: vi.fn(),
}));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }));
// `session.ts` importa `next/headers`; o mock acima usa só a função pura.
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

const role = vi.mocked(getSessionRole);
const post = vi.mocked(apiPostFormData);
const patch = vi.mocked(apiPatchFormData);
const del = vi.mocked(apiDelete);

function validForm(extra: Record<string, string | File> = {}): FormData {
  const form = new FormData();
  form.set("title", "  Nova liga de PoE 2  ");
  form.set("slug", "");
  form.set("excerpt", "Resumo curto");
  form.set("body", "## Oi\r\n\r\nTexto");
  form.set("gameId", "none");
  form.set("isPublished", "false");
  form.set("publishedAt", "");
  for (const [k, v] of Object.entries(extra)) form.set(k, v);
  return form;
}

const saved = { id: "cln1abc", slug: "nova-liga-de-poe-2", game: { slug: "path-of-exile-2" } };

beforeEach(() => {
  vi.clearAllMocks();
  role.mockResolvedValue("EDITOR");
  post.mockResolvedValue(apiOk(saved));
  patch.mockResolvedValue(apiOk(saved));
  del.mockResolvedValue(apiOk({}));
});

describe("createBlogPostAction", () => {
  it("sem sessão → unauthenticated, sem chamar a API", async () => {
    role.mockResolvedValue(null);
    expect(await createBlogPostAction(validForm())).toMatchObject({ ok: false, reason: "unauthenticated" });
    expect(post).not.toHaveBeenCalled();
  });

  it("USER → forbidden; EDITOR e ADMIN passam", async () => {
    role.mockResolvedValue("USER");
    expect(await createBlogPostAction(validForm())).toMatchObject({ ok: false, reason: "forbidden" });
    expect(post).not.toHaveBeenCalled();

    role.mockResolvedValue("ADMIN");
    expect(await createBlogPostAction(validForm())).toMatchObject({ ok: true });
  });

  it.each([
    ["título curto", { title: "ab" }, "title"],
    ["título longo", { title: "x".repeat(161) }, "title"],
    ["resumo vazio", { excerpt: "   " }, "excerpt"],
    ["resumo acima de 400", { excerpt: "x".repeat(401) }, "excerpt"],
    ["corpo acima de 50.000", { body: "x".repeat(50_001) }, "body"],
    ["slug fora do formato", { slug: "Com Espaço" }, "slug"],
    ["slug longo", { slug: "a".repeat(121) }, "slug"],
    ["gameId com barra", { gameId: "../users" }, "gameId"],
    ["data inválida", { isPublished: "true", publishedAt: "ontem" }, "publishedAt"],
  ])("inválido (%s) → invalid no campo, sem chamar a API", async (_l, extra, field) => {
    const result = await createBlogPostAction(validForm(extra));
    expect(result).toMatchObject({ ok: false, reason: "invalid", field });
    expect(post).not.toHaveBeenCalled();
  });

  it("capa acima de 5 MB ou de tipo errado é recusada antes de subir", async () => {
    expect(await createBlogPostAction(validForm({ cover: bigImage() }))).toMatchObject({
      ok: false,
      reason: "invalid",
      field: "cover",
      message: "A capa precisa ter no máximo 5 MB.",
    });
    const svg = new File(["<svg/>"], "x.svg", { type: "image/svg+xml" });
    expect(await createBlogPostAction(validForm({ cover: svg }))).toMatchObject({ field: "cover" });
    expect(post).not.toHaveBeenCalled();
  });

  it("multipart só com os campos do contrato; extra injetado não viaja", async () => {
    const cover = smallImage("capa.png");
    const result = await createBlogPostAction(
      validForm({
        cover,
        gameId: "game_1",
        isPublished: "true",
        publishedAt: "2026-09-28T13:00:00.000Z",
        createdById: "hack",
        removeCover: "true",
      }),
    );

    expect(result).toEqual({ ok: true, id: "cln1abc", slug: "nova-liga-de-poe-2" });
    const [path, body] = post.mock.calls[0];
    expect(path).toBe("/admin/blog");
    const entries = formEntries(body);
    expect(Object.keys(entries).sort()).toEqual(
      ["body", "cover", "excerpt", "gameId", "isPublished", "publishedAt", "title"].sort(),
    );
    expect(entries.title).toBe("Nova liga de PoE 2");
    // CRLF do textarea normalizado.
    expect(entries.body).toBe("## Oi\n\nTexto");
    expect(entries.isPublished).toBe("true");
    expect(entries.publishedAt).toBe("2026-09-28T13:00:00.000Z");
    expect((entries.cover as File).name).toBe("capa.png");
  });

  it("rascunho sem jogo: sem gameId, sem publishedAt, sem slug (backend deriva)", async () => {
    await createBlogPostAction(validForm({ publishedAt: "2026-09-28T13:00:00.000Z" }));
    const entries = formEntries(post.mock.calls[0][1]);
    expect(entries).not.toHaveProperty("gameId");
    expect(entries).not.toHaveProperty("publishedAt");
    expect(entries).not.toHaveProperty("slug");
    expect(entries.isPublished).toBe("false");
  });

  it("409 → mensagem de link em uso, no campo slug", async () => {
    post.mockResolvedValue(apiFail(409, "Unique constraint <b>"));
    expect(await createBlogPostAction(validForm())).toEqual({
      ok: false,
      reason: "conflict",
      field: "slug",
      message: "Esse link já está em uso por outra notícia. Escolha outro.",
    });
  });

  it("400 não repassa a mensagem do backend", async () => {
    post.mockResolvedValue(apiFail(400, "<script>eco</script>"));
    const result = await createBlogPostAction(validForm());
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
    expect(JSON.stringify(result)).not.toContain("script");
  });

  it("sucesso derruba a etiqueta do blog e os caminhos afetados", async () => {
    await createBlogPostAction(validForm());
    expect(updateTag).toHaveBeenCalledWith(BLOG_TAG);
    const paths = vi.mocked(revalidatePath).mock.calls.map(([path]) => path);
    expect(paths).toEqual(
      expect.arrayContaining(["/noticias", "/admin/noticias", "/noticias/nova-liga-de-poe-2", "/games/path-of-exile-2"]),
    );
  });

  it("falha de rede → error genérico, sem revalidar", async () => {
    post.mockResolvedValue(apiFail(0));
    expect(await createBlogPostAction(validForm())).toMatchObject({ ok: false, reason: "error" });
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("updateBlogPostAction", () => {
  it("id fora do formato não vai para a URL", async () => {
    expect(await updateBlogPostAction("../users", validForm())).toMatchObject({ ok: false, reason: "invalid" });
    expect(patch).not.toHaveBeenCalled();
  });

  it("PATCH com gameId vazio (tirar o jogo) e removeCover", async () => {
    const result = await updateBlogPostAction("cln1abc", validForm({ removeCover: "true" }));
    expect(result).toEqual({ ok: true, id: "cln1abc", slug: "nova-liga-de-poe-2" });
    const [path, body] = patch.mock.calls[0];
    expect(path).toBe("/admin/blog/cln1abc");
    const entries = formEntries(body);
    expect(entries.gameId).toBe("");
    expect(entries.removeCover).toBe("true");
  });

  it("capa nova vence o removeCover", async () => {
    await updateBlogPostAction("cln1abc", validForm({ removeCover: "true", cover: smallImage() }));
    const entries = formEntries(patch.mock.calls[0][1]);
    expect(entries).toHaveProperty("cover");
    expect(entries).not.toHaveProperty("removeCover");
  });

  it("404 → not_found", async () => {
    patch.mockResolvedValue(apiFail(404));
    expect(await updateBlogPostAction("cln1abc", validForm())).toMatchObject({ ok: false, reason: "not_found" });
  });
});

describe("deleteBlogPostAction", () => {
  it("papel e formato do id conferidos antes da API", async () => {
    role.mockResolvedValue("USER");
    expect(await deleteBlogPostAction("cln1abc")).toMatchObject({ ok: false });
    role.mockResolvedValue("ADMIN");
    expect(await deleteBlogPostAction("a/b")).toEqual({ ok: false, message: "Notícia inválida." });
    expect(del).not.toHaveBeenCalled();
  });

  it("apaga e revalida; 204 sem corpo também é sucesso", async () => {
    expect(await deleteBlogPostAction("cln1abc")).toEqual({ ok: true });
    expect(del).toHaveBeenCalledWith("/admin/blog/cln1abc");
    expect(updateTag).toHaveBeenCalledWith(BLOG_TAG);

    del.mockResolvedValue({ ok: false, status: 204, reason: "error" });
    expect(await deleteBlogPostAction("cln1abc")).toEqual({ ok: true });
  });

  it("404 → mensagem amigável", async () => {
    del.mockResolvedValue(apiFail(404));
    expect(await deleteBlogPostAction("cln1abc")).toEqual({ ok: false, message: "Esta notícia já não existe." });
  });
});
