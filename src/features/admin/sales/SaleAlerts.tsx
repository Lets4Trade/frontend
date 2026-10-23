"use client";

import Link from "next/link";
import { playChime, useAudioUnlock } from "@/lib/chime";
import { USER_LINK_CLASS, adminUserHref } from "@/features/admin/users/href";
import { adminOrderChatHref } from "@/features/orders/orderChatHref";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { toastError, toastOk } from "@/components/ui/Toasts";
import { useSupportSocket } from "@/features/support/socket";
import { cn } from "@/lib/cn";
import {
  brl,
  clearUnseen,
  dismissSale,
  getCards,
  getServerCards,
  getUnseen,
  METHOD_LABEL,
  parseSale,
  pushSale,
  saleHref,
  subscribeSales,
  type SaleAlert,
} from "./saleAlertsStore";

/**
 * Aviso de VENDA confirmada no painel (2026-10-16, pedido do usuário) — par do
 * aviso no Discord (`backend/src/app/support/sale-alerts.service.ts`).
 *
 * Ouve `equipe:venda` no socket do atendimento (o mesmo, compartilhado, que a
 * tela de chats usa — sala só de ADMIN). A cada venda:
 *   - card no canto com valor, cliente, itens e "Ver pedido" (some em 20 s);
 *   - som curto (Web Audio, sem arquivo);
 *   - contador em "Vendas e pedidos" (`SalesBadge`), que zera ao abrir a lista;
 *   - notificação do navegador se a aba estiver em segundo plano e a pessoa
 *     tiver ligado o sininho;
 *   - na própria lista de pedidos, ela recarrega sozinha.
 *
 * Só com o painel aberto — fora dele, quem avisa é o Discord.
 */

const AUTO_DISMISS_MS = 20_000;

export function SaleAlerts({ canOpenUsers = false }: { canOpenUsers?: boolean } = {}) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const onOrders = pathname.startsWith("/admin/pedidos");
  const { socket } = useSupportSocket(true);
  const cards = useSyncExternalStore(subscribeSales, getCards, getServerCards);
  const audio = useAudioUnlock();
  const onOrdersRef = useRef(onOrders);

  useEffect(() => {
    onOrdersRef.current = onOrders;
    if (onOrders) clearUnseen();
  }, [onOrders]);

  useEffect(() => {
    if (!socket) return;
    const onSale = (raw: unknown) => {
      const sale = parseSale(raw);
      if (!sale || !pushSale(sale, !onOrdersRef.current)) return;
      playChime(audio.current);
      notifyBrowser(sale);
      // Na lista de pedidos, a venda aparece sem precisar recarregar.
      if (onOrdersRef.current) router.refresh();
      window.setTimeout(() => dismissSale(sale.paymentId), AUTO_DISMISS_MS);
    };
    socket.on("equipe:venda", onSale);
    return () => {
      socket.off("equipe:venda", onSale);
    };
  }, [socket, router, audio]);

  return (
    <>
      <NotifyToggle />
      {cards.length > 0 ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-[96px] right-[16px] z-[60] flex w-[360px] max-w-[calc(100vw-32px)] flex-col gap-[10px]"
        >
          {cards.map((sale) => (
            <SaleCard key={sale.paymentId} sale={sale} canOpenUsers={canOpenUsers} />
          ))}
        </div>
      ) : null}
    </>
  );
}

function SaleCard({ sale, canOpenUsers }: { sale: SaleAlert; canOpenUsers: boolean }) {
  const first = sale.items[0];
  const more = sale.items.length - 1;
  return (
    <div className="sale-alert-in rounded-[20px] border border-brand-orange/60 bg-brand-surface p-[16px] shadow-[0_16px_40px_rgba(0,0,0,.6)]">
      <div className="flex items-start justify-between gap-[10px]">
        <p className="font-poppins text-[12px] font-bold tracking-[0.06em] text-brand-orange uppercase">🛒 Nova venda</p>
        <button
          type="button"
          onClick={() => dismissSale(sale.paymentId)}
          aria-label="Fechar aviso de venda"
          className="-mt-[4px] -mr-[4px] flex size-[28px] items-center justify-center rounded-full font-poppins text-[16px] text-white/60 hover:bg-white/10 hover:text-white"
        >
          ×
        </button>
      </div>
      <p className="mt-[4px] font-poppins text-[24px] leading-[30px] font-bold text-white">{brl(sale.amountCents)}</p>
      <p className="mt-[2px] font-helvetica text-[13px] text-brand-fg-muted">
        {canOpenUsers && sale.customerId ? (
          <Link
            href={adminUserHref(sale.customerId)}
            prefetch={false}
            title="Abrir a ficha do cliente"
            className={USER_LINK_CLASS}
          >
            {sale.customer}
          </Link>
        ) : (
          sale.customer
        )}{" "}
        · {sale.method ? METHOD_LABEL[sale.method] : "—"}
      </p>
      {first ? (
        <p className="mt-[8px] truncate font-helvetica text-[13px] text-white">
          {first.name}
          {first.game ? <span className="text-brand-fg-subtle"> ({first.game})</span> : null}
          {more > 0 ? <span className="text-brand-fg-subtle"> + {more} item(ns)</span> : null}
        </p>
      ) : null}
      <div className="mt-[12px] flex items-center justify-between gap-[10px]">
        <Link
          href={adminOrderChatHref(sale.reference)}
          prefetch={false}
          onClick={() => dismissSale(sale.paymentId)}
          title="Abrir o chat do pedido"
          className="font-mono text-[12px] text-brand-fg-subtle underline decoration-white/30 underline-offset-[3px] transition-colors hover:text-brand-orange hover:decoration-brand-orange"
        >
          {sale.reference}
        </Link>
        <Link
          href={saleHref(sale)}
          onClick={() => dismissSale(sale.paymentId)}
          className="flex h-[34px] items-center rounded-full bg-[image:var(--brand-orange-gradient)] px-[16px] font-poppins text-[13px] font-bold text-white hover:opacity-90"
        >
          Ver pedido
        </Link>
      </div>
    </div>
  );
}

