"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { MoneyField } from "@/components/ui/MoneyField";
import { TextField } from "@/components/ui/TextField";
import { toastError, toastOk } from "@/components/ui/Toasts";
import { formatCents, tierArt } from "@/features/loyalty/tiers";
import { ACTION_FAILED_MESSAGE, ACTION_FAILED_UPLOAD_MESSAGE, runAction } from "@/lib/safeAction";
import { resetTierIconAction, saveLoyaltyTiersAction, uploadTierIconAction, type LoyaltyResult } from "./actions";
import {
  MAX_MIN_SPENT_CENTS,
  MAX_TIER_NAME,
  formatPercent,
  parsePercent,
  tierProblem,
  type AdminLoyaltyTier,
  type TierProblem,
} from "./types";

const ACCEPT = "image/png,image/jpeg,image/webp,image/avif";
const FAILED: LoyaltyResult = { ok: false, reason: "error" };

type Draft = AdminLoyaltyTier & { percentText: string };

function toDrafts(tiers: readonly AdminLoyaltyTier[]): Draft[] {
  return tiers.map((tier) => ({ ...tier, percentText: formatPercent(tier.cashbackBps) }));
}

/**
 * Níveis de fidelidade (2026-10-06): nome, "a partir de", % de cashback e
 * ícone de cada um dos cinco níveis.
 *
 * Texto e números salvam JUNTOS no botão (as faixas dependem umas das outras:
 * Prata só é válida se for maior que Bronze). O ícone sobe na hora, como o
 * ícone de aba — binário não espera o "Salvar".
 *
 * Ao salvar, o backend recalcula o nível de cada cliente pelas faixas novas, e
 * a loja (cabeçalho, carrinho, checkout, /fidelidade) muda na hora.
 */
export function LoyaltyTiersEditor({ initialTiers }: { initialTiers: AdminLoyaltyTier[] }) {
  const [drafts, setDrafts] = useState<Draft[]>(() => toDrafts(initialTiers));
  const [saved, setSaved] = useState<AdminLoyaltyTier[]>(initialTiers);
  const [problem, setProblem] = useState<TierProblem | null>(null);
  // Remonta os campos de dinheiro depois de salvar/descartar (são não controlados).
  const [version, setVersion] = useState(0);
  const [saving, startSaving] = useTransition();

  const dirty = drafts.some((draft, index) => {
    const base = saved[index];
    return (
      draft.name !== base.name ||
      draft.minSpentCents !== base.minSpentCents ||
      parsePercent(draft.percentText) !== base.cashbackBps
    );
  });

  function patch(index: number, change: Partial<Draft>) {
    setDrafts((list) => list.map((draft, at) => (at === index ? { ...draft, ...change } : draft)));
    setProblem(null);
  }

  function applyServer(tiers: AdminLoyaltyTier[], keepText: boolean) {
    setSaved(tiers);
    setDrafts((list) =>
      keepText
        ? // Só o ícone mudou no servidor: preserva o que está sendo digitado.
          list.map((draft, index) => ({ ...draft, iconUrl: tiers[index]?.iconUrl }))
        : toDrafts(tiers),
    );
  }

  function save() {
    const tiers: AdminLoyaltyTier[] = drafts.map(({ percentText, ...rest }) => ({
      ...rest,
      name: rest.name.trim(),
      cashbackBps: parsePercent(percentText),
    }));
    const found = tierProblem(tiers);
    if (found) {
      setProblem(found);
      toastError(`${tiers[found.index].name.trim() || "Nível"}: ${found.message}`);
      return;
    }
    startSaving(async () => {
      const result = await runAction(() => saveLoyaltyTiersAction(tiers), FAILED);
      if (!result.ok) {
        toastError(result.message ?? ACTION_FAILED_MESSAGE);
        return;
      }
      applyServer(result.data, false);
      setVersion((value) => value + 1);
      toastOk("Níveis salvos. A loja já mostra os valores novos.");
    });
  }

  function discard() {
    setDrafts(toDrafts(saved));
    setProblem(null);
    setVersion((value) => value + 1);
  }

  return (
    <div className="flex flex-col gap-[16px]">
      <ul className="flex flex-col gap-[14px]">
        {drafts.map((draft, index) => {
          const error = problem?.index === index ? problem : null;
          return (
            <li
              key={draft.tier}
              className="grid gap-[18px] rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)] p-[18px] sm:p-[22px] lg:grid-cols-[150px_minmax(0,1fr)_200px_160px] lg:items-start"
            >
              <TierIcon
                tier={draft.tier}
                name={draft.name}
                iconUrl={draft.iconUrl}
                onChanged={(tiers) => applyServer(tiers, true)}
              />
              <TextField
                label={`Nome do nível ${index + 1}`}
                value={draft.name}
                maxLength={MAX_TIER_NAME}
                onChange={(event) => patch(index, { name: event.target.value })}
                error={error?.field === "name" ? error.message : undefined}
              />
              {index === 0 ? (
                // O primeiro nível é onde todo cliente começa: sempre R$ 0,00.
                <div className="flex flex-col gap-[8px]">
                  <span className="pl-[25px] font-poppins text-[14px] font-semibold text-white">A partir de</span>
                  <p
                    title="O primeiro nível é onde todo cliente começa."
                    className="flex h-[50px] items-center rounded-full border border-white/10 px-[25px] font-poppins text-[14px] whitespace-nowrap text-brand-fg-muted"
                  >
                    {formatCents(0)}
                  </p>
                </div>
              ) : (
                <MoneyField
                  key={`${draft.tier}-${version}`}
                  label="A partir de"
                  name={`min-${draft.tier}`}
                  defaultCents={draft.minSpentCents}
                  maxCents={MAX_MIN_SPENT_CENTS}
                  onCentsChange={(cents) => patch(index, { minSpentCents: cents })}
                  error={error?.field === "minSpentCents" ? error.message : undefined}
                />
              )}
              <TextField
                label="Cashback (%)"
                inputMode="decimal"
                value={draft.percentText}
                placeholder="2,5"
                onChange={(event) => patch(index, { percentText: event.target.value })}
                error={error?.field === "cashbackBps" ? error.message : undefined}
              />
            </li>
          );
        })}
      </ul>

      {/* Barra de salvar presa ao pé. Botões à ESQUERDA: os avisos do painel
          (toasts) nascem no canto inferior direito e cobriam o "Salvar". */}
      <div className="sticky bottom-[16px] z-10 flex flex-wrap items-center gap-[12px] rounded-[20px] border border-brand-border bg-black/80 p-[14px] backdrop-blur">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="h-[44px] rounded-full bg-[image:var(--brand-orange-gradient)] px-[28px] font-poppins text-[13px] font-bold text-white disabled:opacity-40"
        >
          {saving ? "Salvando…" : "Salvar níveis"}
        </button>
        <button
          type="button"
          onClick={discard}
          disabled={!dirty || saving}
          className="h-[44px] rounded-full border border-white/15 px-[22px] font-poppins text-[13px] font-bold text-white disabled:opacity-40"
        >
          Descartar
        </button>
        <p className="font-poppins text-[13px] text-brand-fg-subtle">
          {dirty ? "Alterações não salvas." : "Tudo salvo."} Ao salvar, o nível de cada cliente é recalculado pelas faixas novas.
        </p>
      </div>
    </div>
  );
}

