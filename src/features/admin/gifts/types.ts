import { MAX_GIFT_TOTAL, type GiftRule } from "@/features/pricing/gift";

/**
 * Brinde do jogo no painel (2026-10-12) — a parte PURA: tipo e leitura da
 * resposta. Sem `serverApi`: o editor (client component) importa daqui.
 */
export type AdminGift = GiftRule & { isActive: boolean };

function int(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

/** Resposta do backend → regra. `null` = sem regra (ou resposta estranha). */
export function toAdminGift(raw: unknown): AdminGift | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const everyCents = int(row.everyCents);
  const amount = int(row.amount);
  if (everyCents === null || amount === null) return null;
  // O backend apaga campo nulo/falso da resposta: ausente = sem teto / desligado.
  const maxAmount = int(row.maxAmount);
  return {
    isActive: row.isActive === true,
    everyCents,
    amount,
    label: typeof row.label === "string" ? row.label : "",
    maxAmount: maxAmount !== null && maxAmount > 0 && maxAmount <= MAX_GIFT_TOTAL ? maxAmount : null,
  };
}

/** "50.000.000" / "50000000" → 50000000. Vazio ou lixo → `null`. */
export function parseAmount(text: string): number | null {
  const digits = text.replace(/\D/g, "");
  if (digits === "" || digits.length > 16) return null;
  const value = Number(digits);
  return Number.isSafeInteger(value) ? value : null;
}

/** 50000000 → "50.000.000" (o que o campo mostra). */
export function formatAmount(value: number | null): string {
  return value === null ? "" : value.toLocaleString("pt-BR");
}
