"use client";

import * as Dialog from "@radix-ui/react-dialog";

/**
 * Confirmação de exclusão em massa (2026-11-17, pedido do usuário: "me dar uma
 * confirmação; se eu colocar OK, apagar tudo sem eu precisar apagar à mão").
 *
 * Modal do próprio site e não `window.confirm`: o nativo trava a página, não
 * segue a identidade do painel e no celular some atrás da barra do navegador.
 * O foco começa em CANCELAR — Enter sem querer não apaga nada.
 */
export function ConfirmDeleteDialog({
  open,
  title,
  description,
  confirmLabel = "APAGAR TUDO",
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? undefined : onCancel())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-[91] w-[calc(var(--vw)-32px)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-[20px] border border-red-9/40 bg-brand-surface p-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement).querySelector<HTMLButtonElement>("[data-cancel]")?.focus();
          }}
        >
          <Dialog.Title className="font-poppins text-[18px] font-bold text-white">{title}</Dialog.Title>
          <Dialog.Description asChild>
            <div className="mt-[10px] font-helvetica text-[14px] leading-[21px] text-brand-fg-muted">{description}</div>
          </Dialog.Description>
          <div className="mt-[22px] flex flex-wrap justify-end gap-[10px]">
            <button
              type="button"
              data-cancel
              onClick={onCancel}
              disabled={pending}
              className="h-[42px] rounded-full border border-white/15 px-[20px] font-poppins text-[13px] font-bold text-white/85 transition-colors hover:bg-white/5 disabled:opacity-40"
            >
              CANCELAR
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={pending}
              className="h-[42px] rounded-full bg-red-9 px-[20px] font-poppins text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {pending ? "APAGANDO..." : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * A recusa do backend quando a lista tira servidor/categoria que ainda tem
 * produto: "N produto(s) ainda estão ligados a …". Devolve N, ou `null` se a
 * mensagem não for essa (aí é outro erro e a tela mostra como sempre).
 */
export function blockedProductCount(message: string | undefined): number | null {
  const match = message ? /^(\d+) produto\(s\) ainda estão ligados a /.exec(message) : null;
  return match ? Number(match[1]) : null;
}
