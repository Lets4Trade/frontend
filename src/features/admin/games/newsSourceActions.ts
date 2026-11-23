"use server";

import { revalidatePath, updateTag } from "next/cache";
import { canAccess } from "@/features/admin/permissions";
import { getSessionRole } from "@/features/auth/session";
import { BLOG_TAG } from "@/features/blog/format";
import { apiPatch } from "@/lib/serverApi";
import { isNewsSource } from "./newsSource";
import { isValidId } from "./tabs/types";

export type NewsSourceResult =
  | { ok: true }
  | { ok: false; reason: "unauthenticated" | "forbidden" | "invalid" | "error"; message?: string };

/**
 * Salva de onde vêm as notícias da página do jogo (2026-11-23). Mesmo papel da
 * Central (catálogo: ADMIN e EDITOR); o backend confere de novo e valida que o
 * outro jogo existe.
 */
export async function saveNewsSourceAction(gameId: string, source: string): Promise<NewsSourceResult> {
  const role = await getSessionRole();
  if (role === null) return { ok: false, reason: "unauthenticated" };
  if (!canAccess(role, "catalog")) return { ok: false, reason: "forbidden" };
  // Server action é endpoint público: nada do que chega é confiável.
  if (!isValidId(gameId) || !isNewsSource(source)) return { ok: false, reason: "invalid", message: "Escolha inválida." };

  const result = await apiPatch<unknown>(`/admin/games/${encodeURIComponent(gameId)}/news-source`, { source });
  if (!result.ok) {
    if (result.reason === "unauthenticated") return { ok: false, reason: "unauthenticated" };
    if (result.status === 403) return { ok: false, reason: "forbidden" };
    if (result.status === 400) return { ok: false, reason: "invalid", message: result.message };
    return { ok: false, reason: "error" };
  }

  // A seção NOTÍCIAS da loja lê com a etiqueta do blog: derrubá-la mostra a
  // escolha nova na próxima visita, sem esperar o cache de 60 s.
  updateTag(BLOG_TAG);
  revalidatePath(`/admin/jogos/${gameId}`);
  return { ok: true };
}
