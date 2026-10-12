"use client";

import { useState, useTransition } from "react";
import { MoneyField } from "@/components/ui/MoneyField";
import { TextField } from "@/components/ui/TextField";
import { toastError, toastOk } from "@/components/ui/Toasts";
import { formatCents } from "@/features/cart/store";
import { formatGift } from "@/features/gifts/cartGifts";
import {
  MAX_GIFT_EVERY_CENTS,
  MAX_GIFT_LABEL,
  giftFor,
  giftRuleProblem,
  type GiftRule,
} from "@/features/pricing/gift";
import { ACTION_FAILED_MESSAGE, runAction } from "@/lib/safeAction";
import { saveGiftAction, type GiftResult } from "./actions";
import { formatAmount, parseAmount, type AdminGift } from "./types";

const FAILED: GiftResult = { ok: false, reason: "error" };

/** Regra nova (ainda não existe no banco): nada vale até o admin salvar. */
const BLANK: AdminGift = { isActive: true, everyCents: 5000, amount: 0, label: "", maxAmount: null };

/** Valores de exemplo da prévia: o que compras típicas rendem. */
const EXAMPLES_CENTS = [5000, 16000, 50000];

/**
 * Brinde do jogo (2026-10-12) — "ganhe 50Mi de Ouro a cada R$ 50,00".
 *
 * A regra ACUMULA sobre o valor PAGO nos itens do jogo (as Lets Coins abatem)
 * e o teto é opcional, por compra. A prévia ao lado mostra o que o cliente vai
 * ler no carrinho e quanto compras de exemplo rendem — com a MESMA conta
 * (`giftFor`) que o backend usa para conceder.
 */
