"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getSessionRole } from "@/features/auth/session";
import { GIFTS_TAG } from "@/features/gifts/publicGifts";
import { giftRuleProblem } from "@/features/pricing/gift";
import { apiPut } from "@/lib/serverApi";
import { isValidId } from "../games/tabs/types";
import { toAdminGift, type AdminGift } from "./types";

/**
 * Brinde do jogo (2026-10-12). Só ADMIN: brinde é mercadoria que a loja dá. O
 * backend confere tudo de novo (DTO + `giftRuleProblem`); a checagem daqui é
 * para não gastar uma ida à rede com o que já se sabe errado.
 */
export type GiftResult =
  | { ok: true; data: AdminGift }
  | { ok: false; reason: "unauthenticated" | "forbidden" | "invalid" | "error"; message?: string };

export async function saveGiftAction(gameId: string, input: AdminGift): Promise<GiftResult> {
  const role = await getSessionRole();
  if (role === null) return { ok: false, reason: "unauthenticated" };
  if (role !== "ADMIN") return { ok: false, reason: "forbidden" };
  if (!isValidId(gameId)) return { ok: false, reason: "invalid", message: "Jogo inválido." };

  // Server action é endpoint público: nada do que chega é confiável.
  const gift: AdminGift = {
    isActive: input?.isActive === true,
    everyCents: Number(input?.everyCents),
    amount: Number(input?.amount),
    label: String(input?.label ?? "").trim(),
    maxAmount: input?.maxAmount === null || input?.maxAmount === undefined ? null : Number(input.maxAmount),
  };
  const problem = giftRuleProblem(gift);
  if (problem) return { ok: false, reason: "invalid", message: problem };

  const result = await apiPut<unknown>(`/admin/games/${encodeURIComponent(gameId)}/gift`, gift);
  if (!result.ok) {
    if (result.reason === "unauthenticated") return { ok: false, reason: "unauthenticated" };
    if (result.status === 403) return { ok: false, reason: "forbidden" };
    if (result.status === 400) return { ok: false, reason: "invalid", message: result.message };
    return { ok: false, reason: "error" };
  }
  const saved = toAdminGift(result.data);
  if (!saved) return { ok: false, reason: "error" };

  // Carrinho (cabeçalho de toda página) e checkout leem com esta etiqueta.
  updateTag(GIFTS_TAG);
  revalidatePath(`/admin/jogos/${gameId}`);
  return { ok: true, data: saved };
}
