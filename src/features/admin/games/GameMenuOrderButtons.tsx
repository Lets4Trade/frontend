"use client";

import { useTransition } from "react";
import { toastError } from "@/components/ui/Toasts";
import { ACTION_FAILED_MESSAGE, runAction } from "@/lib/safeAction";
import { reorderGamesMenuAction } from "./actions";

/**
 * Setas ↑/↓ da coluna "Ordem" em Painel → Jogos (2026-10-15): trocam o jogo
 * de lugar com o vizinho no menu GAMES da loja e gravam na hora (a action
 * revalida a página, que volta na ordem nova).
 *
 * `ids` é a lista INTEIRA de jogos ativos na ordem atual — o backend só aceita
 * a lista completa, para nenhum jogo ficar sem lugar.
 */
export function GameMenuOrderButtons({ ids, index, name }: { ids: string[]; index: number; name: string }) {
  const [pending, startTransition] = useTransition();

  function move(direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    const next = [...ids];
    [next[index], next[target]] = [next[target], next[index]];

    startTransition(async () => {
      const result = await runAction(() => reorderGamesMenuAction(next), {
        ok: false,
        message: ACTION_FAILED_MESSAGE,
      });
      if (!result.ok) toastError(result.message);
    });
  }

  const button =
    "flex size-[30px] items-center justify-center rounded-[8px] border border-white/10 font-poppins text-[14px] text-white/80 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div className="flex items-center gap-[6px]" aria-busy={pending}>
      <span className="w-[22px] text-center font-poppins text-[14px] font-bold text-white/60">{index + 1}</span>
      <button
        type="button"
        className={button}
        aria-label={`Subir ${name} no menu`}
        disabled={pending || index === 0}
        onClick={() => move(-1)}
      >
        ↑
      </button>
      <button
        type="button"
        className={button}
        aria-label={`Descer ${name} no menu`}
        disabled={pending || index === ids.length - 1}
        onClick={() => move(1)}
      >
        ↓
      </button>
    </div>
  );
}
