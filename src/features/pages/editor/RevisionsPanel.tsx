"use client";

import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import { toastError } from "@/components/ui/Toasts";
import { ACTION_FAILED_MESSAGE, runAction } from "@/lib/safeAction";
import { listRevisionsAction } from "../actions";
import type { PageRevision } from "../types";

/**
 * "Histórico": as versões PUBLICADAS, da mais nova para a mais antiga.
 * Restaurar traz a versão para o RASCUNHO — nada muda na loja até publicar de
 * novo, então olhar uma versão antiga nunca derruba o que está no ar.
 */
export function RevisionsPanel({
  slug,
  disabled,
  onRestore,
}: {
  slug: string;
  disabled: boolean;
  onRestore: (version: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [revisions, setRevisions] = useState<PageRevision[] | null>(null);

  async function load() {
    setRevisions(null);
    const result = await runAction(() => listRevisionsAction(slug), {
      ok: false as const,
      reason: "error" as const,
      message: ACTION_FAILED_MESSAGE,
    });
    if (!result.ok) {
      toastError(result.message ?? "Não foi possível carregar o histórico.");
      setRevisions([]);
      return;
    }
    setRevisions(result.data);
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void load();
      }}
    >
      <Popover.Trigger
        disabled={disabled}
        className="h-[38px] rounded-full border border-white/20 px-[16px] font-poppins text-[13px] font-semibold text-white hover:bg-white/5 disabled:opacity-40"
      >
        Histórico
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 max-h-[60dvh] w-[320px] overflow-y-auto rounded-[20px] border border-brand-border bg-brand-surface p-[8px] shadow-[0_16px_40px_rgba(0,0,0,.5)]"
        >
          {revisions === null ? (
            <p className="px-[12px] py-[10px] font-poppins text-[13px] text-brand-fg-subtle">Carregando…</p>
          ) : revisions.length === 0 ? (
            <p className="px-[12px] py-[10px] font-poppins text-[13px] text-brand-fg-subtle">
              Nenhuma versão publicada ainda.
            </p>
          ) : (
            revisions.map((revision, index) => (
              <div key={revision.version} className="flex items-center justify-between gap-[10px] rounded-[12px] px-[12px] py-[9px] hover:bg-white/5">
                <div>
                  <p className="font-poppins text-[13px] text-white">
                    Versão {revision.version}
                    {index === 0 ? <span className="ml-[6px] text-[11px] text-brand-orange">no ar</span> : null}
                  </p>
                  <p className="font-poppins text-[11px] text-brand-fg-subtle">
                    {new Date(revision.createdAt).toLocaleString("pt-BR")}
                    {revision.createdBy ? ` · ${revision.createdBy.name}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onRestore(revision.version);
                  }}
                  className="shrink-0 rounded-full border border-white/20 px-[10px] py-[4px] font-poppins text-[11px] font-bold text-white hover:bg-white/5"
                >
                  Restaurar
                </button>
              </div>
            ))
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
