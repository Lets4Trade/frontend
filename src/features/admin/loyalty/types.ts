import type { LoyaltyTierKey } from "@/features/loyalty/data";

/** Um nível como o painel o edita (2026-10-06). */
export type AdminLoyaltyTier = {
  tier: LoyaltyTierKey;
  name: string;
  minSpentCents: number;
  cashbackBps: number;
  /** URL absoluta do ícone enviado; ausente = a arte padrão do site. */
  iconUrl?: string;
};

export const TIER_KEYS: readonly LoyaltyTierKey[] = ["BRONZE", "PRATA", "OURO", "DIAMANTE", "ADAMANTIUM"];

/** Espelham os tetos do backend (`loyalty.rules.ts`). */
export const MAX_CASHBACK_BPS = 5_000;
export const MAX_MIN_SPENT_CENTS = 1_000_000_000;
export const MAX_TIER_NAME = 40;

export type TierProblem = {
  index: number;
  field: "name" | "minSpentCents" | "cashbackBps";
  message: string;
};

/**
 * As mesmas regras do `validateTiers` do backend, para o erro aparecer no
 * campo antes de ir à rede. Quem decide continua sendo o backend.
 * Devolve o primeiro problema, ou `null`.
 */
export function tierProblem(tiers: readonly AdminLoyaltyTier[]): TierProblem | null {
  for (let index = 0; index < tiers.length; index += 1) {
    const rule = tiers[index];
    const name = rule.name.trim();
    if (!name) return { index, field: "name", message: "Dê um nome ao nível." };
    if (name.length > MAX_TIER_NAME) return { index, field: "name", message: `Até ${MAX_TIER_NAME} caracteres.` };
    if (!Number.isInteger(rule.cashbackBps) || rule.cashbackBps < 0 || rule.cashbackBps > MAX_CASHBACK_BPS) {
      return { index, field: "cashbackBps", message: "Entre 0% e 50%, com até 2 casas (ex.: 2,5)." };
    }
    if (!Number.isInteger(rule.minSpentCents) || rule.minSpentCents < 0 || rule.minSpentCents > MAX_MIN_SPENT_CENTS) {
      return { index, field: "minSpentCents", message: "Valor inválido." };
    }
    if (index === 0 && rule.minSpentCents !== 0) {
      return { index, field: "minSpentCents", message: "O primeiro nível começa em R$ 0,00." };
    }
    if (index > 0 && rule.minSpentCents <= tiers[index - 1].minSpentCents) {
      const previous = tiers[index - 1].name.trim() || "nível anterior";
      return { index, field: "minSpentCents", message: `Precisa ser maior que o de ${previous}.` };
    }
  }
  return null;
}

/** "2,5" → 250 bps. Aceita vírgula ou ponto e até 2 casas. `NaN` = inválido. */
export function parsePercent(text: string): number {
  const clean = text.trim().replace("%", "").trim().replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(clean)) return Number.NaN;
  return Math.round(Number(clean) * 100);
}

/** 250 bps → "2,5". */
export function formatPercent(bps: number): string {
  return (bps / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}
