/**
 * CUPOM de desconto (2026-10-12, pedido do usuário) — a conta.
 *
 * ⚠️ ARQUIVO ESPELHADO: `backend/src/common/pricing/coupon.ts` e
 * `frontend/src/features/pricing/coupon.ts` têm que ser IDÊNTICOS. No front ele
 * faz a PRÉVIA do checkout; quem cobra é o backend, com a mesma função, sobre o
 * catálogo do banco e a regra gravada no cupom. Sem imports.
 *
 * ── A regra ────────────────────────────────────────────────────────────────
 *  - Só os itens ELEGÍVEIS entram (alcance do cupom: loja toda ou
 *    jogos/abas/produtos — quem decide a elegibilidade de cada linha é o backend).
 *  - PERCENT: `value` em pontos-base (1000 = 10%) sobre o subtotal elegível,
 *    arredondado para BAIXO. FIXED: `value` em centavos.
 *  - Teto opcional (`maxDiscountCents`) e nunca mais que o subtotal elegível.
 *  - Compra mínima opcional (`minSubtotalCents`) sobre o subtotal ELEGÍVEL.
 *  - O desconto é repartido entre as linhas elegíveis PROPORCIONALMENTE (cada
 *    linha vira um pedido e precisa saber quanto abateu); os centavos que sobram
 *    do arredondamento vão, um a um, às primeiras linhas elegíveis.
 *
 * Dinheiro em CENTAVOS inteiros.
 */

export const MAX_COUPON_PERCENT_BPS = 10_000; // 100%
export const MAX_COUPON_FIXED_CENTS = 10_000_000; // R$ 100.000,00
export const COUPON_CODE_PATTERN = /^[A-Z0-9_-]{3,40}$/;

export type CouponKind = "PERCENT" | "FIXED";

export type CouponRule = {
  kind: CouponKind;
  value: number;
  maxDiscountCents: number | null;
  minSubtotalCents: number | null;
};

export type CouponLine = { cents: number; eligible: boolean };

export type CouponResult =
  | { ok: true; totalCents: number; perLine: number[]; eligibleCents: number }
  | { ok: false; reason: "NO_ELIGIBLE" | "MIN_SUBTOTAL"; eligibleCents: number; perLine: number[] };

/** "  black-friday " → "BLACK-FRIDAY". */
export function normalizeCouponCode(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toUpperCase() : "";
}

function isInt(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

/** O que está errado na regra de desconto, em português, ou `null`. */
export function couponRuleProblem(rule: CouponRule): string | null {
  if (rule.kind !== "PERCENT" && rule.kind !== "FIXED") return "Escolha percentual ou valor fixo.";
  if (rule.kind === "PERCENT") {
    if (!isInt(rule.value) || rule.value < 1 || rule.value > MAX_COUPON_PERCENT_BPS) {
      return "O percentual precisa ficar entre 0,01% e 100%.";
    }
  } else if (!isInt(rule.value) || rule.value < 1 || rule.value > MAX_COUPON_FIXED_CENTS) {
    return "O valor do desconto precisa ficar entre R$ 0,01 e R$ 100.000,00.";
  }
  if (rule.maxDiscountCents !== null && (!isInt(rule.maxDiscountCents) || rule.maxDiscountCents < 1 || rule.maxDiscountCents > MAX_COUPON_FIXED_CENTS)) {
    return "O desconto máximo precisa ficar entre R$ 0,01 e R$ 100.000,00.";
  }
  if (rule.minSubtotalCents !== null && (!isInt(rule.minSubtotalCents) || rule.minSubtotalCents < 1 || rule.minSubtotalCents > MAX_COUPON_FIXED_CENTS)) {
    return "A compra mínima precisa ficar entre R$ 0,01 e R$ 100.000,00.";
  }
  return null;
}

/** Quanto o cupom abate do carrinho e de cada linha. */
export function couponDiscount(rule: CouponRule, lines: readonly CouponLine[]): CouponResult {
  const cents = lines.map((line) => Math.max(0, Math.floor(line.cents) || 0));
  const eligibleCents = lines.reduce((sum, line, index) => sum + (line.eligible ? cents[index] : 0), 0);
  const none = lines.map(() => 0);

  if (eligibleCents <= 0) return { ok: false, reason: "NO_ELIGIBLE", eligibleCents, perLine: none };
  if (rule.minSubtotalCents !== null && eligibleCents < rule.minSubtotalCents) {
    return { ok: false, reason: "MIN_SUBTOTAL", eligibleCents, perLine: none };
  }

  let total =
    rule.kind === "PERCENT"
      ? Math.floor((eligibleCents * Math.min(rule.value, MAX_COUPON_PERCENT_BPS)) / 10_000)
      : rule.value;
  if (rule.maxDiscountCents !== null) total = Math.min(total, rule.maxDiscountCents);
  total = Math.max(0, Math.min(total, eligibleCents));

  // Proporcional, para baixo; o resto em centavos às primeiras elegíveis (sem
  // passar do valor de nenhuma linha).
  const perLine = lines.map((line, index) =>
    line.eligible ? Math.floor((total * cents[index]) / eligibleCents) : 0,
  );
  let remainder = total - perLine.reduce((sum, value) => sum + value, 0);
  for (let index = 0; remainder > 0 && index < lines.length; index += 1) {
    if (lines[index].eligible && perLine[index] < cents[index]) {
      perLine[index] += 1;
      remainder -= 1;
    }
  }

  return { ok: true, totalCents: total, perLine, eligibleCents };
}
