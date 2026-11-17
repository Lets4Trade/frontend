"use client";

import { useTransition } from "react";
import { toastError, toastOk } from "@/components/ui/Toasts";
import { ACTION_FAILED_MESSAGE, runAction } from "@/lib/safeAction";
import { EyeIcon } from "@/features/admin/products/ProductPriceTable";
import { setGameHiddenAction } from "./actions";

/**
 * Painel → Jogos (2026-11-17): o olho que esconde/mostra a página inteira do
 * jogo no site. Grava na hora (como as setas da ordem) — é reversível com o
 * mesmo clique, então não pede confirmação.
 */
export function GameVisibilityButton({ id, name, hidden }: { id: string; name: string; hidden: boolean }) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await runAction(() => setGameHiddenAction(id, !hidden), {
        ok: false,
        message: ACTION_FAILED_MESSAGE,
      });
      if (!result.ok) {
        toastError(result.message);
        return;
      }
      toastOk(hidden ? `${name} voltou para o site.` : `${name} foi escondido do site.`);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={hidden}
      aria-label={hidden ? `Mostrar ${name} no site` : `Esconder ${name} do site`}
      title={hidden ? "Escondido do site (clique para mostrar)" : "Visível no site (clique para esconder)"}
      className={
        "flex size-[36px] items-center justify-center rounded-[10px] border transition-colors disabled:opacity-40 " +
        (hidden
          ? "border-brand-orange/60 bg-brand-orange/10 text-white/60 hover:text-white"
          : "border-white/10 text-white hover:bg-white/5")
      }
    >
      <EyeIcon off={hidden} className="size-[18px]" />
    </button>
  );
}
