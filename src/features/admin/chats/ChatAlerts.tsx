"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { browserNotificationsOn } from "@/features/admin/sales/SaleAlerts";
import { useSupportSocket } from "@/features/support/socket";
import { playChime, useAudioUnlock } from "@/lib/chime";
import { cn } from "@/lib/cn";
import {
  isClientMessage,
  isViewingConversation,
  previewOf,
  titleWithCount,
} from "./chatAlertRules";
import type { StaffConversation, StaffMessage } from "./types";

/**
 * Aviso de MENSAGEM NOVA de cliente no painel (2026-11-23, pedido do usuário:
 * "depois da primeira mensagem a gente não tem nenhum indicador quando chega
 * uma nova mensagem").
 *
 * O ponto que existia ficava dentro do grupo "Vendas" do menu — e esse grupo
 * vive aceso pelas propostas novas, então mensagem nova não mudava NADA à vista.
 * Agora, para ADMIN e ATENDENTE, em qualquer tela do painel:
 *   - botão de chat no cabeçalho com o NÚMERO de conversas esperando a equipe
 *     (a mesma contagem do backend do ponto do menu, `chatUnreadCounter`);
 *   - card no canto + som a cada mensagem do cliente numa conversa que a pessoa
 *     NÃO está olhando, com "Abrir conversa" (some em 15 s);
 *   - notificação do navegador com a aba em segundo plano, se o sino estiver
 *     ligado (o mesmo sino das vendas);
 *   - "(N)" no título da aba.
 *
 * Som no máximo a cada 4 s: uma rajada de mensagens não vira sirene.
 */

const AUTO_DISMISS_MS = 15_000;
const CHIME_GAP_MS = 4_000;
const MAX_CARDS = 3;

type ChatCard = {
  /** Uma por conversa: mensagem nova da mesma conversa troca o card. */
  conversationId: string;
  customer: string;
  subject: string;
  preview: string;
};

