"use server";

import { redirect } from "next/navigation";
import { getSessionRole } from "@/features/auth/session";
import { canAccess } from "@/features/admin/permissions";
import { apiPost } from "@/lib/serverApi";
import { CHAT_PARAM } from "./types";

/**
 * "Abrir conversa" de um pedido que ainda não tem (os pagos antes de
 * 2026-10-20). POST e de um botão, nunca no carregamento da página: um link
 * ou um prefetch não pode criar conversa. O backend devolve a existente se
 * alguém abriu no meio tempo.
 */
export async function openOrderChatAction(reference: string): Promise<{ ok: false; message: string } | never> {
  if (!canAccess(await getSessionRole(), "support")) {
    return { ok: false, message: "Só atendentes abrem conversas." };
  }
  const result = await apiPost<{ conversationId?: string }>(
    `/admin/support/orders/${encodeURIComponent(reference)}/conversation`,
    {},
  );
  const id = result.ok ? result.data.conversationId : undefined;
  if (!id) return { ok: false, message: "Não foi possível abrir a conversa. Tente de novo." };
  // `situacao=` vazio = todas: a conversa aparece na lista mesmo encerrada.
  redirect(`/admin/chats?${CHAT_PARAM.status}=&${CHAT_PARAM.conversation}=${encodeURIComponent(id)}`);
}
