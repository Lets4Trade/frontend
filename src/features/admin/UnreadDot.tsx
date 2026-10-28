"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useSupportSocket } from "@/features/support/socket";
import type { UnreadCounter } from "./unreadCounter";

/**
 * Ponto laranja no canto de um item do menu do painel quando há coisa
 * esperando a equipe (2026-10-28, pedido do usuário): "Chats" e "Propostas".
 *
 * Um PONTO e não um número, a pedido: diz "tem coisa esperando"; quantas, a
 * tela mostra. O número vai para o leitor de tela (`label`).
 *
 * Relê o backend (ver `unreadCounter.ts`): ao montar, a cada evento do socket
 * da equipe (o mesmo socket compartilhado dos avisos de venda), ao reconectar
 * — eventos perdidos sem conexão — e ao voltar para a aba.
 */
export function UnreadDot({
  counter,
  events,
  label,
}: {
  counter: UnreadCounter;
  /** Eventos da sala da equipe que podem mudar a contagem. */
  events: readonly string[];
  label: (count: number) => string;
}) {
  const count = useSyncExternalStore(counter.subscribe, counter.get, () => 0);
  const { socket, status } = useSupportSocket(true);

  useEffect(() => {
    if (status === "online") counter.refresh(0);
  }, [status, counter]);

  // `events` vira texto na dependência: um array novo a cada render (o literal
  // de quem chama) não pode religar os ouvintes toda vez.
  const eventKey = events.join("|");
  useEffect(() => {
    if (!socket) return;
    const names = eventKey.split("|");
    const onActivity = () => counter.refresh();
    names.forEach((name) => socket.on(name, onActivity));
    return () => {
      names.forEach((name) => socket.off(name, onActivity));
    };
  }, [socket, eventKey, counter]);

  useEffect(() => {
    counter.refresh(0);
    const onVisible = () => {
      if (!document.hidden) counter.refresh(0);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [counter]);

  if (count === 0) return null;
  return (
    <span
      // `align-top`: o ponto encosta no alto da linha, como um pin no canto do
      // nome, sem tirar o texto do lugar.
      className="relative top-[2px] ml-[3px] inline-block size-[9px] rounded-full bg-brand-orange align-top shadow-[0_0_8px_rgba(255,115,0,0.85)]"
    >
      <span className="sr-only">{label(count)}</span>
    </span>
  );
}
