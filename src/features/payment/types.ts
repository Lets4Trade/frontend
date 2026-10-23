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

export function maxInstallmentsFor(amountCents: number) {
  return Math.max(1, Math.min(MAX_INSTALLMENTS, Math.floor(amountCents / MIN_INSTALLMENT_CENTS)));
}

/**
 * Centavos em BRL. Cópia do `formatCents` do carrinho porque aquele módulo é
 * `"use client"` e a página do pagamento formata no SERVIDOR.
 */
export function formatBrl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
