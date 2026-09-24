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
  orders: {
    reference: string;
    productName: string;
    productImageUrl?: string;
    platform: string;
    quantity: string;
    totalPrice: string;
    discountCents?: number;
    status: string;
  }[];
};

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
