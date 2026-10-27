"use client";

import { useState } from "react";
import { toastError, toastOk } from "@/components/ui/Toasts";
import { saveCustomerNotes } from "./api";
import type { CustomerNotes } from "./types";

/** Mesmo teto do backend (`SetCustomerNotesDto`). */
const MAX_NOTES = 2000;

/**
 * "Observações" do cliente no chat do painel (2026-10-27, pedido do usuário):
 * nome do personagem, ID, o que for — para ninguém da equipe perguntar de novo.
 *
 * Mora na CONTA do cliente, não na conversa: abre igual em todo atendimento
 * dele. Só a equipe vê. Texto puro, mostrado como texto.
 *
 * Aberto por padrão (é o que se quer ver ao abrir o chat), mas recolhe para
 * dar espaço às mensagens. Salva no botão ou com Ctrl+Enter — nada de gravar a
 * cada tecla: cada gravação passa pela trilha de auditoria do painel.
 */
export function CustomerNotesPanel({ conversationId, initial }: { conversationId: string; initial?: CustomerNotes }) {
  const [saved, setSaved] = useState(initial?.text ?? "");
  const [draft, setDraft] = useState(initial?.text ?? "");
  const [updatedAt, setUpdatedAt] = useState(initial?.updatedAt ?? null);
  const [busy, setBusy] = useState(false);
  const dirty = draft.trim() !== saved.trim();

  async function save() {
    if (!dirty || busy) return;
    setBusy(true);
    try {
      const result = await saveCustomerNotes(conversationId, draft);
      const text = result?.text ?? "";
      setSaved(text);
      setDraft(text);
      setUpdatedAt(result?.updatedAt ?? null);
      toastOk("Observações salvas.");
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Observações não salvas.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details open className="group shrink-0 border-b border-brand-hairline">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-[12px] px-[30px] py-[10px] font-poppins text-[14px] font-semibold text-white hover:bg-white/5">
        <span className="min-w-0 truncate">
          Observações do cliente
          {/* Recolhido, a primeira linha continua à vista. */}
          {saved ? (
            <span className="font-normal text-white/55 group-open:hidden"> · {saved.split("\n")[0]}</span>
          ) : null}
        </span>
        <span aria-hidden className="text-white/60 transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="px-[30px] pb-[14px]">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              void save();
            }
          }}
          maxLength={MAX_NOTES}
          rows={3}
          disabled={busy}
          aria-label="Observações do cliente"
          placeholder="Nome do personagem, ID, servidor… (só a equipe vê)"
          className="scrollbar-orange block max-h-[160px] min-h-[72px] w-full resize-y rounded-[14px] border border-brand-border bg-black/30 px-[16px] py-[10px] font-poppins text-[14px] leading-[20px] text-white outline-none placeholder:text-white/40 focus-visible:border-brand-orange disabled:opacity-60"
        />
        <div className="mt-[8px] flex items-center justify-between gap-[12px]">
          <p className="font-helvetica text-[12px] text-brand-fg-subtle" role="status">
            {dirty ? "Alterações não salvas" : updatedAt ? `Salvo em ${formatSavedAt(updatedAt)}` : "Visível para toda a equipe, em todas as conversas deste cliente."}
          </p>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!dirty || busy}
            className="h-[32px] shrink-0 rounded-full border border-brand-orange px-[16px] font-poppins text-[13px] font-semibold text-white transition-colors hover:bg-brand-orange/10 disabled:cursor-not-allowed disabled:border-white/15 disabled:text-white/40 disabled:hover:bg-transparent"
          >
            {busy ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </details>
  );
}

function formatSavedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
