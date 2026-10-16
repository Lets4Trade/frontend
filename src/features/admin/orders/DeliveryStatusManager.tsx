"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TextField } from "@/components/ui/TextField";
import { toastOk } from "@/components/ui/Toasts";
import { cn } from "@/lib/cn";
import { ACTION_FAILED_MESSAGE, runAction } from "@/lib/safeAction";
import { DELIVERY_COLOR_STYLES, DELIVERY_STATUS_COLORS, type DeliveryStatusColor } from "@/features/orders/deliveryStatus";
import {
  archiveDeliveryStatusAction,
  createDeliveryStatusAction,
  updateDeliveryStatusAction,
  type DeliveryStatusResult,
} from "./deliveryStatusActions";
import { DELIVERY_STATUS_BASES, statusStyle, type AdminDeliveryStatus } from "./types";

type Draft = { id: string | null; label: string; color: DeliveryStatusColor; base: string };

const EMPTY: Draft = { id: null, label: "", color: "blue", base: "EM_ANDAMENTO" };

/**
 * Status de ENTREGA personalizados (2026-10-16, pedido do usuário: "o
 * atendente/admin poder criar um status novo na entrega do pedido"). ADMIN e
 * ATENDENTE criam, editam e arquivam; o status aparece no select de situação de
 * cada pedido e, para o cliente, na pílula e na trilha.
 *
 * Cada status diz a ETAPA em que conta — é ela que move cashback e a trilha.
 * Por isso a etapa de um status já usado não muda (o backend recusa).
 *
 * Arquivar em vez de apagar: pedidos que já mostram o status continuam com ele.
 */
