"use server";

import { revalidatePath } from "next/cache";
import { getSessionRole } from "@/features/auth/session";
import { MAX_IMAGE_BYTES } from "@/features/admin/games/options";
import { apiGet, apiPost, apiPostFormData, apiPut } from "@/lib/serverApi";
import type { Block, PageRefs, PageRevision } from "./types";
import { normalizeBlocks } from "./legacy";

/**
 * Ações do construtor de páginas (fase 1, 2026-09-25).
 *
 * Passam pelo SERVIDOR pelo motivo de todo o painel: a sessão é cookie
 * `httpOnly`. Aqui NÃO se valida o conteúdo dos blocos — quem valida é o
 * backend (zod, com mensagem apontando o bloco), e a mensagem dele volta para a
 * tela. Duas validações divergindo seriam duas regras para manter.
 *
 * O que se confere aqui é o que protege a CHAMADA: papel, formato do slug (vai
 * para o caminho da URL) e tamanho da imagem antes de gastar banda.
 */

export type PageResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unauthenticated" | "forbidden" | "invalid" | "conflict" | "error"; message?: string };

const SLUG = /^[a-z0-9-]{1,60}$/;

async function requireAdmin(): Promise<PageResult<never> | null> {
  const role = await getSessionRole();
  if (role === null) return { ok: false, reason: "unauthenticated" };
  // Conteúdo: ADMIN e EDITOR (2026-09-25). O backend confere de novo.
  if (role !== "ADMIN" && role !== "EDITOR") return { ok: false, reason: "forbidden" };
  return null;
}

function failure(result: { status: number; reason: "unauthenticated" | "error"; message?: string }): PageResult<never> {
  if (result.reason === "unauthenticated") return { ok: false, reason: "unauthenticated" };
  if (result.status === 409) {
    return {
      ok: false,
      reason: "conflict",
      message: result.message ?? "A página foi alterada em outra aba. Recarregue.",
    };
  }
  return {
    ok: false,
    reason: result.status === 400 || result.status === 404 ? "invalid" : "error",
    message: result.message,
  };
}

function invalidSlug(): PageResult<never> {
  return { ok: false, reason: "invalid", message: "Página inválida." };
}

/** Salva o RASCUNHO. Não aparece na loja até publicar. */
export async function saveDraftAction(
  slug: string,
  blocks: Block[],
  draftRevision: number,
): Promise<PageResult<{ draftRevision: number; hasUnpublishedChanges: boolean }>> {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!SLUG.test(slug)) return invalidSlug();
  if (!Array.isArray(blocks) || !Number.isInteger(draftRevision)) {
    return { ok: false, reason: "invalid", message: "Dados da página inválidos." };
  }

  const result = await apiPut<{ draftRevision: number; hasUnpublishedChanges: boolean }>(
    `/admin/pages/${slug}/draft`,
    { blocks, draftRevision },
  );
  return result.ok ? { ok: true, data: result.data } : failure(result);
}

/** Publica o rascunho salvo. A loja muda na hora. */
export async function publishAction(
  slug: string,
  draftRevision: number,
): Promise<PageResult<{ version: number; publishedAt: string }>> {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!SLUG.test(slug)) return invalidSlug();

  const result = await apiPost<{ version: number; publishedAt: string }>(
    `/admin/pages/${slug}/publish`,
    { draftRevision },
  );
  if (!result.ok) return failure(result);

  // A home lê a página sem cache, mas o RENDER dela pode estar em cache.
  revalidatePath("/", "layout");
  return { ok: true, data: result.data };
}

export async function listRevisionsAction(slug: string): Promise<PageResult<PageRevision[]>> {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!SLUG.test(slug)) return invalidSlug();

  const result = await apiGet<PageRevision[]>(`/admin/pages/${slug}/revisions`);
  return result.ok ? { ok: true, data: result.data } : failure(result);
}

/** Traz uma versão publicada de volta para o RASCUNHO (não publica). */
export async function restoreRevisionAction(
  slug: string,
  version: number,
): Promise<PageResult<{ blocks: Block[]; draftRevision: number }>> {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!SLUG.test(slug) || !Number.isInteger(version) || version < 1) return invalidSlug();

  const result = await apiPost<{ blocks: Block[]; draftRevision: number }>(
    `/admin/pages/${slug}/revisions/${version}/restore`,
    {},
  );
  // Revisão antiga pode trazer o `productType` legado (ver `legacy.ts`).
  return result.ok
    ? { ok: true, data: { ...result.data, blocks: normalizeBlocks(result.data.blocks ?? []) } }
    : failure(result);
}

/** Sobe uma imagem de bloco. Volta o caminho `/uploads/pages/…webp`. */
export async function uploadPageAssetAction(form: FormData): Promise<PageResult<{ url: string }>> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, reason: "invalid", message: "Escolha uma imagem." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, reason: "invalid", message: "A imagem precisa ter no máximo 5 MB." };
  }

  const payload = new FormData();
  payload.set("image", file, file.name);
  const result = await apiPostFormData<{ url: string }>("/admin/pages/assets", payload);
  return result.ok ? { ok: true, data: result.data } : failure(result);
}

/**
 * Resolve as referências do RASCUNHO (jogos, produtos) para a prévia desenhar
 * blocos que ainda não foram salvos. Falha vira refs vazias: a prévia mostra
 * os blocos sem os itens, em vez de travar o editor.
 */
export async function resolveRefsAction(blocks: Block[]): Promise<PageRefs> {
  const denied = await requireAdmin();
  if (denied || !Array.isArray(blocks)) return { games: {}, products: {} };

  const result = await apiPost<PageRefs>("/admin/pages/resolve", { blocks });
  if (!result.ok) return { games: {}, products: {} };
  return { games: result.data.games ?? {}, products: result.data.products ?? {} };
}
