/**
 * Atendimento — tipos e tradução das respostas do backend.
 *
 * Arquivo PURO (sem `next/headers`): roda no navegador, porque as mensagens que
 * chegam pelo socket passam pela mesma tradução que o histórico.
 *
 * ⚠️ O backend apaga campo nulo das respostas HTTP (`ResponseCompressionInterceptor`),
 * mas o socket entrega o objeto inteiro. Todo campo anulável é opcional aqui e
 * testado por falsy — nunca `=== null`.
 */

export type ConversationStatus = "ABERTA" | "FECHADA";

export type ConversationSummary = {
  id: string;
  subject: string;
  status: ConversationStatus;
  orderReference?: string | null;
  lastMessageAt: string;
  lastPreview?: string | null;
  /** Há resposta da equipe que esta pessoa ainda não viu. */
  unread?: boolean;
  createdAt: string;
};

export type ApiChatMessage = {
  id: string;
  conversationId: string;
  author: string;
  body: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  /** Quem escreveu. `sistema` é a própria loja ("Conversa encerrada"). */
  from: "cliente" | "suporte" | "sistema";
  body: string;
  createdAt: string;
  /** Já formatada ("16 Abril") — rótulo de dia. */
  day: string;
  /** "14:32". */
  at: string;
};

/**
 * O fuso é FIXO em São Paulo: o servidor Node roda em UTC no container, e sem
 * isto uma mensagem das 21h apareceria com a data do dia seguinte.
 */
const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  timeZone: "America/Sao_Paulo",
});

const shortDayFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function toChatMessage(api: ApiChatMessage): ChatMessage {
  const date = new Date(api.createdAt);
  const valid = !Number.isNaN(date.getTime());

  return {
    id: api.id,
    conversationId: api.conversationId,
    // Autor desconhecido vira "suporte": exibir como se fosse do cliente
    // sugeriria que ele disse algo que não disse.
    from: api.author === "CLIENTE" ? "cliente" : api.author === "SISTEMA" ? "sistema" : "suporte",
    body: api.body,
    createdAt: api.createdAt,
    day: valid ? capitalize(dayFormatter.format(date)) : "",
    at: valid ? timeFormatter.format(date) : "",
  };
}

/** Hora se foi hoje, "dd/mm" se não — o canto da linha da lista. */
export function listTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const sameDay = shortDayFormatter.format(date) === shortDayFormatter.format(now);
  return sameDay ? timeFormatter.format(date) : shortDayFormatter.format(date);
}

/** Acrescenta ou troca uma mensagem, mantendo a ordem de chegada e sem repetir. */
export function mergeMessage(list: ChatMessage[], message: ChatMessage): ChatMessage[] {
  if (list.some((item) => item.id === message.id)) return list;
  return [...list, message];
}

/**
 * "16 de abril" → "16 Abril", como o arquivo do Figma escreve. A capitalização é
 * do MÊS — a primeira letra é o dia.
 */
function capitalize(formatted: string) {
  return formatted
    .replace(" de ", " ")
    .replace(/\s(\p{Ll})/u, (_, letter: string) => ` ${letter.toUpperCase()}`);
}
