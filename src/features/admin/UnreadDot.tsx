"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useSupportSocket } from "@/features/support/socket";
import type { UnreadCounter } from "./unreadCounter";

/**
 * Contagem de "tem coisa esperando a equipe" (2026-10-28), mantida em dia:
 * relê o backend (ver `unreadCounter.ts`) ao montar, a cada evento do socket da
 * equipe (o mesmo socket compartilhado dos avisos de venda), ao reconectar —
 * eventos perdidos sem conexão — e ao voltar para a aba.
 *
 * Separado do ponto em 2026-11-03 (menu agrupado): os itens agora moram num
 * submenu que só existe ABERTO, então quem mantém a contagem viva é o
 * cabeçalho (sempre montado), e o grupo e o item só leem o número.
 *
 * `enabled = false` (cargo sem a área): não conecta nem consulta.
 */
export function useUnreadCount(counter: UnreadCounter, events: readonly string[], enabled = true): number {
  const count = useSyncExternalStore(counter.subscribe, counter.get, () => 0);
  const { socket, status } = useSupportSocket(enabled);

  useEffect(() => {
    if (enabled && status === "online") counter.refresh(0);
  }, [enabled, status, counter]);

  // `events` vira texto na dependência: um array novo a cada render (o literal
  // de quem chama) não pode religar os ouvintes toda vez.
  const eventKey = events.join("|");
  useEffect(() => {
    if (!enabled || !socket) return;
    const names = eventKey.split("|");
    const onActivity = () => counter.refresh();
    names.forEach((name) => socket.on(name, onActivity));
    return () => {
      names.forEach((name) => socket.off(name, onActivity));
    };
  }, [enabled, socket, eventKey, counter]);

  useEffect(() => {
    if (!enabled) return;
    counter.refresh(0);
    const onVisible = () => {
      if (!document.hidden) counter.refresh(0);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [enabled, counter]);

  return enabled ? count : 0;
}

/**
 * O PONTO laranja no canto de um item do menu (2026-10-28, pedido do usuário):
 * diz "tem coisa esperando"; quantas, a tela mostra. O texto vai para o leitor
 * de tela.
 */
export function PinDot({ label }: { label: string }) {
  return (
    <span
      // `align-top`: o ponto encosta no alto da linha, como um pin no canto do
      // nome, sem tirar o texto do lugar.
      className="relative top-[2px] ml-[3px] inline-block size-[9px] shrink-0 rounded-full bg-brand-orange align-top shadow-[0_0_8px_rgba(255,115,0,0.85)]"
    >
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** O NÚMERO laranja (vendas novas — 2026-10-16). */
export function PinCount({ count, label }: { count: number; label: string }) {
  return (
    <span
      aria-label={label}
      className="ml-[6px] inline-flex h-[20px] min-w-[20px] shrink-0 items-center justify-center rounded-full bg-brand-orange px-[6px] align-middle font-poppins text-[11px] font-bold text-black"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
