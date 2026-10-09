"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { listConversations, unreadCount } from "./api";
import { ConversationThread } from "./ConversationThread";
import { NewConversationForm } from "./NewConversationForm";
import { useSupportSocket } from "./socket";
import type { ChatConfig } from "./chatConfig";
import { listTime, type ConversationSummary } from "./types";

/**
 * Bolinha de contato flutuante + popup de atendimento (2026-09-15).
 *
 * A bolinha é o botão de contato do Figma (269:488) — que até aqui era só arte
 * na home. Agora vive em toda a loja, menos no checkout (não oferecer saída no
 * meio do pagamento) e no painel (a equipe atende por `/admin/chats`).
 *
 * ── Quem vê o quê ──────────────────────────────────────────────────────────
 * Visitante: o convite para entrar (volta para a mesma página, com o popup
 * aberto) e o WhatsApp. Conversa exige conta — decisão do produto.
 * Logado: as próprias conversas, "nova conversa" e o WhatsApp.
 *
 * ── Custo por visitante ────────────────────────────────────────────────────
 * Fechado, o popup NÃO abre socket. Para quem está logado faz UMA leitura do
 * número de não lidas ao carregar e ao voltar para a aba. O socket só existe com
 * o popup aberto — navegar pela loja não segura conexão no servidor.
 *
 * ── Sessão sem ida ao servidor ─────────────────────────────────────────────
 * "Está logado?" vem do cookie-dica `pt_authed_client` (não-httpOnly, sem
 * segredo). Errar para "logado" só faz a lista voltar 401 e mostrar o convite;
 * nenhum dado é exposto por isso.
 */

type View = { name: "list" } | { name: "new" } | { name: "thread"; conversation: ConversationSummary };

// `/previa`: a prévia do painel (iframe) mostra a página, não o atendimento.
const HIDDEN_PREFIXES = ["/admin", "/checkout", "/previa"];
/** Âncora que o login devolve para reabrir o popup onde a pessoa estava. */
const OPEN_HASH = "#atendimento";

function subscribeCookies(onChange: () => void) {
  window.addEventListener("focus", onChange);
  return () => window.removeEventListener("focus", onChange);
}
const hasSessionHint = () => /(?:^|;\s*)pt_authed_client=/.test(document.cookie);

/** O visitante fechou o balão: não volta nesta aba (sessão do navegador). */
const BALLOON_DISMISSED = "l4t-chat-balloon-dismissed";
const BALLOON_EVENT = "l4t-chat-balloon";

// O "fechou o balão" mora no `sessionStorage` — estado EXTERNO, lido com
// `useSyncExternalStore`. No servidor (e se o armazenamento estiver bloqueado)
// o balão conta como fechado: nada pisca e nada quebra.
function subscribeBalloon(onChange: () => void) {
  window.addEventListener(BALLOON_EVENT, onChange);
  return () => window.removeEventListener(BALLOON_EVENT, onChange);
}
function balloonDismissedSnapshot() {
  try {
    return sessionStorage.getItem(BALLOON_DISMISSED) === "1";
  } catch {
    return false;
  }
}
function markBalloonDismissed() {
  try {
    sessionStorage.setItem(BALLOON_DISMISSED, "1");
  } catch {
    // Armazenamento bloqueado: o balão volta ao recarregar.
  }
  window.dispatchEvent(new Event(BALLOON_EVENT));
}

