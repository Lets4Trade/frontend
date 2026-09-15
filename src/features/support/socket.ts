"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { refreshSession } from "@/lib/browserSession";

/**
 * UM socket de atendimento por aba, compartilhado.
 *
 * O popup e a tela do pedido podem estar montados ao mesmo tempo; cada um abrir
 * a sua conexão seria o dobro de sockets ociosos no servidor por visitante. Quem
 * precisa pede (`acquire`) e devolve (`release`); a conexão fecha quando
 * ninguém mais usa.
 *
 * `transports: ["websocket"]`: sem long-polling no caminho (decisão de
 * 2026-09-06). `withCredentials` é o que leva o cookie httpOnly no handshake.
 */

const API_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "").origin;
  } catch {
    return "";
  }
})();

export type SocketStatus = "conectando" | "online" | "offline";

let socket: Socket | null = null;
let users = 0;
let status: SocketStatus = "offline";
const statusListeners = new Set<(status: SocketStatus) => void>();

function setStatus(next: SocketStatus) {
  status = next;
  for (const listener of statusListeners) listener(next);
}

function acquire(): Socket | null {
  if (API_ORIGIN === "") return null;
  users += 1;
  if (socket) return socket;

  const created = io(`${API_ORIGIN}/ws/support`, {
    withCredentials: true,
    transports: ["websocket"],
  });
  socket = created;
  setStatus("conectando");

  created.on("connect", () => setStatus("online"));
  created.on("disconnect", () => setStatus("offline"));

  // Uma renovação por conexão: com a aba aberta há mais de 15 minutos a
  // reconexão leva um access vencido e o servidor recusa. Renova e tenta de
  // novo UMA vez — se falhar outra vez, a sessão acabou de verdade.
  let retried = false;
  created.on("connect_error", (error) => {
    setStatus("offline");
    if (error.message === "unauthenticated" && !retried) {
      retried = true;
      void refreshSession().then((renewed) => {
        if (renewed && socket === created) created.connect();
      });
    }
  });

  return created;
}

function release() {
  users = Math.max(0, users - 1);
  if (users > 0 || !socket) return;
  // `off()` ANTES do `disconnect()`: no StrictMode o efeito monta duas vezes, e
  // o `disconnect` assíncrono do socket antigo caía depois do `connect` do novo,
  // jogando o estado para "offline" com a conexão viva (lição de 2026-09-06).
  const closing = socket;
  socket = null;
  closing.off();
  closing.disconnect();
  setStatus("offline");
}

/** O socket compartilhado enquanto o componente estiver montado e `enabled`. */
export function useSupportSocket(enabled: boolean): { socket: Socket | null; status: SocketStatus } {
  const [current, setCurrent] = useState<Socket | null>(null);
  const [state, setState] = useState<SocketStatus>(status);

  useEffect(() => {
    if (!enabled) return;
    const acquired = acquire();
    setCurrent(acquired);
    statusListeners.add(setState);
    setState(status);
    return () => {
      statusListeners.delete(setState);
      setCurrent(null);
      release();
    };
  }, [enabled]);

  return { socket: current, status: enabled ? state : "offline" };
}