export function ChatAlerts({ count }: { count: number }) {
  const { socket } = useSupportSocket(true);
  const audio = useAudioUnlock();
  const [cards, setCards] = useState<ChatCard[]>([]);
  const lastChime = useRef(0);
  const timers = useRef(new Map<string, number>());

  const dismiss = (conversationId: string) => {
    setCards((current) =>
      current.filter((card) => card.conversationId !== conversationId),
    );
    const timer = timers.current.get(conversationId);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(conversationId);
  };

  useEffect(() => {
    if (!socket) return;
    const pending = timers.current;
    const onMessage = (payload: {
      conversation?: StaffConversation;
      message?: StaffMessage;
    }) => {
      const { conversation, message } = payload ?? {};
      if (!conversation || !isClientMessage(message)) return;
      if (
        isViewingConversation(conversation.id, window.location, document.hidden)
      )
        return;

      const card: ChatCard = {
        conversationId: conversation.id,
        customer: conversation.customer?.name || "Cliente",
        subject: conversation.orderReference
          ? `Pedido ${conversation.orderReference}`
          : conversation.subject,
        preview: previewOf(message?.body ?? ""),
      };
      setCards((current) =>
        [
          card,
          ...current.filter(
            (item) => item.conversationId !== card.conversationId,
          ),
        ].slice(0, MAX_CARDS),
      );
      const old = pending.get(card.conversationId);
      if (old) window.clearTimeout(old);
      pending.set(
        card.conversationId,
        window.setTimeout(() => {
          setCards((current) =>
            current.filter(
              (item) => item.conversationId !== card.conversationId,
            ),
          );
          pending.delete(card.conversationId);
        }, AUTO_DISMISS_MS),
      );

      const now = Date.now();
      if (now - lastChime.current >= CHIME_GAP_MS) {
        lastChime.current = now;
        playChime(audio.current);
      }
      notifyBrowser(card);
    };
    socket.on("equipe:mensagem", onMessage);
    return () => {
      socket.off("equipe:mensagem", onMessage);
      pending.forEach((timer) => window.clearTimeout(timer));
      pending.clear();
    };
  }, [socket, audio]);

  useTabTitleCount(count);

  const label =
    count > 0
      ? `Chats: ${count === 1 ? "1 conversa esperando resposta" : `${count} conversas esperando resposta`}`
      : "Chats: nenhuma conversa esperando";

  return (
    <>
      <Link
        href="/admin/chats"
        aria-label={label}
        title={label}
        className={cn(
          "relative flex size-[40px] shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none",
          count > 0
            ? "border-brand-orange/70 text-brand-orange hover:border-brand-orange"
            : "border-white/15 text-white/60 hover:border-white/30 hover:text-white",
        )}
      >
        <svg
          viewBox="0 0 24 24"
          className="size-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path
            d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12Z"
            strokeLinejoin="round"
          />
        </svg>
        {count > 0 ? (
          <span
            aria-hidden
            className="chat-count-in absolute -top-[6px] -right-[6px] flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-brand-orange px-[5px] font-poppins text-[11px] font-bold text-black shadow-[0_0_10px_rgba(255,115,0,0.8)]"
          >
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Link>

      {/* PORTAL no `body`: o cabeçalho tem `backdrop-filter`, que vira o
          "quadro" de quem é `fixed` dentro dele — sem o portal o card nascia
          preso no alto da tela, cortado. Cards só existem depois de um evento
          do socket, então `document` já existe. */}
      {cards.length > 0
        ? createPortal(
            <div
              role="status"
              aria-live="polite"
              // Abaixo dos avisos de venda (top 96px): os dois podem aparecer juntos.
              className="fixed right-[16px] bottom-[16px] z-[60] flex w-[360px] max-w-[calc(var(--vw)-32px)] flex-col gap-[10px]"
            >
              {cards.map((card) => (
                <div
                  key={card.conversationId}
                  className="sale-alert-in rounded-[20px] border border-brand-orange/60 bg-brand-surface p-[16px] shadow-[0_16px_40px_rgba(0,0,0,.6)]"
                >
                  <div className="flex items-start justify-between gap-[10px]">
                    <p className="font-poppins text-[12px] font-bold tracking-[0.06em] text-brand-orange uppercase">
                      💬 Nova mensagem
                    </p>
                    <button
                      type="button"
                      onClick={() => dismiss(card.conversationId)}
                      aria-label="Fechar aviso de mensagem"
                      className="-mt-[4px] -mr-[4px] flex size-[28px] items-center justify-center rounded-full font-poppins text-[16px] text-white/60 hover:bg-white/10 hover:text-white"
                    >
                      ×
                    </button>
                  </div>
                  <p className="mt-[4px] truncate font-poppins text-[16px] font-bold text-white">
                    {card.customer}
                  </p>
                  <p className="truncate font-helvetica text-[12px] text-brand-fg-subtle">
                    {card.subject}
                  </p>
                  {card.preview ? (
                    <p className="mt-[8px] line-clamp-2 font-helvetica text-[13px] leading-[18px] text-white/90">
                      {card.preview}
                    </p>
                  ) : null}
                  <div className="mt-[12px] flex justify-end">
                    <Link
                      href={`/admin/chats?conversa=${encodeURIComponent(card.conversationId)}`}
                      onClick={() => dismiss(card.conversationId)}
                      className="flex h-[34px] items-center rounded-full bg-[image:var(--brand-orange-gradient)] px-[16px] font-poppins text-[13px] font-bold text-white hover:opacity-90"
                    >
                      Abrir conversa
                    </Link>
                  </div>
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/**
 * "(N)" no título da aba. O Next troca o `<title>` a cada navegação, então um
 * observador repõe o número quando o título muda (só reescreve se o texto for
 * outro — sem laço).
 */
function useTabTitleCount(count: number) {
  useEffect(() => {
    const apply = () => {
      const next = titleWithCount(document.title, count);
      if (next !== document.title) document.title = next;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    return () => {
      observer.disconnect();
      const clean = titleWithCount(document.title, 0);
      if (clean !== document.title) document.title = clean;
    };
  }, [count]);
}

function notifyBrowser(card: ChatCard) {
  try {
    // Só com o sino LIGADO e a aba em segundo plano (com a aba à vista, o card basta).
    if (!browserNotificationsOn() || !document.hidden) return;
    const notification = new Notification(`Nova mensagem — ${card.customer}`, {
      body: card.preview || card.subject,
      tag: `chat-${card.conversationId}`,
    });
    notification.onclick = () => {
      window.focus();
      // Fora do React (clique na notificação do sistema): navegação comum.
      window.location.assign(
        new URL(
          `/admin/chats?conversa=${encodeURIComponent(card.conversationId)}`,
          window.location.origin,
        ).toString(),
      );
    };
  } catch {
    // Alguns navegadores (iOS) não criam notificação fora de service worker.
  }
}
