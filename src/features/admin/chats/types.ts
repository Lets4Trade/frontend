/**
 * Atendimento no painel — tipos e montagem de URL.
 *
 * Arquivo PURO: o quadro de conversas é client component, e `list.ts` puxa
 * `serverApi` → `next/headers` (a separação que já quebrou o build duas vezes).
 */

export type StaffConversation = {
  id: string;
  userId: string;
  subject: string;
  status: "ABERTA" | "FECHADA";
  orderReference?: string | null;
  lastMessageAt: string;
  lastAuthor?: string | null;
  lastPreview?: string | null;
  /** Há mensagem do cliente que a equipe ainda não abriu. */
  unread?: boolean;
  assignee?: { id: string; name: string } | null;
  customer: { id: string; name: string; username?: string | null };
  discordChannelId?: string | null;
  createdAt: string;
};

export type StaffMessage = {
  id: string;
  conversationId: string;
  author: "CLIENTE" | "SUPORTE" | "SISTEMA" | string;
  authorName?: string | null;
  source: "SITE" | "DISCORD" | string;
  body: string;
  createdAt: string;
};

export type StaffConversationDetail = {
  conversation: StaffConversation;
  contact: { whatsapp?: string | null; discordId?: string | null };
  messages: StaffMessage[];
};

export type StaffConversationPage = {
  items: StaffConversation[];
  total: number;
  page: number;
  limit: number;
};

/** Nomes na URL (pt-BR, como o resto do painel). */
export const CHAT_PARAM = {
  status: "situacao",
  queue: "fila",
  search: "busca",
  page: "pagina",
  conversation: "conversa",
} as const;

export const QUEUES = [
  { value: "todas", label: "Todas as filas" },
  { value: "sem-atendente", label: "Sem atendente" },
  { value: "minhas", label: "Minhas conversas" },
] as const;

export const STATUSES = [
  { value: "", label: "Todas as situações" },
  { value: "ABERTA", label: "Abertas" },
  { value: "FECHADA", label: "Encerradas" },
] as const;

export type ChatsQuery = {
  status: string;
  queue: string;
  search: string;
  page: number;
  conversation: string;
};

type RawParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * Lê e valida a URL. Padrão: abertas, todas as filas — é a pergunta de quem
 * abre a tela ("o que está esperando resposta").
 */
export function parseChatsQuery(params: RawParams): ChatsQuery {
  const status = first(params[CHAT_PARAM.status]);
  const queue = first(params[CHAT_PARAM.queue]) ?? "";
  const page = Number.parseInt(first(params[CHAT_PARAM.page]) ?? "1", 10);
  const conversation = first(params[CHAT_PARAM.conversation]) ?? "";

  return {
    // Ausente = "ABERTA"; `situacao=` explícito e vazio = todas.
    status: status === undefined ? "ABERTA" : STATUSES.some((s) => s.value === status) ? status : "ABERTA",
    queue: QUEUES.some((q) => q.value === queue) ? queue : "todas",
    search: (first(params[CHAT_PARAM.search]) ?? "").slice(0, 80),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    conversation: /^[a-z0-9_]{8,64}$/i.test(conversation) ? conversation : "",
  };
}

export function buildChatsHref(query: ChatsQuery, patch: Partial<ChatsQuery>): string {
  const next = { ...query, ...patch };
  // Mudar filtro volta à página 1 e fecha a conversa aberta; trocar só a
  // conversa ou a página não mexe no resto.
  const filterChanged = ["status", "queue", "search"].some((key) => key in patch);
  if (filterChanged && patch.page === undefined) next.page = 1;

  const search = new URLSearchParams();
  if (next.status !== "ABERTA") search.set(CHAT_PARAM.status, next.status);
  if (next.queue !== "todas") search.set(CHAT_PARAM.queue, next.queue);
  if (next.search) search.set(CHAT_PARAM.search, next.search);
  if (next.page > 1) search.set(CHAT_PARAM.page, String(next.page));
  if (next.conversation) search.set(CHAT_PARAM.conversation, next.conversation);

  const qs = search.toString();
  return qs ? `/admin/chats?${qs}` : "/admin/chats";
}
