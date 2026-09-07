import { apiGet } from "@/lib/serverApi";
import { toMessage, type ApiMessage, type OrderMessage } from "./messages";
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
 * HISTÓRICO da conversa do pedido.
 *
 *   GET /orders/:reference/messages → { data: { items: [...] } }
 *
 * O tempo real é SOCKET (ver `OrderChat`), mas o histórico vem por HTTP e no
 * servidor: é o que a pessoa vê já pintado ao abrir a página, sem esperar o
 * socket conectar. O socket cuida do que acontece dali em diante.
 *
 * Falhar aqui não derruba a tela — a conversa aparece vazia e o socket ainda
 * entrega o que chegar.
 */
export async function getOrderMessages(reference: string): Promise<OrderMessage[]> {
  const result = await apiGet<{ items: ApiMessage[] }>(
    `/orders/${encodeURIComponent(reference)}/messages`,
  );
  if (!result.ok || !Array.isArray(result.data.items)) return [];
  return result.data.items.map(toMessage);
}
