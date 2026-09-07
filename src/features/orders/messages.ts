/**
 * Mensagem da conversa do pedido — tipo e tradução.
 *
 * Fica separado de `orderDetail.ts` porque este arquivo precisa rodar no
 * CLIENTE: as mensagens que chegam pelo socket passam pela mesma tradução que o
 * histórico lido no servidor, e `orderDetail.ts` importa `next/headers`, que só
 * existe no servidor.
 */

export type OrderMessage = {
  id: string;
  /** Quem escreveu: o cliente ou o time. */
  from: "cliente" | "suporte";
  body: string;
  /** Já formatada (ex.: "16 Abril") — é o rótulo de dia que o arquivo mostra. */
  day: string;
  /** Horário, para o `title` do balão. */
  at: string;
};

export type ApiMessage = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};

/**
 * O fuso é FIXADO em São Paulo, e não deixado no do processo: o servidor Node
 * roda em UTC no container, e sem isto uma mensagem das 21h apareceria com a
 * data do dia seguinte.
 */
const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  timeZone: "America/Sao_Paulo",
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function toMessage(api: ApiMessage): OrderMessage {
  const date = new Date(api.createdAt);
  const valid = !Number.isNaN(date.getTime());

  return {
    id: api.id,
    // Qualquer autor desconhecido vira "suporte": é o lado conservador — uma
    // mensagem exibida como se fosse do cliente sugere que ele disse algo que
    // não disse.
    from: api.author === "CLIENTE" ? "cliente" : "suporte",
    body: api.body,
    day: valid ? capitalize(dayFormatter.format(date)) : "",
    at: valid ? timeFormatter.format(date) : "",
  };
}

/**
 * "16 de abril" → "16 Abril", como o arquivo escreve.
 *
 * O `Intl` do pt-BR devolve o mês em minúscula e com o "de" no meio; o desenho
 * usa as duas coisas diferentes. A capitalização é do MÊS, não da string — a
 * primeira letra é o dia.
 */
function capitalize(formatted: string) {
  return formatted
    .replace(" de ", " ")
    .replace(/\s(\p{Ll})/u, (_, letter: string) => ` ${letter.toUpperCase()}`);
}
