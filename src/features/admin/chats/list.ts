import { toPurchase, type ApiPurchase } from "@/features/orders/ordersService";
import { statusPill, trackNote } from "@/features/orders/PurchaseCard";
import { apiGet } from "@/lib/serverApi";
import type {
  ChatOrder,
  ChatsQuery,
  StaffConversationDetail,
  StaffConversationPage,
} from "./types";

/**
 * Leituras da tela `/admin/chats`, no SERVIDOR (cookie reencaminhado pelo
 * `serverApi`). Falha vira lista vazia / conversa ausente, nunca exceção.
 */

export async function getStaffConversations(query: ChatsQuery): Promise<StaffConversationPage> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.queue !== "todas") params.set("queue", query.queue);
  if (query.search) params.set("search", query.search);
  params.set("page", String(query.page));
  params.set("limit", "25");

  const result = await apiGet<StaffConversationPage>(`/admin/support/conversations?${params}`);
  if (!result.ok) return { items: [], total: 0, page: 1, limit: 25 };
  return {
    items: Array.isArray(result.data.items) ? result.data.items : [],
    total: result.data.total ?? 0,
    page: result.data.page ?? 1,
    limit: result.data.limit ?? 25,
  };
}

export async function getStaffConversation(id: string): Promise<StaffConversationDetail | null> {
  if (!id) return null;
  const result = await apiGet<StaffConversationDetail>(
    `/admin/support/conversations/${encodeURIComponent(id)}`,
  );
  if (!result.ok) return null;
  return {
    conversation: result.data.conversation,
    contact: result.data.contact ?? {},
    notes: result.data.notes ?? {},
    messages: Array.isArray(result.data.messages) ? result.data.messages : [],
  };
}

/**
 * O pedido de uma conversa, para o quadro ao lado do chat (2026-10-20).
 *
 * Pela busca de `/admin/orders` (ADMIN e SUPPORT, o mesmo recorte da tabela de
 * pedidos) com a referência EXATA: a busca casa por trecho, e um "V12" não
 * pode mostrar o pedido "V1234". Falha ou ausência vira `null` — o chat abre
 * do mesmo jeito, só sem o quadro.
 */
/** A linha de `/admin/orders`: o pedido do cliente + o código antigo de cada item. */
type ChatOrderRow = Omit<ApiPurchase, "items"> & {
  items: (ApiPurchase["items"][number] & { legacyReference?: string | null })[];
};

export async function getChatOrder(reference: string | null | undefined): Promise<ChatOrder | null> {
  if (!reference) return null;
  const params = new URLSearchParams({ search: reference, limit: "10" });
  const result = await apiGet<{ items?: ChatOrderRow[] }>(`/admin/orders?${params}`);
  if (!result.ok || !Array.isArray(result.data.items)) return null;

  const wanted = reference.toUpperCase();
  const match = result.data.items.find(
    (order) =>
      order.reference?.toUpperCase() === wanted ||
      (Array.isArray(order.items) && order.items.some((item) => item.legacyReference?.toUpperCase() === wanted)),
  );
  if (!match) return null;
  const purchase = toPurchase(match);
  if (!purchase) return null;
  return {
    purchase,
    pill: statusPill(purchase),
    note: trackNote(purchase),
    admin: { id: match.id, status: match.status, deliveryStatus: match.deliveryStatus ?? null },
  };
}
