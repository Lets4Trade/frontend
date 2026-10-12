"use server";

import { revalidatePath } from "next/cache";
import { getSessionRole } from "@/features/auth/session";
import { normalizeCouponCode, type CouponKind } from "@/features/pricing/coupon";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/serverApi";
import {
  couponPayloadProblem,
  toAdminCoupon,
  toProductOptions,
  type AdminCoupon,
  type CouponPayload,
  type CouponProductOption,
} from "./types";

/**
 * Cupons no painel (2026-10-12). Só ADMIN — decisão do usuário. O backend
 * confere tudo de novo (DTO + `CouponsService`); a checagem daqui é para não
 * gastar uma ida à rede com o que já se sabe errado.
 */
export type CouponResult =
  | { ok: true; data: AdminCoupon }
  | { ok: false; reason: "unauthenticated" | "forbidden" | "invalid" | "conflict" | "error"; message?: string };

export type DeleteCouponResult =
  | { ok: true }
  | { ok: false; reason: "unauthenticated" | "forbidden" | "invalid" | "conflict" | "error"; message?: string };

const ID_RE = /^[A-Za-z0-9_-]{1,100}$/;

async function denied(): Promise<{ ok: false; reason: "unauthenticated" | "forbidden" } | null> {
  const role = await getSessionRole();
  if (role === null) return { ok: false, reason: "unauthenticated" };
  if (role !== "ADMIN") return { ok: false, reason: "forbidden" };
  return null;
}

function failure(result: { status: number; reason: "unauthenticated" | "error"; message?: string }) {
  if (result.reason === "unauthenticated") return { ok: false as const, reason: "unauthenticated" as const };
  if (result.status === 403) return { ok: false as const, reason: "forbidden" as const };
  if (result.status === 409) return { ok: false as const, reason: "conflict" as const, message: result.message };
  if (result.status === 400 || result.status === 404) return { ok: false as const, reason: "invalid" as const, message: result.message };
  return { ok: false as const, reason: "error" as const };
}

function revalidate(id?: string) {
  revalidatePath("/admin/cupons");
  if (id) revalidatePath(`/admin/cupons/${id}`);
}

function nullableInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : Number.NaN;
}

function idList(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((id): id is string => typeof id === "string" && ID_RE.test(id)))].slice(0, 200)
    : [];
}

function isoOrNull(value: unknown): string | null {
  if (typeof value !== "string" || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Server action é endpoint público: nada do que chega é confiável. */
function clean(input: CouponPayload): CouponPayload {
  const kind: CouponKind = input?.kind === "FIXED" ? "FIXED" : "PERCENT";
  return {
    code: normalizeCouponCode(input?.code),
    description: typeof input?.description === "string" && input.description.trim() ? input.description.trim() : null,
    isActive: input?.isActive === true,
    kind,
    value: Math.trunc(Number(input?.value)),
    maxDiscountCents: kind === "PERCENT" ? nullableInt(input?.maxDiscountCents) : null,
    minSubtotalCents: nullableInt(input?.minSubtotalCents),
    startsAt: isoOrNull(input?.startsAt),
    endsAt: isoOrNull(input?.endsAt),
    maxUses: nullableInt(input?.maxUses),
    maxUsesPerUser: nullableInt(input?.maxUsesPerUser),
    gameIds: idList(input?.gameIds),
    tabIds: idList(input?.tabIds),
    productIds: idList(input?.productIds),
    allowCoins: input?.allowCoins === true,
    rewardsOnDiscounted: input?.rewardsOnDiscounted === true,
  };
}

export async function saveCouponAction(id: string | null, input: CouponPayload): Promise<CouponResult> {
  const blocked = await denied();
  if (blocked) return blocked;
  if (id !== null && !ID_RE.test(id)) return { ok: false, reason: "invalid", message: "Cupom inválido." };

  const payload = clean(input);
  const problem = couponPayloadProblem(payload);
  if (problem) return { ok: false, reason: "invalid", message: problem };

  const result = id
    ? await apiPut<unknown>(`/admin/coupons/${encodeURIComponent(id)}`, payload)
    : await apiPost<unknown>("/admin/coupons", payload);
  if (!result.ok) return failure(result);
  const saved = toAdminCoupon(result.data);
  if (!saved) return { ok: false, reason: "error" };
  revalidate(saved.id);
  return { ok: true, data: saved };
}

export async function deleteCouponAction(id: string): Promise<DeleteCouponResult> {
  const blocked = await denied();
  if (blocked) return blocked;
  if (!ID_RE.test(id)) return { ok: false, reason: "invalid", message: "Cupom inválido." };
  const result = await apiDelete<unknown>(`/admin/coupons/${encodeURIComponent(id)}`);
  if (!result.ok) return failure(result);
  revalidate();
  return { ok: true };
}

/** Busca de produtos para o alcance "por produto" (até 30). */
export async function searchCouponProductsAction(search: string): Promise<CouponProductOption[]> {
  if (await denied()) return [];
  const term = typeof search === "string" ? search.trim().slice(0, 80) : "";
  const result = await apiGet<unknown>(`/admin/coupons/products?search=${encodeURIComponent(term)}`);
  return result.ok ? toProductOptions(result.data) : [];
}
