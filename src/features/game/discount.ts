/**
 * Desconto do PACOTE (2026-10-27): cada produto da aba Moedas já é uma
 * quantidade ("1000 Chaos Orb"), e o admin pode dar um desconto em % a alguns.
 *
 * Quem decide e cobra é o backend (`products/product-discount.ts`): a vitrine
 * já recebe `priceCents` COM o desconto. Este espelho serve só à PRÉVIA do
 * cadastro no painel, que ainda não foi salvo.
 */
export const MAX_DISCOUNT_PERCENT = 90;

export function discountedCents(listCents: number, percent: number): number {
  if (!(percent > 0)) return listCents;
  return Math.max(1, Math.round((listCents * (100 - percent)) / 100));
}

/** Percentual válido vindo da API (inteiro de 1 a 90) ou `undefined`. */
export function readDiscountPercent(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= MAX_DISCOUNT_PERCENT
    ? value
    : undefined;
}
