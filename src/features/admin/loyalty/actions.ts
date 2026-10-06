"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getSessionRole } from "@/features/auth/session";
import { LOYALTY_TIERS_TAG } from "@/features/loyalty/publicTiers";
import { apiDelete, apiPostFormData, apiPut } from "@/lib/serverApi";
import { MAX_IMAGE_BYTES } from "../games/options";
import { toAdminTiers, type ApiLoyaltyTier } from "./data";
import { TIER_KEYS, tierProblem, type AdminLoyaltyTier } from "./types";

/**
 * Níveis de fidelidade no painel (2026-10-06). Só ADMIN: cashback é dinheiro.
 * O backend confere tudo de novo (DTO + `validateTiers`); a checagem daqui é
 * para não gastar uma ida à rede com o que já se sabe errado.
 */
export type LoyaltyResult =
  | { ok: true; data: AdminLoyaltyTier[] }
  | { ok: false; reason: "unauthenticated" | "forbidden" | "invalid" | "error"; message?: string };

async function requireAdmin(): Promise<LoyaltyResult | null> {
  const role = await getSessionRole();
  if (role === null) return { ok: false, reason: "unauthenticated" };
  if (role !== "ADMIN") return { ok: false, reason: "forbidden" };
  return null;
}

function failure(result: { status: number; reason: "unauthenticated" | "error"; message?: string }): LoyaltyResult {
  if (result.reason === "unauthenticated") return { ok: false, reason: "unauthenticated" };
  if (result.status === 403) return { ok: false, reason: "forbidden" };
  if (result.status === 400) return { ok: false, reason: "invalid", message: result.message };
  return { ok: false, reason: "error" };
}

/** A loja inteira lê a tabela (cabeçalho/carrinho, checkout, /fidelidade). */
function revalidate() {
  updateTag(LOYALTY_TIERS_TAG);
  revalidatePath("/fidelidade");
  revalidatePath("/admin/fidelidade");
}

function isTierKey(value: unknown): value is AdminLoyaltyTier["tier"] {
  return typeof value === "string" && (TIER_KEYS as readonly string[]).includes(value);
}

export async function saveLoyaltyTiersAction(input: AdminLoyaltyTier[]): Promise<LoyaltyResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!Array.isArray(input) || input.length !== TIER_KEYS.length) {
    return { ok: false, reason: "invalid", message: "Envie os cinco níveis." };
  }
  // Server action é endpoint público: nada do que chega é confiável.
  const clean = input.map((rule) => ({
    tier: rule?.tier,
    name: String(rule?.name ?? "").trim(),
    minSpentCents: Number(rule?.minSpentCents),
    cashbackBps: Number(rule?.cashbackBps),
  }));
  if (clean.some((rule, index) => rule.tier !== TIER_KEYS[index])) {
    return { ok: false, reason: "invalid", message: "Níveis fora de ordem." };
  }
  const tiers = clean as AdminLoyaltyTier[];
  const problem = tierProblem(tiers);
  if (problem) return { ok: false, reason: "invalid", message: problem.message };

  const result = await apiPut<ApiLoyaltyTier[]>("/admin/loyalty/tiers", { tiers });
  if (!result.ok) return failure(result);
  revalidate();
  return { ok: true, data: toAdminTiers(result.data) };
}

export async function uploadTierIconAction(tier: string, form: FormData): Promise<LoyaltyResult> {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!isTierKey(tier)) return { ok: false, reason: "invalid", message: "Nível inválido." };

  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, reason: "invalid", message: "Escolha uma imagem." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, reason: "invalid", message: "A imagem precisa ter no máximo 5 MB." };
  }
  // SVG fica de fora (XSS armazenado); o backend confere de novo pelo conteúdo.
  if (!["image/png", "image/jpeg", "image/webp", "image/avif"].includes(file.type)) {
    return { ok: false, reason: "invalid", message: "Use PNG, JPEG, WebP ou AVIF." };
  }

  const body = new FormData();
  body.append("image", file, file.name);
  const result = await apiPostFormData<ApiLoyaltyTier[]>(`/admin/loyalty/tiers/${encodeURIComponent(tier)}/icon`, body);
  if (!result.ok) return failure(result);
  revalidate();
  return { ok: true, data: toAdminTiers(result.data) };
}

export async function resetTierIconAction(tier: string): Promise<LoyaltyResult> {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!isTierKey(tier)) return { ok: false, reason: "invalid", message: "Nível inválido." };

  const result = await apiDelete<ApiLoyaltyTier[]>(`/admin/loyalty/tiers/${encodeURIComponent(tier)}/icon`);
  if (!result.ok) return failure(result);
  revalidate();
  return { ok: true, data: toAdminTiers(result.data) };
}