/** Contador laranja ao lado de "Vendas e pedidos". */
export function SalesBadge() {
  const unseen = useSyncExternalStore(subscribeSales, getUnseen, () => 0);
  if (unseen === 0) return null;
  return (
    <span
      aria-label={`${unseen} venda(s) nova(s)`}
      className="ml-[6px] inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-brand-orange px-[6px] align-middle font-poppins text-[11px] font-bold text-black"
    >
      {unseen > 99 ? "99+" : unseen}
    </span>
  );
}

/**
 * Sininho = LIGA/DESLIGA a notificação de venda do navegador (aparece mesmo
 * com o painel em outra aba). 2026-10-16, relato do usuário: "não consigo
 * clicar no sino" — com a permissão já concedida ele ficava laranja e o clique
 * não fazia nada.
 *
 *   - desligado → clique pede a permissão (se ainda não houver) e mostra uma
 *     notificação de TESTE, para a pessoa ver na hora que funciona;
 *   - ligado → clique desliga (preferência deste navegador; a permissão do
 *     navegador não dá para revogar por código, então desligar é nosso);
 *   - bloqueado no navegador → o sino aparece e o clique explica como liberar.
 *
 * O pedido de permissão nasce do CLIQUE — pedir sozinho ao abrir o painel é
 * bloqueado pelos navegadores e irrita.
 */
const MUTE_KEY = "l4t:notificacao-venda";
const prefListeners = new Set<() => void>();

type BellState = "unsupported" | "blocked" | "off" | "on";

function readBell(): BellState {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission !== "granted") return "off";
  try {
    return window.localStorage.getItem(MUTE_KEY) === "off" ? "off" : "on";
  } catch {
    return "on";
  }
}

function subscribeBell(listener: () => void) {
  prefListeners.add(listener);
  return () => prefListeners.delete(listener);
}

function setMuted(muted: boolean) {
  try {
    if (muted) window.localStorage.setItem(MUTE_KEY, "off");
    else window.localStorage.removeItem(MUTE_KEY);
  } catch {
    // Armazenamento bloqueado: a escolha vale até recarregar.
  }
  prefListeners.forEach((listener) => listener());
}

function NotifyToggle() {
  // Servidor não sabe da permissão: "unsupported" (nada desenhado) evita
  // diferença de hidratação; o navegador lê a de verdade.
  const state = useSyncExternalStore(subscribeBell, readBell, () => "unsupported" as const);
  if (state === "unsupported") return null;

  async function onClick() {
    if (state === "blocked") {
      toastError(
        "As notificações estão bloqueadas neste navegador. Clique no cadeado ao lado do endereço do site → Notificações → Permitir, e recarregue a página.",
      );
      return;
    }
    if (state === "on") {
      setMuted(true);
      toastOk("Notificações de venda desligadas neste navegador.");
      return;
    }
    const permission =
      Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission !== "granted") {
      prefListeners.forEach((listener) => listener());
      if (permission === "denied") toastError("O navegador bloqueou as notificações. Libere pelo cadeado ao lado do endereço.");
      return;
    }
    setMuted(false);
    try {
      new Notification("Notificações de venda ligadas", {
        body: "A cada venda confirmada aparece um aviso como este, mesmo com o painel em outra aba.",
        tag: "teste-notificacao-venda",
      });
    } catch {
      // Navegador que só notifica por service worker (iOS): o card do painel continua.
    }
    toastOk("Notificações de venda ligadas.");
  }

  const on = state === "on";
  const label =
    state === "blocked"
      ? "Notificações de venda bloqueadas no navegador (clique para ver como liberar)"
      : on
        ? "Notificações de venda ligadas (clique para desligar)"
        : "Ligar notificações de venda no navegador";
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      aria-label={label}
      aria-pressed={on}
      title={label}
      className={cn(
        "flex size-[40px] shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none",
        on
          ? "border-brand-orange/50 text-brand-orange hover:border-brand-orange"
          : state === "blocked"
            ? "border-red-500/40 text-red-400/80 hover:border-red-500/70"
            : "border-white/15 text-white/60 hover:border-white/30 hover:text-white",
      )}
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" strokeLinejoin="round" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" strokeLinecap="round" />
        {on ? null : <path d="m2 2 20 20" strokeLinecap="round" />}
      </svg>
    </button>
  );
}

function notifyBrowser(sale: SaleAlert) {
  try {
    // Só com o sino LIGADO e a aba em segundo plano (com a aba à vista, o card basta).
    if (readBell() !== "on" || !document.hidden) return;
    const notification = new Notification(`Nova venda — ${brl(sale.amountCents)}`, {
      body: `${sale.customer} · ${sale.items[0]?.name ?? sale.reference}`,
      tag: sale.paymentId,
    });
    notification.onclick = () => {
      window.focus();
      window.location.href = saleHref(sale);
    };
  } catch {
    // Alguns navegadores (iOS) não criam notificação fora de service worker.
  }
}
