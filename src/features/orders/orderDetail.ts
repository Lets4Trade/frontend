import { apiGet } from "@/lib/serverApi";
import {
  toChatMessage,
  type ApiChatMessage,
  type ChatMessage,
  type ConversationSummary,
} from "@/features/support/types";
import type { Order } from "./types";
import { toOrder, type ApiOrder } from "./ordersService";

/**
 * Um pedido, pela referência que o cliente vê.
 *
 * ── Contrato (../backend/src/app/orders) ────────────────────────────────────
 *   GET /orders/:reference → { data: <pedido> }
 *   404                    → não é dele, ou não existe
 *
 * O backend casa referência E dono na mesma consulta, então 404 cobre os dois
 * casos de propósito: a diferença entre "não existe" e "não é seu" revelaria a
 * existência de pedidos alheios.
 */
export type OrderDetailResult =
  | { ok: true; order: Order; reference: string }
  | { ok: false; reason: "unauthenticated" | "notfound" | "error" };

export async function getOrderDetail(reference: string): Promise<OrderDetailResult> {
  const result = await apiGet<ApiOrder>(`/orders/${encodeURIComponent(reference)}`);

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

  return { ok: true, order: toOrder(result.data), reference: result.data.reference };
}

/**
 * A conversa de atendimento MAIS RECENTE do pedido, com o histórico.
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
