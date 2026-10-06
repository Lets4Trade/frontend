import { backendAsset } from "@/lib/publicApi";
import { apiGet } from "@/lib/serverApi";
import type { LoyaltyTierKey } from "@/features/loyalty/data";
import type { AdminLoyaltyTier } from "./types";

export type ApiLoyaltyTier = {
  tier: LoyaltyTierKey;
  name?: string;
  minSpentCents?: number;
  cashbackBps?: number;
  iconUrl?: string | null;
};

/** Converte a resposta do backend (que apaga campos nulos) para a tela. */
export function toAdminTiers(rows: readonly ApiLoyaltyTier[]): AdminLoyaltyTier[] {
  return rows.map((row) => ({
    tier: row.tier,
    name: row.name ?? "",
    minSpentCents: Number(row.minSpentCents) || 0,
    cashbackBps: Number(row.cashbackBps) || 0,
    iconUrl: backendAsset(row.iconUrl) ?? undefined,
  }));
}

/** `GET /admin/loyalty/tiers`. `null` = falhou (a tela avisa). */
export async function getAdminLoyaltyTiers(): Promise<AdminLoyaltyTier[] | null> {
  const result = await apiGet<ApiLoyaltyTier[]>("/admin/loyalty/tiers");
  if (!result.ok || !Array.isArray(result.data)) return null;
  return toAdminTiers(result.data);
}
