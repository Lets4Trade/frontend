import { createUnreadCounter } from "@/features/admin/unreadCounter";
import { getStaffUnreadCount } from "./api";

/**
 * Conversas com mensagem do cliente que a equipe não abriu (2026-10-28) — o
 * ponto ao lado de "Chats" no menu do painel. A regra é do backend
 * (`GET /admin/support/conversations/unread`); ver `unreadCounter.ts`.
 */
export const chatUnreadCounter = createUnreadCounter(getStaffUnreadCount);

export const refreshChatUnread = chatUnreadCounter.refresh;
