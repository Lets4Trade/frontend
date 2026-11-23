/**
 * Regras PURAS do aviso de mensagem nova no painel (2026-11-23) — separadas
 * para teste, sem React nem socket. Ver `ChatAlerts.tsx`.
 */

/** O aviso só vale para quem ESCREVEU é o cliente. */
export function isClientMessage(message: { author?: string } | null | undefined): boolean {
  return message?.author === "CLIENTE";
}

/**
 * A equipe já está OLHANDO essa conversa (aberta em `/admin/chats` com a aba à
 * vista): o quadro marca como lida na hora, então não precisa de aviso.
 */
export function isViewingConversation(
  conversationId: string,
  location: { pathname: string; search: string },
  hidden: boolean,
): boolean {
  if (hidden || !location.pathname.startsWith("/admin/chats")) return false;
  return new URLSearchParams(location.search).get("conversa") === conversationId;
}

/**
 * "(3) Chats — Painel": o número de conversas esperando no TÍTULO da aba, para
 * quem está em outra aba. Tira um prefixo anterior antes de pôr o novo.
 */
export function titleWithCount(title: string, count: number): string {
  const base = title.replace(/^\(\d+\+?\)\s+/, "");
  if (count <= 0) return base;
  return `(${count > 99 ? "99+" : count}) ${base}`;
}

/** Texto curto da mensagem para o aviso (uma linha). */
export function previewOf(body: string, max = 90): string {
  const line = body.replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}
