import { apiGet } from "@/lib/serverApi";
import { normalizePayment } from "./api";
import { readSavedCards, type SavedCard } from "./savedCards";
import type { PaymentView } from "./types";

/**
 * Cartões salvos da conta, lidos no SERVIDOR (2026-11-02). Falha ou sem sessão
 * = lista vazia: o checkout continua com o formulário de cartão de sempre.
 */
export async function getSavedCards(): Promise<SavedCard[]> {
  const result = await apiGet<unknown>("/payments/cards");
  return result.ok ? readSavedCards(result.data) : [];
}

export type PaymentResult =
  | { ok: true; payment: PaymentView }
  | { ok: false; reason: "unauthenticated" | "notfound" | "error" };

/**
 * O pagamento, lido no SERVIDOR com a sessão da requisição (2026-09-24).
 *
 * `GET /payments/:id` só devolve o pagamento do DONO: o de outra pessoa e o
 * inexistente respondem o mesmo 404, e a tela trata os dois igual.
 */
export async function getPayment(id: string): Promise<PaymentResult> {
  const result = await apiGet<PaymentView>(`/payments/${encodeURIComponent(id)}`);
  if (!result.ok) {
    return {
      ok: false,
      reason:
        result.reason === "unauthenticated"
          ? "unauthenticated"
          : result.status === 404
            ? "notfound"
            : "error",
    };
  }
  return { ok: true, payment: normalizePayment(result.data) };
}
