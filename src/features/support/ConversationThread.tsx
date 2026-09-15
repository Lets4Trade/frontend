"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ChatMessage, ConversationSummary } from "./types";
import { useConversation } from "./useConversation";

/**
 * Uma conversa dentro do popup de contato.
 *
 * Mesma linguagem dos balões da tela do pedido (Figma 2569:1776) em escala de
 * popup: o do cliente à direita com contorno laranja, o da equipe à esquerda em
 * cinza chapado, e os avisos da loja centrados, sem balão.
 */
export function ConversationThread({
  conversation,
  onBack,
  onActivity,
}: {
  conversation: ConversationSummary;
  onBack: () => void;
  /** Avisa o popup que houve mensagem nova (para a lista ficar em dia). */
  onActivity?: () => void;
}) {
  const { messages, loading, error, status, send } = useConversation(conversation.id);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    const ok = await send(text);
    setSending(false);
    if (ok) {
      setDraft("");
      onActivity?.();
      inputRef.current?.focus();
    }
  }

  const closed = conversation.status === "FECHADA";
  let lastDay = "";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-[10px] border-b border-brand-hairline px-[16px] py-[12px]">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar para as conversas"
          className="flex size-[32px] shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none"
        >
          <Image src="/icons/order/arrow.svg" alt="" width={14} height={14} aria-hidden className="size-[14px] rotate-90" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-poppins text-[14px] font-semibold text-white">{conversation.subject}</p>
          <p className="truncate font-helvetica text-[12px] text-brand-fg-subtle">
            {conversation.orderReference ? `Pedido ${conversation.orderReference} · ` : ""}
            {closed ? "Encerrada — escreva para reabrir" : "Equipe Lets4Trade"}
          </p>
        </div>
      </div>

      <div
        ref={listRef}
        className="scrollbar-orange min-h-0 flex-1 overflow-y-auto px-[16px] py-[12px]"
        aria-live="polite"
        aria-busy={loading}
      >
        {loading && messages.length === 0 ? (
          <p className="pt-[40px] text-center font-helvetica text-[13px] text-brand-fg-subtle">Carregando…</p>
        ) : (
          messages.map((message) => {
            const showDay = message.day !== lastDay;
            lastDay = message.day;
            return (
              <div key={message.id}>
                {showDay ? (
                  <p className="mx-auto my-[10px] w-fit rounded-[10px] border border-white/15 px-[12px] py-[3px] font-poppins text-[11px] text-white/80">
                    {message.day}
                  </p>
                ) : null}
                <ThreadBubble message={message} />
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className="border-t border-brand-hairline px-[16px] py-[12px]">
        <div className="flex items-center gap-[10px]">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            maxLength={2000}
            disabled={sending}
            aria-label="Escrever mensagem"
            placeholder="Escrever mensagem"
            className="h-[42px] min-w-0 flex-1 rounded-full border border-brand-border bg-[image:var(--brand-surface-fill)] px-[18px] font-poppins text-[14px] text-white outline-none placeholder:text-white/50 focus-visible:border-brand-orange disabled:opacity-60"
          />
          <button
            type="submit"
            aria-label="Enviar mensagem"
            disabled={sending || draft.trim() === ""}
            className="size-[42px] shrink-0 rounded-full transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Image src="/icons/order/send-button.svg" alt="" width={42} height={42} aria-hidden className="size-[42px]" />
          </button>
        </div>
        {error ? (
          <p role="alert" className="mt-[8px] font-helvetica text-[12px] text-red-9">{error}</p>
        ) : status !== "online" ? (
          <p role="status" className="mt-[8px] font-helvetica text-[12px] text-brand-fg-subtle">
            {status === "conectando" ? "Conectando…" : "Sem tempo real — você ainda pode enviar."}
          </p>
        ) : null}
      </form>
    </div>
  );
}

function ThreadBubble({ message }: { message: ChatMessage }) {
  if (message.from === "sistema") {
    return (
      <p className="my-[8px] text-center font-helvetica text-[12px] leading-[16px] text-brand-fg-subtle">
        {message.body}
      </p>
    );
  }

  const mine = message.from === "cliente";
  return (
    <div className={`mb-[8px] flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        title={message.at}
        className={`max-w-[85%] rounded-[12px] px-[12px] py-[8px] ${
          mine ? "border border-brand-orange bg-[image:var(--brand-surface-fill)]" : "bg-[#1b1b1b]"
        }`}
      >
        {!mine ? (
          <p className="mb-[2px] font-poppins text-[11px] font-semibold text-brand-orange">Suporte</p>
        ) : null}
        <p className="font-poppins text-[14px] leading-[20px] break-words whitespace-pre-wrap text-white">
          {message.body}
        </p>
        <p className="mt-[2px] text-right font-helvetica text-[10px] text-white/50">{message.at}</p>
      </div>
    </div>
  );
}
