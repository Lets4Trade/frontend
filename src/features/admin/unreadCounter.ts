/**
 * Contador de "tem coisa esperando a equipe" para os pontos do menu do painel
 * (2026-10-28): conversas não lidas em "Chats", propostas novas em "Propostas".
 *
 * Um número por contador, no MÓDULO, para o menu e a tela de cada área mexerem
 * no mesmo valor (`useSyncExternalStore`).
 *
 * QUEM DECIDE É O BACKEND: a leitura é da equipe inteira, então contar no
 * navegador a partir dos eventos erraria quando outro atendente age. Os eventos
 * do socket só dizem QUANDO reler.
 *
 *   - Releitura com espera curta (`DEBOUNCE_MS`): uma rajada de eventos vira
 *     uma ida só ao backend.
 *   - Só a resposta da ÚLTIMA leitura vale (`seq`): uma resposta atrasada não
 *     pode reacender o ponto depois que a coisa foi resolvida.
 *   - Falha mantém o último valor (fail soft): é um aviso, não um dado crítico.
 */

const DEBOUNCE_MS = 300;

export type UnreadCounter = {
  subscribe: (listener: () => void) => () => void;
  get: () => number;
  refresh: (delay?: number) => void;
};

export function createUnreadCounter(fetchCount: () => Promise<number>): UnreadCounter {
  let count = 0;
  let seq = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    get: () => count,
    refresh(delay = DEBOUNCE_MS) {
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        const mine = ++seq;
        fetchCount()
          .then((next) => {
            if (mine !== seq || next === count) return;
            count = next;
            listeners.forEach((listener) => listener());
          })
          .catch(() => {
            // Fail soft: o ponto fica como estava até a próxima releitura.
          });
      }, delay);
    },
  };
}
