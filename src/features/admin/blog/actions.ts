"use server";

import { revalidatePath, updateTag } from "next/cache";
import { canEditContent, getSessionRole } from "@/features/auth/session";
import { BLOG_TAG } from "@/features/blog/format";
import { apiDelete, apiPatchFormData, apiPostFormData, type ApiResult } from "@/lib/serverApi";
import { blogPostSchema, coverProblem, ID_RE, readBlogForm, type BlogPostField } from "./schema";

/**
 * Escritas do painel de notícias (`/admin/noticias`) — contrato blog.md.
 *
 * Mesmo desenho das actions de jogo/produto:
 *   - PAPEL conferido aqui também (ADMIN ou EDITOR — notícia é conteúdo):
 *     server action é um ENDEREÇO PÚBLICO e não passa pelo layout do painel.
 *     A autorização de verdade é o `RolesGuard` do backend.
 *   - O `FormData` NÃO é reencaminhado como veio: um novo é montado só com os
 *     campos do contrato, depois do zod. Campo injetado na página não viaja.
 *   - Id conferido por formato antes de entrar no caminho da URL (um `../`
 *     viraria outra rota do backend com a sessão de quem administra).
 *   - Mensagem do backend NÃO é repassada no 400: pode ecoar o que foi
 *     digitado. As mensagens são nossas, em português.
 */

export type BlogActionResult =
  | { ok: true; id: string; slug: string }
  | {
      ok: false;
      reason: "unauthenticated" | "forbidden" | "invalid" | "conflict" | "not_found" | "error";
      message: string;
      /** Campo culpado, quando dá para apontar (a tela marca o campo). */
      field?: BlogPostField | "cover";
    };

type SavedPost = { id?: unknown; slug?: unknown; game?: { slug?: unknown } | null };

const MESSAGES = {
  unauthenticated: "Sua sessão expirou. Entre de novo para continuar.",
  forbidden: "Sua conta não tem permissão para editar notícias.",
  conflict: "Esse link já está em uso por outra notícia. Escolha outro.",
  invalid: "O servidor recusou os dados enviados. Confira os campos.",
  notFound: "Esta notícia não existe mais.",
  error: "Não conseguimos salvar agora. Tente novamente em instantes.",
} as const;

type Failure = Extract<BlogActionResult, { ok: false }>;

async function guard(): Promise<Failure | null> {
  const role = await getSessionRole();
  if (role === null) return { ok: false, reason: "unauthenticated", message: MESSAGES.unauthenticated };
  if (!canEditContent(role)) return { ok: false, reason: "forbidden", message: MESSAGES.forbidden };
  return null;
}

/**
 * Valida e monta o multipart. `mode` decide o que só existe na edição
 * (`removeCover`, e mandar `gameId` vazio para DESLIGAR o jogo).
 */
function buildPayload(form: FormData, mode: "create" | "update"): FormData | Failure {
  const parsed = blogPostSchema.safeParse(readBlogForm(form));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      reason: "invalid",
      message: issue?.message ?? "Confira os campos e tente de novo.",
      field: issue?.path[0] as BlogPostField | undefined,
    };
  }

  const cover = form.get("cover");
  const problem = coverProblem(cover);
  if (problem) return { ok: false, reason: "invalid", message: problem, field: "cover" };

  const data = parsed.data;
  const payload = new FormData();
  payload.set("title", data.title);
  // Vazio: o backend deriva do título.
  if (data.slug !== "") payload.set("slug", data.slug);
  payload.set("excerpt", data.excerpt);
  payload.set("body", data.body);
  // Na criação, sem jogo = campo ausente. Na edição, vazio = "tirar o jogo"
  // (PATCH parcial: ausente significaria "não mexer").
  if (data.gameId !== "" || mode === "update") payload.set("gameId", data.gameId);
  payload.set("isPublished", String(data.isPublished));
  // Publicar sem data: o backend usa "agora" (contrato). Rascunho não leva data.
  if (data.isPublished && data.publishedAt !== "") {
    payload.set("publishedAt", new Date(data.publishedAt).toISOString());
  }

  if (cover instanceof File && cover.size > 0) {
    payload.set("cover", cover, cover.name);
  } else if (mode === "update" && form.get("removeCover") === "true") {
    payload.set("removeCover", "true");
  }

  return payload;
}

