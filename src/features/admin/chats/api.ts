import { fetchWithSession } from "@/lib/browserSession";
import type { StaffConversation, StaffMessage } from "./types";

/**
 * Escritas do painel de atendimento, pelo NAVEGADOR direto ao backend.
 *
 * Não são server actions: responder precisa ser imediato e a tela já está
 * ligada ao socket — uma ida ao servidor do Next e de volta só somaria latência.
 * Quem autoriza é o `RolesGuard` do backend, como em toda rota `/admin/`.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
const HEADERS = {
  "content-type": "application/json",
  accept: "application/json",
  "x-pt-surface": "client",
};

async function call<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetchWithSession(`${API_URL}/admin/support${path}`, {
    ...init,
    headers: HEADERS,
  });
  const body = (await response.json().catch(() => null)) as { data?: T; message?: unknown } | null;
  if (!response.ok) {
    throw new Error(
      typeof body?.message === "string" && response.status < 500
        ? body.message
        : "Não foi possível completar agora.",
    );
  }
  return body?.data as T;
}

export function replyAsStaff(conversationId: string, body: string) {
  return call<{ conversation: StaffConversation; message: StaffMessage }>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    { method: "POST", body: JSON.stringify({ body }) },
  );
}

export function updateConversation(
  conversationId: string,
  patch: { status?: "ABERTA" | "FECHADA"; assigneeId?: string | null },
) {
  return call<StaffConversation>(`/conversations/${encodeURIComponent(conversationId)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}
