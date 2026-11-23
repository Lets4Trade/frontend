"use client";

import { useState, useTransition } from "react";
import { SelectField } from "@/components/ui/SelectField";
import { toastError, toastOk } from "@/components/ui/Toasts";
import { ACTION_FAILED_MESSAGE, runAction } from "@/lib/safeAction";
import type { NewsSourceOption } from "./newsSource";
import { saveNewsSourceAction, type NewsSourceResult } from "./newsSourceActions";

const FAILED: NewsSourceResult = { ok: false, reason: "error" };

/**
 * O select da aba Notícias (2026-11-23): deste jogo, todos ou outro jogo. Vale
 * ao SALVAR, como o Brinde.
 */
export function NewsSourceEditor({
  gameId,
  initial,
  options,
}: {
  gameId: string;
  initial: string;
  options: NewsSourceOption[];
}) {
  const [saved, setSaved] = useState(initial);
  const [value, setValue] = useState(initial);
  const [saving, startSaving] = useTransition();
  const dirty = value !== saved;

  function save() {
    startSaving(async () => {
      const result = await runAction(() => saveNewsSourceAction(gameId, value), FAILED);
      if (!result.ok) {
        toastError(result.message ?? ACTION_FAILED_MESSAGE);
        return;
      }
      setSaved(value);
      toastOk("Notícias do jogo salvas. A página do jogo já mostra.");
    });
  }

  return (
    <div className="flex max-w-[560px] flex-col gap-[20px]">
      <SelectField
        label="Notícias mostradas na página deste jogo"
        value={value}
        onValueChange={setValue}
        options={options}
        disabled={saving}
      />
      <div className="flex flex-wrap items-center gap-[12px]">
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="inline-flex h-[44px] items-center justify-center rounded-full bg-[image:var(--brand-orange-gradient)] px-[26px] font-poppins text-[14px] font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "SALVANDO..." : "SALVAR"}
        </button>
        {dirty && !saving ? (
          <button
            type="button"
            onClick={() => setValue(saved)}
            className="inline-flex h-[44px] items-center justify-center rounded-full border border-brand-border px-[22px] font-poppins text-[14px] font-bold text-white/80 transition-colors hover:text-white"
          >
            Descartar
          </button>
        ) : null}
      </div>
    </div>
  );
}