/** O ícone É o botão de trocar (sobe na hora), mais "usar padrão". */
function TierIcon({
  tier,
  name,
  iconUrl,
  onChanged,
}: {
  tier: AdminLoyaltyTier["tier"];
  name: string;
  iconUrl?: string;
  onChanged: (tiers: AdminLoyaltyTier[]) => void;
}) {
  const [pending, startTransition] = useTransition();
  const art = tierArt(tier, iconUrl);

  function upload(file: File) {
    const form = new FormData();
    form.append("image", file);
    startTransition(async () => {
      const result = await runAction(() => uploadTierIconAction(tier, form), FAILED);
      if (!result.ok) {
        toastError(result.message ?? ACTION_FAILED_UPLOAD_MESSAGE);
        return;
      }
      onChanged(result.data);
      toastOk("Ícone trocado.");
    });
  }

  function reset() {
    startTransition(async () => {
      const result = await runAction(() => resetTierIconAction(tier), FAILED);
      if (!result.ok) {
        toastError(result.message ?? ACTION_FAILED_MESSAGE);
        return;
      }
      onChanged(result.data);
      toastOk("Ícone padrão de volta.");
    });
  }

  return (
    <div className="flex items-center gap-[12px] lg:flex-col lg:items-start">
      <label
        title="Trocar ícone: 160×160, PNG com fundo transparente (até 5 MB)"
        className="relative flex size-[84px] shrink-0 cursor-pointer items-center justify-center rounded-[16px] border border-white/10 bg-black/30 transition-opacity hover:opacity-80 focus-within:ring-2 focus-within:ring-brand-orange"
      >
        <Image src={art.icon} alt="" width={68} height={68} className="size-[68px] object-contain" />
        {pending ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-[16px] bg-black/60 font-poppins text-[11px] text-white">
            Enviando…
          </span>
        ) : null}
        <span className="sr-only">Trocar ícone de {name || tier}</span>
        <input
          type="file"
          accept={ACCEPT}
          disabled={pending}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) upload(file);
          }}
        />
      </label>
      <div className="flex flex-col gap-[4px]">
        <span className="font-poppins text-[11px] leading-[15px] text-brand-fg-subtle">
          Clique para trocar. 160×160, PNG transparente.
        </span>
        {iconUrl ? (
          <button
            type="button"
            onClick={reset}
            disabled={pending}
            className="w-fit font-poppins text-[12px] font-bold text-brand-orange hover:underline disabled:opacity-40"
          >
            Usar ícone padrão
          </button>
        ) : null}
      </div>
    </div>
  );
}
