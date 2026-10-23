"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { playChime, useAudioUnlock } from "@/lib/chime";
import { useSupportSocket } from "./socket";
import type { ConversationSummary } from "./types";

/**
 * Aviso de RESPOSTA da equipe para o cliente (2026-10-23, pedido do usuário:
 * "notificação de chat pro usuário quando o atendente mandar mensagem, igual o
 * atendente recebe"). O mesmo trio do aviso de venda do painel:
 *
 *   - card no canto, acima do botão do chat, com a prévia e "Abrir";
 *   - som curto (Web Audio, `lib/chime`);
 *   - notificação do NAVEGADOR — só se a pessoa ligou no popup e a aba está em
 *     segundo plano (com a aba à vista, o card basta).
 *
 * O servidor já manda o resumo da conversa (`conversa`) à sala da conta a cada
 * mensagem; aqui só se ESCUTA. Avisa apenas resposta da EQUIPE (`lastAuthor`),
 * nunca a própria mensagem nem aviso do sistema, e não avisa quem já está
 * olhando aquela conversa.
 *
 * Custo: com sessão, o socket do atendimento fica aberto em toda página da loja
 * (antes só com o popup ou a tela do pedido abertos). É uma conexão por aba
 * logada — o preço de o aviso chegar na hora, sem consulta a cada N segundos.
 */

type Summary = ConversationSummary & { lastAuthor?: string | null };

const AUTO_DISMISS_MS = 15_000;
const NOTIFY_KEY = "l4t:avisos-chat";

export function useReplyAlerts({
  enabled,
  isViewing,
  onReply,
}: {
  enabled: boolean;
  /** A pessoa já está com esta conversa aberta e à vista? */
  isViewing: (summary: ConversationSummary) => boolean;
  /** Resposta nova (para recontar as não lidas). */
  onReply: () => void;
}) {
  const { socket } = useSupportSocket(enabled);
  const audio = useAudioUnlock();
  const [alert, setAlert] = useState<ConversationSummary | null>(null);
  const seen = useRef(new Set<string>());
  const viewingRef = useRef(isViewing);
  const onReplyRef = useRef(onReply);

  useEffect(() => {
    viewingRef.current = isViewing;
    onReplyRef.current = onReply;
  });

  useEffect(() => {
    if (!socket) return;
    const onUpdate = (raw: Summary) => {
      if (!raw || typeof raw.id !== "string" || raw.lastAuthor !== "SUPORTE" || !raw.unread) return;
      const key = `${raw.id}:${raw.lastMessageAt}`;
      if (seen.current.has(key)) return;
      seen.current.add(key);
      onReplyRef.current();
      if (viewingRef.current(raw) && !document.hidden) return;
      setAlert(raw);
      playChime(audio.current);
      notifyBrowser(raw);
    };
    socket.on("conversa", onUpdate);
    return () => {
      socket.off("conversa", onUpdate);
    };
  }, [socket, audio]);

  useEffect(() => {
    if (!alert) return;
    const timer = window.setTimeout(() => setAlert(null), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [alert]);

  const dismiss = useCallback(() => setAlert(null), []);
  return { alert, dismiss };
}

/** O card no canto, no mesmo lugar onde o popup abre. */
export function ReplyAlertCard({
  alert,
  onOpen,
  onDismiss,
}: {
  alert: ConversationSummary;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="contact-float fixed right-[16px] bottom-[96px] z-40 w-[340px] max-w-[calc(100vw-32px)] rounded-[20px] border border-brand-orange/60 bg-brand-surface p-[14px] shadow-[0_16px_40px_rgba(0,0,0,.5)] sm:right-[24px] sm:bottom-[104px]"
    >
      <div className="flex items-start gap-[10px]">
        <span aria-hidden className="mt-[2px] text-[18px] leading-none">💬</span>
        <div className="min-w-0 flex-1">
          <p className="font-poppins text-[14px] font-bold text-white">Nova mensagem da equipe</p>
          <p className="mt-[2px] truncate font-helvetica text-[12px] text-brand-fg-subtle">{alert.subject}</p>
          {alert.lastPreview ? (
            <p className="mt-[6px] line-clamp-2 font-poppins text-[13px] leading-[18px] text-white/85">
              {alert.lastPreview}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fechar aviso"
          className="flex size-[26px] shrink-0 items-center justify-center rounded-full text-[18px] leading-none text-white/60 hover:bg-white/10 hover:text-white"
        >
          ×
        </button>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="mt-[10px] h-[36px] w-full rounded-full bg-[image:var(--brand-orange-gradient)] font-poppins text-[13px] font-bold text-black transition-opacity hover:opacity-90"
      >
        Abrir conversa
      </button>
    </div>
  );
}

// ───────────────────── notificação do navegador ─────────────────────

type NotifyState = "on" | "off" | "blocked" | "unsupported";

const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function readNotify(): NotifyState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission !== "granted") return "off";
  try {
    return window.localStorage.getItem(NOTIFY_KEY) === "off" ? "off" : "on";
  } catch {
    return "on";
  }
}

function notifyBrowser(summary: ConversationSummary) {
  try {
    if (readNotify() !== "on" || !document.hidden) return;
    const notification = new Notification("Nova mensagem da equipe", {
      body: summary.lastPreview || summary.subject,
      tag: `chat-${summary.id}`,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // Alguns navegadores (iOS) não criam notificação fora de service worker.
  }
}

/**
 * Liga/desliga o aviso do navegador — dentro do popup do chat. O pedido de
 * permissão nasce do CLIQUE (pedir sozinho ao abrir a página é o que faz o
 * navegador bloquear o site).
 */
export function ReplyNotifyToggle() {
  const state = useSyncExternalStore(subscribe, readNotify, () => "unsupported" as NotifyState);
  if (state === "unsupported") return null;

  async function toggle() {
    try {
      if (state === "on") {
        window.localStorage.setItem(NOTIFY_KEY, "off");
      } else if (state === "off") {
        const permission =
          Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
        if (permission === "granted") window.localStorage.removeItem(NOTIFY_KEY);
      }
    } catch {
      // Sem localStorage: o estado volta ao da permissão.
    }
    listeners.forEach((listener) => listener());
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={state === "blocked"}
      title={state === "blocked" ? "Liberado nas configurações do navegador (cadeado ao lado do endereço)" : undefined}
      className="font-helvetica text-[12px] text-brand-fg-subtle underline-offset-[3px] hover:text-white hover:underline disabled:cursor-not-allowed disabled:no-underline"
    >
      {state === "on"
        ? "🔔 Avisos do navegador ligados (desligar)"
        : state === "blocked"
          ? "🔕 Avisos bloqueados no navegador"
          : "🔔 Avisar no navegador quando responderem"}
    </button>
  );
}
