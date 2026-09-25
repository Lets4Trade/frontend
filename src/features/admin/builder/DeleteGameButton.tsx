"use client";

import * as Popover from "@radix-ui/react-popover";
import Image from "next/image";
import { useState, useTransition } from "react";
import { deactivateGameAction } from "@/features/admin/games/actions";
import { ACTION_FAILED_MESSAGE, runAction } from "@/lib/safeAction";

/**
 * Lixeira do card de jogo em `/admin/builder` (2026-09-25, fora do Figma — o
 * arquivo não desenha exclusão de jogo em lugar nenhum).
 *
 * Mesma confirmação por popover da lixeira de produto (`AdminProductCard`), e
 * pelo mesmo motivo: o botão fica em cima de um card que é LINK, e um clique
 * um pouco fora do alvo não pode tirar um jogo inteiro da loja sem aviso.
 *
 * O texto avisa o alcance porque aqui ele é maior que o de um produto: o jogo
 * leva junto a página, o menu e todos os produtos dele.
 */
export function DeleteGameButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirmDelete() {
    startDelete(async () => {
      const result = await runAction(() => deactivateGameAction(id), {
        ok: false,
        message: ACTION_FAILED_MESSAGE,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      // O `revalidatePath` da action desmonta o card junto com o popover.
      setError(null);
    });
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={`Excluir ${name}`}
        className="flex size-[32px] items-center justify-center rounded-[8px] border border-white/10 bg-[image:var(--brand-surface-fill)] transition-opacity hover:opacity-90"
      >
        <Image
          src="/icons/admin/trash.svg"
          alt=""
          width={16}
          height={16}
          aria-hidden
          className="size-[16px]"
        />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={8}
          className="brand-select-panel z-50 w-[280px] rounded-[20px] border border-brand-border bg-brand-surface p-[16px] shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
        >
          <p className="font-helvetica text-[14px] leading-[20px] text-white">
            Excluir <span className="font-bold">{name}</span> da loja?
          </p>
          <p className="mt-[6px] font-helvetica text-[13px] leading-[18px] text-brand-fg-subtle">
            A página, o item do menu e todos os produtos dele saem do ar. Pedidos antigos não são
            afetados.
          </p>

          {error ? (
            <p role="alert" className="mt-2 font-helvetica text-[13px] text-red-9">
              {error}
            </p>
          ) : null}

          <div className="mt-[14px] flex gap-[10px]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-[36px] flex-1 rounded-full border border-white/10 bg-[image:var(--brand-surface-fill)] font-poppins text-[13px] font-bold text-white transition-opacity hover:opacity-90"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="h-[36px] flex-1 rounded-full border border-white/15 bg-brand-orange font-poppins text-[13px] font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? "Excluindo…" : "Excluir"}
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
