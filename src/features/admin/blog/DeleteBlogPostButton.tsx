"use client";

import * as Popover from "@radix-ui/react-popover";
import Image from "next/image";
import { useState, useTransition } from "react";
import { toastOk } from "@/components/ui/Toasts";
import { deleteBlogPostAction } from "./actions";
import { ACTION_FAILED_MESSAGE, runAction } from "@/lib/safeAction";

/**
 * Lixeira da linha em `/admin/noticias` — mesma confirmação por popover da
 * lixeira de jogo/produto. Aqui a exclusão APAGA de verdade (contrato: notícia
 * é conteúdo editorial, não é citada por pedido), então o aviso diz que não
 * tem volta e sugere o rascunho como alternativa.
 */
export function DeleteBlogPostButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirmDelete() {
    startDelete(async () => {
      const result = await runAction(() => deleteBlogPostAction(id), {
        ok: false,
        message: ACTION_FAILED_MESSAGE,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      // O `revalidatePath` da action desmonta o card junto com o popover.
      setError(null);
      setOpen(false);
      toastOk("Notícia excluída.");
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
            Excluir <span className="font-bold">{name}</span>?
          </p>
          <p className="mt-[6px] font-helvetica text-[13px] leading-[18px] text-brand-fg-subtle">
            A matéria sai do ar e é apagada — não dá para desfazer. Para só tirar do ar, salve como
            rascunho.
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
