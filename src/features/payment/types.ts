/**
 * Forma do pagamento como o backend devolve (`GET /payments/:id`). Espelha o
 * `toView` de `backend/src/app/payments/payments.service.ts`.
 *
 * Campos opcionais podem simplesmente não vir: o interceptor de compressão do
 * backend apaga `null`/`undefined` da resposta.
 */
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "REFUNDED";
export type PaymentMethod = "PIX" | "CREDIT_CARD" | "DEBIT_CARD";

export type PaymentView = {
  id: string;
  status: PaymentStatus;
  method?: PaymentMethod;
  amountCents: number;
  /** Taxa do crédito da tentativa que valeu (2026-10-27). O pago é a soma. */
  feeCents?: number;
  expiresAt: string;
  paidAt?: string;
  maxInstallments: number;
  attemptsLeft: number;
  pix?: { qrBase64?: string; code?: string; expiresAt?: string };
  /** Débito fora do 3DS do navegador: autenticar na página do banco. */
  redirectUrl?: string;
  /** Cartão em análise (antifraude) ou débito esperando o banco. */
  processing?: boolean;
  card?: { brand?: string; last4: string; installments: number };
  lastError?: string;
  /**
   * Uma linha por PRODUTO (2026-10-16): o código e a situação são do pedido
   * ao qual o produto pertence — vários produtos repetem o mesmo código.
   */
  orders: {
    reference: string;
    productName: string;
    productImageUrl?: string;
    platform: string;
    quantity: string;
    /** Caminho na loja (2026-10-23) — `itemPath`. Ausentes em pedido antigo. */
    gameName?: string | null;
    tabLabel?: string | null;
    categoryLabel?: string | null;
    subcategoryLabel?: string | null;
    totalPrice: string;
    status: string;
  }[];
  /** Descontos da cobrança (somas dos pedidos). Ausentes quando zero. */
  discountCents?: number;
  couponCents?: number;
  couponCode?: string;
};

/**
 * Para onde ir depois de PAGO (2026-10-16, pedido do usuário: "quando o user
 * conclui uma compra … redirecionar direto pro chat com o atendente"): a tela
 * do pedido, que é a conversa com a equipe. `?pago=1` mostra o aviso de
 * pagamento aprovado lá. `null` = pagamento sem pedido (não acontece no fluxo).
 */
export function paidOrderHref(payment: Pick<PaymentView, "orders">): string | null {
  const reference = payment.orders[0]?.reference;
  return reference ? `/conta/pedidos/${encodeURIComponent(reference)}?pago=1` : null;
}

/** Espelha `MIN_INSTALLMENT_CENTS`/`MAX_INSTALLMENTS` do backend. */
export const MIN_INSTALLMENT_CENTS = 500;
export const MAX_INSTALLMENTS = 12;

/**
 * Taxa do cartão de crédito (2026-10-27): espelho de `CREDIT_CARD_FEE_BPS` /
 * `cardFeeCents` do backend (`payments/payment.rules.ts`). Só PRÉVIA — quem
 * decide o valor cobrado é o backend.
 */
export const CREDIT_CARD_FEE_BPS = 500;

export function cardFeeCents(amountCents: number) {
  return Math.round((amountCents * CREDIT_CARD_FEE_BPS) / 10_000);
}

/**
 * Limite de parcelas da loja (Configurações → Pagamento, 2026-10-28), a partir
 * do texto salvo. Espelho de `installmentLimitFrom` do backend: vazio ou
 * inválido = `MAX_INSTALLMENTS`, fora da faixa preso a 1..MAX. Só PRÉVIA —
 * quem recusa parcela acima do limite é o backend.
 */
export function installmentLimitFrom(raw: string | null | undefined): number {
  const text = (raw ?? "").trim();
  if (!/^\d{1,2}$/.test(text)) return MAX_INSTALLMENTS;
  return Math.min(MAX_INSTALLMENTS, Math.max(1, Number(text)));
}

/** Parcelas possíveis: o limite da loja e a parcela mínima, o que for menor. */
export function maxInstallmentsFor(amountCents: number, limit: number = MAX_INSTALLMENTS) {
  const cap = Math.min(MAX_INSTALLMENTS, Math.max(1, Math.floor(limit)));
  return Math.max(1, Math.min(cap, Math.floor(amountCents / MIN_INSTALLMENT_CENTS)));
}

/**
 * Centavos em BRL. Cópia do `formatCents` do carrinho porque aquele módulo é
 * `"use client"` e a página do pagamento formata no SERVIDOR.
 */
export function formatBrl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
