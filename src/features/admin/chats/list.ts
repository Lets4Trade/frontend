import { apiGet } from "@/lib/serverApi";
import type {
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
    messages: Array.isArray(result.data.messages) ? result.data.messages : [],
  };
}