export function ContactBubble({ whatsappHref, config }: { whatsappHref?: string; config: ChatConfig }) {
  const pathname = usePathname() ?? "/";
  const signedIn = useSyncExternalStore(subscribeCookies, hasSessionHint, () => false);
  const hidden = HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ name: "list" });
  const [unread, setUnread] = useState(0);
  const balloonDismissed = useSyncExternalStore(subscribeBalloon, balloonDismissedSnapshot, () => true);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const left = config.side === "left";

  const dismissBalloon = useCallback(() => markBalloonDismissed(), []);

  // Volta do login com `#atendimento`: abre e limpa a âncora.
  useEffect(() => {
    if (window.location.hash === OPEN_HASH) {
      setOpen(true);
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [pathname]);

  const refreshUnread = useCallback(() => {
    if (!signedIn) return;
    unreadCount().then(setUnread).catch(() => undefined);
  }, [signedIn]);

  useEffect(() => {
    if (hidden || !signedIn) {
      setUnread(0);
      return;
    }
    refreshUnread();
    const onVisible = () => document.visibilityState === "visible" && refreshUnread();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [hidden, signedIn, refreshUnread]);

  const openChat = useCallback(() => {
    setOpen(true);
    // Abriu o chat: o convite já cumpriu o papel.
    dismissBalloon();
  }, [dismissBalloon]);

  const close = useCallback(() => {
    setOpen(false);
    setView({ name: "list" });
    refreshUnread();
    bubbleRef.current?.focus();
  }, [refreshUnread]);

  // Esc fecha; clique fora não — perder um rascunho por um clique errado é pior.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (hidden) return null;

  const loginHref = `/login?redirect=${encodeURIComponent(`${pathname}${OPEN_HASH}`)}`;
  const statusLabel = config.online ? "Online agora" : "Offline no momento";
  const showBalloon = config.showBalloon && !open && !balloonDismissed;

  return (
    <>
      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Atendimento Lets4Trade"
          className={cn(
            "chat-panel contact-float fixed bottom-[96px] z-40 flex h-[min(620px,calc(100dvh-128px))] w-[380px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[22px] border border-brand-border bg-brand-surface shadow-[0_24px_60px_rgba(0,0,0,.6)] sm:bottom-[104px]",
            left ? "left-[16px] sm:left-[24px]" : "right-[16px] sm:right-[24px]",
          )}
        >
          {/* Cabeçalho com a mesma foto do botão e o status — quem abre o chat
              sabe na hora se vai ser respondido agora. */}
          <header className="relative overflow-hidden border-b border-brand-hairline px-[16px] pt-[16px] pb-[14px]">
            <span
              aria-hidden
              className="pointer-events-none absolute -top-[60px] left-1/2 h-[120px] w-[260px] -translate-x-1/2 rounded-full bg-brand-orange/25 blur-[40px]"
            />
            <div className="relative flex items-center gap-[12px]">
              <ChatAvatar config={config} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-poppins text-[16px] font-semibold text-white">Atendimento Lets4Trade</p>
                <p className="mt-[2px] flex items-center gap-[6px] font-helvetica text-[12px] text-brand-fg-muted">
                  <StatusDot online={config.online} />
                  {statusLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Fechar atendimento"
                className="flex size-[34px] shrink-0 items-center justify-center rounded-full font-poppins text-[20px] leading-none text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none"
              >
                ×
              </button>
            </div>
            {!config.online ? (
              <p className="relative mt-[12px] rounded-[12px] border border-red-500/30 bg-red-500/10 px-[12px] py-[8px] font-helvetica text-[12px] leading-[17px] text-white/85">
                {config.offlineText}
              </p>
            ) : null}
          </header>

          {!signedIn ? (
            <SignedOut loginHref={loginHref} />
          ) : view.name === "thread" ? (
            <ConversationThread
              key={view.conversation.id}
              conversation={view.conversation}
              onBack={() => setView({ name: "list" })}
            />
          ) : view.name === "new" ? (
            <NewConversationForm
              onCancel={() => setView({ name: "list" })}
              onCreated={(conversation) => setView({ name: "thread", conversation })}
            />
          ) : (
            <ConversationList
              onOpen={(conversation) => setView({ name: "thread", conversation })}
              onNew={() => setView({ name: "new" })}
              onUnreadChange={setUnread}
            />
          )}

          {whatsappHref ? (
            <footer className="border-t border-brand-hairline px-[16px] py-[12px]">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-[42px] w-full items-center justify-center gap-[10px] rounded-full border border-[#25d366]/60 bg-[#25d366]/10 font-poppins text-[14px] font-bold text-white transition-colors hover:bg-[#25d366]/20 focus-visible:ring-2 focus-visible:ring-[#25d366] focus-visible:outline-none"
              >
                <Image src="/icons/social/whatsapp.svg" alt="" width={18} height={18} aria-hidden className="size-[18px]" />
                FALAR NO WHATSAPP
              </a>
            </footer>
          ) : null}
        </div>
      ) : null}

      {/* Botão + balão no MESMO canto, o balão do lado de dentro da tela. */}
      <div
        className={cn(
          "contact-float fixed bottom-[16px] z-40 flex items-end gap-[12px] sm:bottom-[24px]",
          left ? "left-[16px] flex-row sm:left-[24px]" : "right-[16px] flex-row-reverse sm:right-[24px]",
        )}
      >
        <button
          ref={bubbleRef}
          type="button"
          onClick={() => (open ? close() : openChat())}
          aria-expanded={open}
          aria-label={
            unread > 0
              ? `Atendimento (${statusLabel}): ${unread} conversa(s) com resposta nova`
              : `Atendimento (${statusLabel})`
          }
          className={cn(
            "chat-launcher relative flex size-[64px] shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/40 shadow-[0_10px_30px_rgba(0,0,0,.45)] backdrop-blur-[10.8px] transition-[border-color,background-color,transform] duration-[var(--dur-micro,160ms)] hover:scale-[1.04] hover:border-brand-orange/70 focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none sm:size-[72px]",
            open && "border-brand-orange/70",
          )}
        >
          {open ? (
            <span aria-hidden className="font-poppins text-[28px] leading-none text-white">
              ×
            </span>
          ) : (
            <ChatAvatar config={config} size={56} bare />
          )}
          <span className={cn("absolute bottom-[3px]", left ? "left-[3px]" : "right-[3px]")}>
            <StatusDot online={config.online} ring />
          </span>
          {unread > 0 ? (
            <span
              aria-hidden
              className={cn(
                "absolute -top-[2px] flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-brand-orange px-[5px] font-poppins text-[11px] font-bold text-black",
                left ? "-right-[2px]" : "-left-[2px]",
              )}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>

        {showBalloon ? (
          <div
            className={cn(
              "chat-balloon relative mb-[8px] max-w-[min(260px,calc(100vw-120px))] rounded-[16px] border border-brand-border bg-brand-surface/95 py-[10px] shadow-[0_12px_30px_rgba(0,0,0,.5)] backdrop-blur-[10px]",
              left ? "rounded-bl-[4px] pr-[30px] pl-[14px]" : "rounded-br-[4px] pr-[30px] pl-[14px]",
            )}
          >
            <button
              type="button"
              onClick={openChat}
              className="block text-left focus-visible:outline-none"
            >
              <span className="block font-poppins text-[14px] leading-[18px] font-bold text-white">{config.title}</span>
              <span className="mt-[3px] block font-helvetica text-[13px] leading-[17px] text-brand-fg-muted">
                {config.text}
              </span>
              <span className="mt-[6px] flex items-center gap-[6px] font-helvetica text-[11px] text-white/60">
                <StatusDot online={config.online} />
                {statusLabel}
              </span>
            </button>
            <button
              type="button"
              onClick={dismissBalloon}
              aria-label="Fechar recado do atendimento"
              className="absolute top-[6px] right-[6px] flex size-[22px] items-center justify-center rounded-full font-poppins text-[14px] leading-none text-white/50 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none"
            >
              ×
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}

/**
 * A foto do atendimento (enviada no painel) ou, sem ela, o ícone de balão.
 * `bare`: dentro do botão redondo, sem moldura própria.
 */
function ChatAvatar({ config, size, bare = false }: { config: ChatConfig; size: number; bare?: boolean }) {
  if (config.iconUrl) {
    return (
      <span
        className={cn("relative block shrink-0 overflow-hidden rounded-full", !bare && "border border-white/15")}
        style={{ width: size, height: size }}
      >
        <Image src={config.iconUrl} alt="" fill sizes={`${size}px`} aria-hidden className="object-cover" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        !bare && "border border-white/15 bg-black/40",
      )}
      style={{ width: size, height: size }}
    >
      <Image src="/icons/home/chat-dialog.svg" alt="" width={24} height={24} aria-hidden className="size-[24px]" />
    </span>
  );
}

/** Verde = atendimento online (pulsa, sem movimento para quem pediu); vermelho = offline. */
function StatusDot({ online, ring = false }: { online: boolean; ring?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-block shrink-0 rounded-full",
        ring ? "size-[14px] ring-2 ring-brand-bg" : "size-[8px]",
        online ? "chat-dot-online bg-[#22c55e]" : "bg-[#ef4444]",
      )}
    />
  );
}

function SignedOut({ loginHref }: { loginHref: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-[14px] px-[24px] text-center">
      <span aria-hidden className="flex size-[56px] items-center justify-center rounded-full border border-white/10 bg-white/5">
        <Image src="/icons/home/chat-dialog.svg" alt="" width={26} height={26} className="size-[26px]" />
      </span>
      <p className="font-poppins text-[16px] font-semibold text-white">Entre para conversar com a equipe</p>
      <p className="font-helvetica text-[13px] leading-[19px] text-brand-fg-muted">
        Com a sua conta, as conversas ficam salvas junto dos seus pedidos. Sem conta, fale com a gente pelo
        WhatsApp.
      </p>
      <div className="mt-[4px] flex w-full flex-col gap-[10px]">
        <Link
          href={loginHref}
          className="inline-flex h-[42px] items-center justify-center rounded-full border border-[var(--brand-stroke-soft)] bg-[image:var(--brand-orange-gradient)] px-[28px] font-poppins text-[14px] font-bold text-black transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg focus-visible:outline-none"
        >
          ENTRAR
        </Link>
        <Link
          href="/criar-conta"
          className="inline-flex h-[42px] items-center justify-center rounded-full border border-brand-border px-[28px] font-poppins text-[14px] font-bold text-white transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none"
        >
          CRIAR CONTA
        </Link>
      </div>
    </div>
  );
}

/**
 * As conversas da pessoa, a mais movimentada primeiro, 20 por vez.
 *
 * Com o popup aberto, o socket entrega o resumo de cada conversa que muda
 * (`conversa`) — a linha sobe para o topo e acende sem recarregar a lista.
 */
function ConversationList({
  onOpen,
  onNew,
  onUnreadChange,
}: {
  onOpen: (conversation: ConversationSummary) => void;
  onNew: () => void;
  onUnreadChange: (count: number) => void;
}) {
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket } = useSupportSocket(true);

  const load = useCallback((nextPage: number) => {
    setLoading(true);
    listConversations(nextPage)
      .then((data) => {
        setItems((current) => (nextPage === 1 ? data.items : [...current, ...data.items.filter((item) => !current.some((c) => c.id === item.id))]));
        setTotal(data.total);
        setPage(nextPage);
        setError(null);
      })
      .catch(() => setError("Não foi possível carregar suas conversas."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  useEffect(() => {
    onUnreadChange(items.filter((item) => item.unread).length);
  }, [items, onUnreadChange]);

  useEffect(() => {
    if (!socket) return;
    const onUpdate = (summary: ConversationSummary) => {
      setItems((current) => [summary, ...current.filter((item) => item.id !== summary.id)]);
    };
    socket.on("conversa", onUpdate);
    return () => {
      socket.off("conversa", onUpdate);
    };
  }, [socket]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scrollbar-orange min-h-0 flex-1 overflow-y-auto">
        {error ? (
          <p role="alert" className="px-[16px] pt-[24px] text-center font-helvetica text-[13px] text-red-9">{error}</p>
        ) : items.length === 0 && !loading ? (
          <div className="flex flex-col items-center gap-[10px] px-[24px] pt-[40px] text-center">
            <span aria-hidden className="text-[28px]">👋</span>
            <p className="font-poppins text-[15px] font-semibold text-white">Como podemos ajudar?</p>
            <p className="font-helvetica text-[13px] leading-[19px] text-brand-fg-muted">
              Abra uma conversa para falar com a equipe sobre uma compra, uma venda ou qualquer dúvida.
            </p>
          </div>
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpen(item)}
                  className="flex w-full items-start gap-[10px] border-b border-brand-hairline px-[16px] py-[12px] text-left transition-colors hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-[6px] size-[8px] shrink-0 rounded-full",
                      item.unread ? "bg-brand-orange" : "bg-transparent",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-[8px]">
                      <span className={cn("truncate font-poppins text-[14px] text-white", item.unread ? "font-bold" : "font-semibold")}>
                        {item.subject}
                      </span>
                      <span className="shrink-0 font-helvetica text-[11px] text-brand-fg-subtle">
                        {listTime(item.lastMessageAt)}
                      </span>
                    </span>
                    <span className="mt-[2px] block truncate font-helvetica text-[12px] text-brand-fg-muted">
                      {item.lastPreview || " "}
                    </span>
                    <span className="mt-[4px] flex gap-[6px]">
                      {item.orderReference ? (
                        <span className="rounded-full border border-white/15 px-[8px] py-[1px] font-helvetica text-[10px] text-white/70">
                          Pedido {item.orderReference}
                        </span>
                      ) : null}
                      {item.status === "FECHADA" ? (
                        <span className="rounded-full border border-white/15 px-[8px] py-[1px] font-helvetica text-[10px] text-white/50">
                          Encerrada
                        </span>
                      ) : null}
                    </span>
                    {item.unread ? <span className="sr-only">Resposta nova</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {items.length < total ? (
          <div className="px-[16px] py-[10px] text-center">
            <button
              type="button"
              onClick={() => load(page + 1)}
              disabled={loading}
              className="font-poppins text-[13px] font-semibold text-brand-orange hover:underline disabled:opacity-60"
            >
              {loading ? "Carregando…" : "Ver conversas mais antigas"}
            </button>
          </div>
        ) : null}
      </div>

      <div className="border-t border-brand-hairline px-[16px] py-[12px]">
        <Button variant="outline" fullWidth className="h-[42px] text-[14px]" onClick={onNew}>
          + NOVA CONVERSA
        </Button>
      </div>
    </div>
  );
}
