import { fetchWithSession } from "@/lib/browserSession";
import {
  toChatMessage,
  type ApiChatMessage,
  type ChatMessage,
  type ConversationSummary,
} from "./types";

/**
 * Chamadas do NAVEGADOR ao atendimento (`/api/v1/support`).
 *
 * `fetchWithSession` renova o token uma vez se voltar 401: o popup pode ficar
 * aberto por mais que os 15 minutos do access.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

const HEADERS = {
  "content-type": "application/json",
  accept: "application/json",
  "x-pt-surface": "client",
};

export class SupportError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "SupportError";
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (API_URL === "") throw new SupportError(0, "Atendimento indisponível.");

  let response: Response;
  try {
    response = await fetchWithSession(`${API_URL}/support${path}`, {
      ...init,
      headers: { ...HEADERS, ...init.headers },
    });
  } catch {
    throw new SupportError(0, "Sem conexão. Tente de novo em instantes.");
  }

  if (response.status === 204) return undefined as T;

  let body: { data?: T; message?: unknown } | null = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    // A mensagem do backend só chega à tela quando é texto curto e legível
    // (ex.: o teto de conversas abertas). O resto vira genérico.
    const message =
      typeof body?.message === "string" && body.message.length < 200 && response.status < 500
        ? body.message
        : "Não foi possível completar agora. Tente de novo.";
    throw new SupportError(response.status, message);
  }

  return body?.data as T;
}

export type ConversationPage = {
  items: ConversationSummary[];
  total: number;
  page: number;
  limit: number;
};

export function listConversations(page = 1): Promise<ConversationPage> {
  return call<ConversationPage>(`/conversations?page=${page}&limit=20`);
}

export async function unreadCount(): Promise<number> {
  const data = await call<{ count?: number }>("/conversations/unread");
  return data?.count ?? 0;
}

export async function openConversation(
  id: string,
): Promise<{ conversation: ConversationSummary; messages: ChatMessage[] }> {
  const data = await call<{ conversation: ConversationSummary; messages?: ApiChatMessage[] }>(
    `/conversations/${encodeURIComponent(id)}`,
  );
  return { conversation: data.conversation, messages: (data.messages ?? []).map(toChatMessage) };
}

export async function createConversation(input: {
  subject: string;
  body: string;
  orderReference?: string;
}): Promise<{ conversation: ConversationSummary; message: ChatMessage }> {
  const data = await call<{ conversation: ConversationSummary; message: ApiChatMessage }>(
    "/conversations",
    { method: "POST", body: JSON.stringify(input) },
  );
  return { conversation: data.conversation, message: toChatMessage(data.message) };
}

/** Caminho alternativo ao socket — usado quando ele não está conectado. */
export async function sendMessageHttp(id: string, body: string): Promise<ChatMessage> {
  const data = await call<{ message: ApiChatMessage }>(
    `/conversations/${encodeURIComponent(id)}/messages`,
    { method: "POST", body: JSON.stringify({ body }) },
  );
  return toChatMessage(data.message);
}

export async function markRead(id: string): Promise<void> {
  await call<void>(`/conversations/${encodeURIComponent(id)}/read`, { method: "POST" });
}

/** Pedidos da pessoa, para o campo opcional "sobre qual pedido". */
export async function listRecentOrders(): Promise<{ reference: string; label: string }[]> {
  if (API_URL === "") return [];
  try {
    const response = await fetchWithSession(`${API_URL}/orders?page=1&limit=20`, {
      headers: HEADERS,
    });
    if (!response.ok) return [];
    const body = (await response.json()) as {
      data?: { items?: { reference: string; productName?: string }[] };
    };
    return (body.data?.items ?? []).map((order) => ({
      reference: order.reference,
      label: order.productName ? `${order.reference} · ${order.productName}` : order.reference,
    }));
  } catch {
    return [];
  }
}
