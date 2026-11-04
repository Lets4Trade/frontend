/**
 * Cartões salvos (2026-11-02, "pra ele não precisar ficar colocando o cartão
 * toda vez").
 *
 * A tela só conhece o que o backend devolve em `GET /payments/cards`: bandeira,
 * 4 últimos dígitos, titular e validade. O token da Cielo nunca chega aqui —
 * pagar com um cartão salvo manda o `id` e o CVV, e o backend troca pelo token
 * depois de conferir o dono.
 */
export type SavedCard = {
  id: string;
  brand: string;
  last4: string;
  holder: string;
  /** MM/AA */
  expiry: string;
  /** Validade passou: aparece, mas não dá para escolher. */
  expired: boolean;
};

/** Nome da bandeira como as pessoas falam (a Cielo diz "Master"). */
const BRAND_LABEL: Record<string, string> = {
  Master: "Mastercard",
  Amex: "American Express",
};

export function brandLabel(brand: string): string {
  return BRAND_LABEL[brand] ?? brand;
}

/** "Mastercard •••• 4242" — o rótulo do cartão na tela. */
export function savedCardLabel(card: Pick<SavedCard, "brand" | "last4">): string {
  return `${brandLabel(card.brand)} •••• ${card.last4}`;
}

/** Só o formato do contrato: item estranho da API é descartado. */
export function readSavedCards(raw: unknown): SavedCard[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): SavedCard[] => {
    if (!item || typeof item !== "object") return [];
    const c = item as Record<string, unknown>;
    if (
      typeof c.id !== "string" ||
      typeof c.brand !== "string" ||
      typeof c.last4 !== "string" ||
      !/^\d{4}$/.test(c.last4) ||
      typeof c.expiry !== "string"
    ) {
      return [];
    }
    return [
      {
        id: c.id,
        brand: c.brand,
        last4: c.last4,
        holder: typeof c.holder === "string" ? c.holder : "",
        expiry: c.expiry,
        expired: c.expired === true,
      },
    ];
  });
}
