"use client";

import { UnreadDot } from "@/features/admin/UnreadDot";
import { chatUnreadCounter } from "./chatUnread";

const EVENTS = ["equipe:mensagem", "equipe:conversa"] as const;

/** Ponto em "Chats": mensagem de cliente que a equipe não abriu (2026-10-28). */
export function ChatsUnreadDot() {
  return (
    <UnreadDot
      counter={chatUnreadCounter}
      events={EVENTS}
      label={(count) => (count === 1 ? "1 conversa com mensagem nova" : `${count} conversas com mensagem nova`)}
    />
  );
}
