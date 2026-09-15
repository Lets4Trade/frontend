"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createConversation } from "@/features/support/api";
import type { SocketStatus } from "@/features/support/socket";
import type { ChatMessage } from "@/features/support/types";
import { useConversation } from "@/features/support/useConversation";

/**
 * Chat do pedido (Figma 2569:1776) — painel de 555×696.
 *
 * Desde 2026-09-15 é uma CONVERSA DE ATENDIMENTO ligada ao pedido — a mesma que
 * aparece no popup de contato, no painel `/admin/chats` e no Discord. Os dados
 * vêm de `features/support`; este arquivo cuida só do desenho do arquivo.
 *
 * O histórico chega pronto do servidor; o socket (`/ws/support`) entrega o que
 * acontece dali em diante. Pedido sem conversa ainda: a PRIMEIRA mensagem abre
 * uma, com o assunto "Pedido <referência>".
 *
 * Os dois botões do rodapé são ASSETS INTEIROS (2571:1806 e 2571:1814): o SVG
 * exportado já traz o círculo, o preenchimento e o glifo.
 */
export function OrderChat({
  reference,
  initialConversationId,
  initialMessages,
  userAvatar,
}: {
  reference: string;
  initialConversationId: string | null;
  initialMessages: ChatMessage[];
  userAvatar?: string;
}) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const { messages, status, send, append, error } = useConversation(conversationId, {
    initialMessages,
    // O histórico já veio do servidor; e a conversa criada aqui nasce com a
    // mensagem que acabou de ser enviada.
    loadHistory: false,
  });
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  // Toda mensagem nova rola a lista para o fim — numa conversa, o que importa é
  // sempre a última linha.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (text === "" || sending) return;

    setSending(true);
    setCreateError(null);
    try {
      if (!conversationId) {
        const created = await createConversation({
          subject: `Pedido ${reference}`,
          body: text,
          orderReference: reference,
        });
        setConversationId(created.conversation.id);
        append(created.message);
        setDraft("");
      } else if (await send(text)) {
        // Limpa só depois da confirmação: se falhar, o texto fica no campo.
        setDraft("");
      }
    } catch (cause) {
      setCreateError(cause instanceof Error ? cause.message : "Mensagem não enviada.");
    } finally {
      setSending(false);
    }
  }

  const disabled = sending;
  const noteStatus: SocketStatus | "sem-conversa" = conversationId ? status : "sem-conversa";
  // O rótulo de data só aparece quando o dia MUDA — é como o arquivo mostra:
  // uma pílula acima do primeiro recado de cada dia.
  let lastDay = "";

  return (
    <section
      aria-label="Conversa sobre o pedido"
      className="flex h-[696px] w-[555px] flex-col rounded-[30px] border border-white/20 bg-[#070707] p-[25px]"
    >
      <div ref={listRef} className="scrollbar-orange min-h-0 flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="pt-[60px] text-center font-poppins text-[16px] text-brand-fg-muted">
            Ainda não há mensagens neste pedido.
          </p>
        ) : (
          messages.map((message) => {
            const showDay = message.day !== lastDay;
            lastDay = message.day;
            return (
              <div key={message.id}>
                {showDay ? <DayPill label={message.day} /> : null}
                <Bubble message={message} userAvatar={userAvatar} />
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className="mt-[25px] shrink-0">
        <div className="flex items-center gap-[15px]">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            disabled={disabled}
            maxLength={2000}
            aria-label="Escrever mensagem"
            placeholder="Escrever mensagem"
            className="h-[50px] w-[375px] rounded-full border border-brand-border bg-[image:var(--brand-surface-fill)] px-[25px] font-poppins text-[16px] tracking-[0.16px] text-white outline-none placeholder:text-white/60 focus-visible:border-brand-orange disabled:cursor-not-allowed disabled:opacity-60"
          />
          <ComposerButton
            type="submit"
            label="Enviar mensagem"
            icon="/icons/order/send-button.svg"
            disabled={disabled || draft.trim() === ""}
          />
          {/* Anexo de imagem está no arquivo, mas não há onde guardar arquivo
              nem o que fazer com ele — fica desabilitado em vez de abrir um
              seletor que não leva a lugar nenhum. */}
          <ComposerButton
            type="button"
            label="Anexar imagem (em breve)"
            icon="/icons/order/gallery-button.svg"
            disabled
          />
        </div>

        {createError || error ? (
          <p role="alert" className="mt-[12px] font-helvetica text-[13px] leading-[18px] text-red-9">
            {createError ?? error}
          </p>
        ) : (
          <ConnectionNote status={noteStatus} />
        )}
      </form>
    </section>
  );
}

/**
 * Estado da conexão, logo abaixo do campo.
 *
 * Só aparece quando NÃO está online: com a conversa funcionando, dizer "online"
 * é ruído. Sem socket o envio continua funcionando pelo HTTP — o aviso diz só
 * que as respostas não chegam sozinhas.
 */
function ConnectionNote({ status }: { status: SocketStatus | "sem-conversa" }) {
  if (status === "online") return null;

  return (
    <p
      role="status"
      className="mt-[12px] font-helvetica text-[13px] leading-[18px] text-brand-fg-subtle"
    >
      {status === "sem-conversa"
        ? "Escreva para falar com a equipe sobre este pedido."
        : status === "conectando"
          ? "Conectando à conversa…"
          : "Sem conexão em tempo real. Você ainda pode enviar; recarregue para ver respostas novas."}
    </p>
  );
}

/** Pílula de data: 117×34, raio 12, contorno branco a 15%. */
function DayPill({ label }: { label: string }) {
  return (
    // `w-fit` junto do `mx-auto`: sem ele o `flex` num bloco estica para a
    // largura toda do painel, e a pílula de 117px do arquivo vira uma faixa.
    <p className="mx-auto mt-0 mb-[27px] flex h-[34px] w-fit min-w-[117px] items-center justify-center rounded-[12px] border border-white/15 px-[20px] font-poppins text-[13px] tracking-[0.13px] text-white">
      {label}
    </p>
  );
}

/**
 * Balão de 56px de altura, raio 12, com a sombra funda do arquivo.
 *
 * O do CLIENTE vai à direita, com contorno laranja sobre o vidro e o avatar
 * DEPOIS do texto; o do suporte vai à esquerda, cinza chapado (#1b1b1b) e com o
 * avatar antes. É o que dispensa qualquer legenda de "quem falou".
 */
function Bubble({
  message,
  userAvatar,
}: {
  message: ChatMessage;
  userAvatar?: string;
}) {
  // Aviso da própria loja ("Conversa encerrada pela equipe"): linha centrada,
  // sem avatar — não é ninguém falando.
  if (message.from === "sistema") {
    return (
      <p className="mb-[15px] text-center font-helvetica text-[13px] leading-[18px] text-brand-fg-subtle">
        {message.body}
      </p>
    );
  }

  const mine = message.from === "cliente";

  return (
    <div className={`mb-[15px] flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        title={message.at}
        className={`flex min-h-[56px] max-w-full items-center gap-[10px] rounded-[12px] px-[10px] py-[7px] shadow-[0px_17px_10.1px_0px_rgba(0,0,0,0.3)] ${
          mine
            ? "flex-row-reverse border border-brand-orange bg-[image:var(--brand-surface-fill)]"
            : "bg-[#1b1b1b]"
        }`}
      >
        <Image
          src={(mine ? userAvatar : undefined) || "/images/avatar-placeholder.png"}
          alt=""
          width={42}
          height={42}
          aria-hidden
          className="size-[42px] shrink-0 rounded-full object-cover"
        />
        <p className="font-poppins text-[16px] leading-[24px] break-words text-white">
          {message.body}
        </p>
      </div>
    </div>
  );
}

function ComposerButton({
  type,
  label,
  icon,
  disabled,
}: {
  type: "submit" | "button";
  label: string;
  icon: string;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      aria-label={label}
      className="size-[50px] shrink-0 rounded-full transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Image src={icon} alt="" width={50} height={50} aria-hidden className="size-[50px]" />
    </button>
  );
}
