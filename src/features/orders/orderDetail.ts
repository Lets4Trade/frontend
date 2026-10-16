import { apiGet } from "@/lib/serverApi";
import {
  toChatMessage,
  type ApiChatMessage,
  type ChatMessage,
  type ConversationSummary,
} from "@/features/support/types";
import type { Purchase } from "./types";
import { toPurchase, type ApiPurchase } from "./ordersService";

/**
 * A COMPRA que contém o pedido desta referência (2026-10-15): todos os itens
 * do mesmo carrinho, cada um com a própria situação e trilha.
 *
 * ── Contrato (../backend/src/app/orders) ────────────────────────────────────
 *   GET /orders/:reference/purchase → { data: <compra> }
 *   404                             → não é dele, ou não existe
 *
 * O backend casa referência E dono na mesma consulta, então 404 cobre os dois
 * casos de propósito: a diferença entre "não existe" e "não é seu" revelaria a
 * existência de pedidos alheios.
 */
export type PurchaseDetailResult =
  | { ok: true; purchase: Purchase }
  | { ok: false; reason: "unauthenticated" | "notfound" | "error" };

export async function getPurchaseDetail(reference: string): Promise<PurchaseDetailResult> {
  const result = await apiGet<ApiPurchase>(`/orders/${encodeURIComponent(reference)}/purchase`);

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

  const purchase = toPurchase(result.data);
  return purchase ? { ok: true, purchase } : { ok: false, reason: "error" };
}

/**
 * A conversa de atendimento MAIS RECENTE da COMPRA, com o histórico — o
 * backend procura entre todos os itens do mesmo pagamento (uma conversa por
 * compra, 2026-10-15).
 *
 *   GET /support/orders/:reference → { data: { conversation?, messages? } }
 *
 * Desde 2026-09-15 a conversa do pedido é uma conversa de atendimento como as
 * do popup (ver `features/support`). Pedido sem conversa devolve `null` — a tela
 * abre uma no primeiro envio.
 *
 * Falhar aqui não derruba a tela: a conversa aparece vazia.
 */
export async function getOrderConversation(
  reference: string,
): Promise<{ conversation: ConversationSummary | null; messages: ChatMessage[] }> {
  const result = await apiGet<{ conversation?: ConversationSummary; messages?: ApiChatMessage[] }>(
    `/support/orders/${encodeURIComponent(reference)}`,
  );
  if (!result.ok) return { conversation: null, messages: [] };
  return {
    // Falsy, não `=== null`: o backend apaga o campo nulo da resposta.
    conversation: result.data.conversation || null,
    messages: Array.isArray(result.data.messages) ? result.data.messages.map(toChatMessage) : [],
  };
}