export function DeliveryStatusManager({ statuses }: { statuses: AdminDeliveryStatus[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<DeliveryStatusResult>, success: string, after?: () => void) {
    setError(undefined);
    startTransition(async () => {
      const result = await runAction(action, { ok: false, message: ACTION_FAILED_MESSAGE });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toastOk(success);
      after?.();
      router.refresh();
    });
  }

  function save() {
    if (!draft) return;
    const input = { label: draft.label, color: draft.color, base: draft.base };
    if (draft.id) {
      const id = draft.id;
      run(() => updateDeliveryStatusAction(id, input), "Status salvo.", () => setDraft(null));
    } else {
      run(() => createDeliveryStatusAction(input), "Status criado.", () => setDraft(null));
    }
  }

  function archive(status: AdminDeliveryStatus) {
    if (confirming !== status.id) {
      setConfirming(status.id);
      return;
    }
    setConfirming(null);
    run(() => archiveDeliveryStatusAction(status.id), `"${status.label}" arquivado.`);
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setDraft(null);
          setError(undefined);
          setConfirming(null);
        }
      }}
    >
      <Dialog.Trigger className="h-[50px] rounded-full border border-brand-orange bg-[image:var(--brand-surface-fill)] px-[22px] font-poppins text-[14px] font-bold text-white transition-opacity hover:opacity-90">
        Status de entrega
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[640px] max-w-[calc(100vw-32px)]",
            "max-h-[calc(100vh-60px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto",
            "scrollbar-orange rounded-[30px] border border-brand-border bg-brand-surface p-[24px] sm:p-[40px]",
            "shadow-[0_24px_60px_rgba(0,0,0,0.6)]",
          )}
        >
          <Dialog.Title className="font-helvetica text-[25px] leading-[28px] font-bold tracking-[0.25px] text-white">
            Status de entrega
          </Dialog.Title>
          <Dialog.Description className="mt-[10px] font-helvetica text-[15px] leading-[21px] text-brand-placeholder">
            Crie status como &quot;Farmando&quot; ou &quot;Aguardando você ficar online&quot; e escolha-os na situação
            do pedido. O cliente vê o nome na pílula e na trilha. Cada status conta numa etapa — é ela que libera o
            cashback quando for &quot;Entregue&quot;.
          </Dialog.Description>

          <ul className="mt-[24px] flex flex-col gap-[8px]">
            {statuses.length === 0 ? (
              <li className="rounded-[16px] border border-white/10 px-[16px] py-[14px] font-poppins text-[14px] text-brand-fg-subtle">
                Nenhum status criado ainda.
              </li>
            ) : (
              statuses.map((status) => (
                <li
                  key={status.id}
                  className="flex flex-wrap items-center gap-[12px] rounded-[16px] border border-white/10 bg-black/20 px-[16px] py-[10px]"
                >
                  <span
                    className={cn(
                      "max-w-[220px] truncate rounded-full border border-white/5 px-[12px] py-[2px] font-helvetica text-[14px]",
                      DELIVERY_COLOR_STYLES[status.color].className,
                    )}
                  >
                    {status.label}
                  </span>
                  <span className="flex-1 font-poppins text-[12px] text-brand-fg-subtle">
                    conta como {statusStyle(status.base).label}
                  </span>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setConfirming(null);
                      setDraft({ id: status.id, label: status.label, color: status.color, base: status.base });
                    }}
                    className="font-poppins text-[13px] font-bold text-white/80 hover:text-white disabled:opacity-50"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => archive(status)}
                    className={cn(
                      "font-poppins text-[13px] font-bold disabled:opacity-50",
                      confirming === status.id ? "text-[#ff2828]" : "text-white/50 hover:text-white",
                    )}
                  >
                    {confirming === status.id ? "Confirmar arquivar" : "Arquivar"}
                  </button>
                </li>
              ))
            )}
          </ul>

          {draft ? (
            <StatusForm draft={draft} onChange={setDraft} onCancel={() => setDraft(null)} onSave={save} pending={pending} />
          ) : (
            <button
              type="button"
              onClick={() => setDraft({ ...EMPTY })}
              className="mt-[16px] h-[44px] rounded-full border border-white/15 px-[20px] font-poppins text-[14px] font-bold text-white transition-colors hover:border-white/30"
            >
              + Novo status
            </button>
          )}

          {error ? (
            <p role="alert" className="mt-[14px] font-poppins text-[13px] text-brand-orange">
              {error}
            </p>
          ) : null}

          <div className="mt-[28px] flex justify-end">
            <Dialog.Close className="h-[50px] rounded-full border border-brand-border bg-[image:var(--brand-surface-fill)] px-[35px] font-poppins text-[14px] font-bold text-white transition-opacity hover:opacity-90">
              Fechar
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function StatusForm({
  draft,
  onChange,
  onCancel,
  onSave,
  pending,
}: {
  draft: Draft;
  onChange: (next: Draft) => void;
  onCancel: () => void;
  onSave: () => void;
  pending: boolean;
}) {
  return (
    <form
      className="mt-[20px] flex flex-col gap-[16px] rounded-[20px] border border-white/10 bg-black/20 p-[18px]"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <p className="font-poppins text-[14px] font-bold text-white">{draft.id ? "Editar status" : "Novo status"}</p>
      <TextField
        label="Nome (o cliente vê)"
        value={draft.label}
        maxLength={40}
        placeholder="Ex.: Farmando, Aguardando você ficar online"
        autoFocus
        onChange={(event) => onChange({ ...draft, label: event.target.value })}
      />

      <fieldset>
        <legend className="mb-[8px] font-poppins text-[13px] text-brand-fg-subtle">Cor</legend>
        <div className="flex flex-wrap gap-[8px]">
          {DELIVERY_STATUS_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-pressed={draft.color === color}
              aria-label={DELIVERY_COLOR_STYLES[color].label}
              title={DELIVERY_COLOR_STYLES[color].label}
              onClick={() => onChange({ ...draft, color })}
              className={cn(
                "flex h-[30px] items-center rounded-full border px-[12px] font-helvetica text-[13px]",
                DELIVERY_COLOR_STYLES[color].className,
                draft.color === color ? "border-white" : "border-white/5",
              )}
            >
              {draft.label.trim() || DELIVERY_COLOR_STYLES[color].label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-[8px] font-poppins text-[13px] text-brand-fg-subtle">
          Conta como (move a trilha do cliente e o cashback)
        </legend>
        <div className="flex flex-wrap gap-[8px]">
          {DELIVERY_STATUS_BASES.map((base) => (
            <button
              key={base}
              type="button"
              aria-pressed={draft.base === base}
              onClick={() => onChange({ ...draft, base })}
              className={cn(
                "h-[34px] rounded-full border px-[14px] font-poppins text-[13px] font-bold transition-colors",
                draft.base === base ? "border-brand-orange text-white" : "border-white/15 text-white/70 hover:text-white",
              )}
            >
              {statusStyle(base).label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex justify-end gap-[10px]">
        <button
          type="button"
          onClick={onCancel}
          className="h-[44px] rounded-full border border-white/15 px-[18px] font-poppins text-[14px] text-white/80"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending || draft.label.trim() === ""}
          className="h-[44px] rounded-full bg-[image:var(--brand-orange-gradient)] px-[22px] font-poppins text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