function failureFrom(response: Extract<ApiResult<unknown>, { ok: false }>): Failure {
  if (response.reason === "unauthenticated") {
    return { ok: false, reason: "unauthenticated", message: MESSAGES.unauthenticated };
  }
  if (response.status === 403) return { ok: false, reason: "forbidden", message: MESSAGES.forbidden };
  if (response.status === 409) {
    return { ok: false, reason: "conflict", message: MESSAGES.conflict, field: "slug" };
  }
  if (response.status === 400 || response.status === 413 || response.status === 422) {
    return { ok: false, reason: "invalid", message: MESSAGES.invalid };
  }
  if (response.status === 404) return { ok: false, reason: "not_found", message: MESSAGES.notFound };
  return { ok: false, reason: "error", message: MESSAGES.error };
}

/**
 * Derruba o que mostra notícia. A etiqueta `BLOG_TAG` invalida TODAS as
 * leituras cacheadas do blog (lista, matérias — inclusive a do slug ANTIGO,
 * se ele mudou — e a seção NOTÍCIAS de qualquer jogo); os caminhos derrubam o
 * HTML das rotas afetadas que se conhece daqui.
 */
function revalidateBlog(saved?: { slug?: string; gameSlug?: string }) {
  updateTag(BLOG_TAG);
  revalidatePath("/noticias");
  revalidatePath("/admin/noticias");
  if (saved?.slug) revalidatePath(`/noticias/${saved.slug}`);
  if (saved?.gameSlug) revalidatePath(`/games/${saved.gameSlug}`);
}

function savedFrom(data: unknown, fallbackId?: string): { id: string; slug: string; gameSlug?: string } | null {
  if (!data || typeof data !== "object") return null;
  const post = data as SavedPost;
  const id = typeof post.id === "string" && ID_RE.test(post.id) ? post.id : fallbackId;
  const slug = typeof post.slug === "string" && /^[a-z0-9-]{1,120}$/.test(post.slug) ? post.slug : "";
  const gameSlug =
    typeof post.game?.slug === "string" && /^[a-z0-9-]{1,120}$/.test(post.game.slug) ? post.game.slug : undefined;
  if (!id) return null;
  return { id, slug, gameSlug };
}

export async function createBlogPostAction(form: FormData): Promise<BlogActionResult> {
  const denied = await guard();
  if (denied) return denied;

  const payload = buildPayload(form, "create");
  if (!(payload instanceof FormData)) return payload;

  const response = await apiPostFormData<SavedPost>("/admin/blog", payload);
  if (!response.ok) return failureFrom(response);

  const saved = savedFrom(response.data);
  revalidateBlog(saved ?? undefined);
  if (!saved) return { ok: false, reason: "error", message: MESSAGES.error };
  return { ok: true, id: saved.id, slug: saved.slug };
}

export async function updateBlogPostAction(id: string, form: FormData): Promise<BlogActionResult> {
  const denied = await guard();
  if (denied) return denied;
  if (typeof id !== "string" || !ID_RE.test(id)) {
    return { ok: false, reason: "invalid", message: "Notícia inválida." };
  }

  const payload = buildPayload(form, "update");
  if (!(payload instanceof FormData)) return payload;

  const response = await apiPatchFormData<SavedPost>(`/admin/blog/${encodeURIComponent(id)}`, payload);
  if (!response.ok) return failureFrom(response);

  const saved = savedFrom(response.data, id);
  revalidateBlog(saved ?? undefined);
  return { ok: true, id: saved?.id ?? id, slug: saved?.slug ?? "" };
}

export async function deleteBlogPostAction(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied.message };
  if (typeof id !== "string" || !ID_RE.test(id)) return { ok: false, message: "Notícia inválida." };

  const response = await apiDelete(`/admin/blog/${encodeURIComponent(id)}`);
  // 2xx sem `data` no envelope (DELETE que não devolve o recurso) também é
  // sucesso — o `serverApi` o reporta como falha por não haver o que ler.
  if (!response.ok && !(response.status >= 200 && response.status < 300)) {
    return {
      ok: false,
      message:
        response.status === 404
          ? "Esta notícia já não existe."
          : response.status === 403
            ? MESSAGES.forbidden
            : "Não conseguimos excluir agora. Tente novamente em instantes.",
    };
  }

  revalidateBlog();
  return { ok: true };
}
