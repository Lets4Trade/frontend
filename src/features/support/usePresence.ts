"use client";

import { useEffect, useSyncExternalStore } from "react";
import { parsePresence, type SupportPresence } from "./presenceTypes";

/**
 * Atendentes online na aba aberta (2026-10-16) — o cabeçalho e o botão do chat
 * leem o MESMO estado, então nunca se contradizem.
 *
 * Começa com o que o servidor renderizou (`initial`) e atualiza:
 *  - a cada minuto, só com a aba VISÍVEL (aba em segundo plano não consulta);
 *  - ao voltar para a aba.
 * Um intervalo por página, seja qual for o número de componentes lendo.
 */

const REFRESH_MS = 60_000;

let current: SupportPresence | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let inflight = false;

function emit(next: SupportPresence) {
  current = next;
  listeners.forEach((listener) => listener());
}

async function refresh() {
  if (inflight || document.visibilityState !== "visible") return;
  inflight = true;
  try {
    const response = await fetch("/api/atendimento", { cache: "no-store" });
    if (response.ok) emit(parsePresence(await response.json()));
  } catch {
    // Rede fora: fica o último estado conhecido.
  } finally {
    inflight = false;
  }
}

function onVisibility() {
  if (document.visibilityState === "visible") void refresh();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    timer = setInterval(() => void refresh(), REFRESH_MS);
    document.addEventListener("visibilitychange", onVisibility);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (timer) clearInterval(timer);
      timer = null;
      document.removeEventListener("visibilitychange", onVisibility);
    }
  };
}

export function usePresence(initial: SupportPresence): SupportPresence {
  // A renderização do servidor é a verdade mais nova a cada navegação.
  useEffect(() => {
    emit(initial);
  }, [initial]);
  return useSyncExternalStore(
    subscribe,
    () => current ?? initial,
    () => initial,
  );
}