export function GiftEditor({ gameId, gameName, initial }: { gameId: string; gameName: string; initial: AdminGift | null }) {
  const [saved, setSaved] = useState<AdminGift | null>(initial);
  const start = initial ?? BLANK;
  const [isActive, setIsActive] = useState(start.isActive);
  const [everyCents, setEveryCents] = useState(start.everyCents);
  const [amountText, setAmountText] = useState(formatAmount(initial ? start.amount : null));
  const [label, setLabel] = useState(start.label);
  const [maxText, setMaxText] = useState(formatAmount(start.maxAmount));
  // Remonta o campo de dinheiro (não controlado) ao descartar.
  const [version, setVersion] = useState(0);
  const [saving, startSaving] = useTransition();

  const amount = parseAmount(amountText) ?? 0;
  const maxAmount = parseAmount(maxText);
  const rule: GiftRule = { everyCents, amount, label: label.trim(), maxAmount };
  const problem = giftRuleProblem(rule);

  const dirty =
    saved === null ||
    saved.isActive !== isActive ||
    saved.everyCents !== everyCents ||
    saved.amount !== amount ||
    saved.label !== label.trim() ||
    saved.maxAmount !== maxAmount;

  function load(gift: AdminGift | null) {
    const value = gift ?? BLANK;
    setIsActive(value.isActive);
    setEveryCents(value.everyCents);
    setAmountText(formatAmount(gift ? value.amount : null));
    setLabel(value.label);
    setMaxText(formatAmount(value.maxAmount));
    setVersion((current) => current + 1);
  }

  function save() {
    if (problem) {
      toastError(problem);
      return;
    }
    startSaving(async () => {
      const result = await runAction(() => saveGiftAction(gameId, { ...rule, isActive }), FAILED);
      if (!result.ok) {
        toastError(result.message ?? ACTION_FAILED_MESSAGE);
        return;
      }
      setSaved(result.data);
      load(result.data);
      toastOk(result.data.isActive ? "Brinde salvo. O carrinho e o checkout já mostram." : "Brinde salvo e desligado.");
    });
  }

  return (
    <div className="grid gap-[24px] lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="flex flex-col gap-[20px]">
        <label className="flex w-fit cursor-pointer items-center gap-[10px] font-poppins text-[14px] font-bold text-white">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className="size-[18px] accent-[var(--brand-orange)]"
          />
          Brinde ligado na loja
        </label>

        <div className="grid gap-[20px] sm:grid-cols-2">
          <TextField
            label="Quantidade do brinde"
            inputMode="numeric"
            placeholder="50.000.000"
            value={amountText}
            onChange={(event) => {
              const value = parseAmount(event.target.value);
              setAmountText(value === null ? "" : formatAmount(value));
            }}
          />
          <TextField
            label="O que é o brinde"
            placeholder="de Ouro"
            maxLength={MAX_GIFT_LABEL}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
          <MoneyField
            key={version}
            label="A cada (valor pago no jogo)"
            name="everyCents"
            defaultCents={everyCents}
            maxCents={MAX_GIFT_EVERY_CENTS}
            onCentsChange={setEveryCents}
          />
          <TextField
            label="Teto por compra (opcional)"
            inputMode="numeric"
            placeholder="Sem teto"
            value={maxText}
            onChange={(event) => {
              const value = parseAmount(event.target.value);
              setMaxText(value === null ? "" : formatAmount(value));
            }}
          />
        </div>

        <p className="font-poppins text-[13px] leading-[19px] text-brand-fg-subtle">
          Quantidade em unidades do jogo: 50.000.000 aparece para o cliente como “50Mi”. O brinde acumula a cada valor
          pago nos itens de {gameName} (as Lets Coins abatem). Se a compra tiver o jogo em mais de um servidor, o
          cliente escolhe no checkout onde receber. O brinde aparece no pedido e no painel de vendas para quem entrega.
        </p>

        {problem && amountText !== "" ? (
          <p role="alert" className="font-poppins text-[13px] text-red-9">
            {problem}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-[12px]">
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty || problem !== null}
            className="inline-flex h-[44px] items-center justify-center rounded-full bg-[image:var(--brand-orange-gradient)] px-[26px] font-poppins text-[14px] font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "SALVANDO..." : "SALVAR BRINDE"}
          </button>
          {saved && dirty ? (
            <button
              type="button"
              onClick={() => load(saved)}
              disabled={saving}
              className="inline-flex h-[44px] items-center justify-center rounded-full border border-brand-border px-[22px] font-poppins text-[14px] font-bold text-white/80 transition-colors hover:text-white"
            >
              Descartar
            </button>
          ) : null}
        </div>
      </div>

      <GiftPreview rule={rule} valid={problem === null} active={isActive} />
    </div>
  );
}

function GiftPreview({ rule, valid, active }: { rule: GiftRule; valid: boolean; active: boolean }) {
  return (
    <aside
      aria-label="Prévia do brinde"
      className="rounded-[20px] border border-[#22c55e]/35 bg-[linear-gradient(135deg,rgba(34,197,94,0.13),rgba(34,197,94,0.03))] p-[20px]"
    >
      <p className="font-poppins text-[12px] font-bold tracking-[0.12px] text-white/60 uppercase">Prévia</p>
      {valid ? (
        <>
          <p className="mt-[8px] font-poppins text-[16px] leading-[22px] text-white">
            Ganhe <strong className="text-[#4ade80]">{formatGift(rule.amount, rule.label)}</strong> a cada{" "}
            <strong>{formatCents(rule.everyCents)}</strong>
            {rule.maxAmount !== null ? <> (até {formatGift(rule.maxAmount, rule.label)} por compra)</> : null}
          </p>
          <ul className="mt-[14px] flex flex-col gap-[6px] font-helvetica text-[13px] text-white/80">
            {EXAMPLES_CENTS.map((cents) => {
              const result = giftFor(rule, cents);
              return (
                <li key={cents} className="flex justify-between gap-[12px]">
                  <span>Compra de {formatCents(cents)}</span>
                  <strong className="text-white">
                    {result.amount > 0 ? formatGift(result.amount, rule.label) : "sem brinde"}
                  </strong>
                </li>
              );
            })}
          </ul>
          {!active ? (
            <p className="mt-[12px] font-poppins text-[12px] text-white/60">Desligado: a loja não mostra nem dá o brinde.</p>
          ) : null}
        </>
      ) : (
        <p className="mt-[8px] font-poppins text-[14px] text-white/60">Preencha quantidade, o que é e o valor.</p>
      )}
    </aside>
  );
}
