"use client";

import { useState } from "react";
import { removeSavedCard } from "@/features/payment/api";
import { savedCardLabel, type SavedCard } from "@/features/payment/savedCards";
import { cn } from "@/lib/cn";

/** Valor da opção "Usar outro cartão". */
export const NEW_CARD = "new";

/**
 * Escolha do cartão no checkout (2026-11-02): os cartões salvos da conta e
 * "Usar outro cartão". Com um salvo escolhido, o formulário pede só o CVV.
 *
 * Remover pede confirmação NA LINHA ("Remover este cartão? Sim · Não"), sem o
 * `confirm()` do navegador. Removido, ele some da lista; se era o escolhido, a
 * escolha passa para o próximo válido (ou "outro cartão").
 */
export function SavedCardPicker({
  cards,
  value,
  onChange,
  onRemoved,
}: {
  cards: SavedCard[];
  value: string;
  onChange: (value: string) => void;
  onRemoved: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    setRemoving(id);
    setError(null);
    const ok = await removeSavedCard(id);
    setRemoving(null);
    setConfirming(null);
    if (ok) onRemoved(id);
    else setError("Não conseguimos remover o cartão agora. Tente de novo.");
  }

  return (
    <fieldset className="flex flex-col gap-[10px]">
      <legend className="mb-[12px] font-helvetica text-[18px] leading-[21px] font-bold tracking-[0.18px] text-white">
        Cartão
      </legend>

      {cards.map((card) => {
        const selected = value === card.id;
        return (
          <div
            key={card.id}
            className={cn(
              "rounded-[18px] border px-[16px] py-[12px] transition-colors",
              selected ? "border-brand-orange bg-brand-orange/[0.06]" : "border-white/15 bg-[image:var(--brand-surface-fill)]",
              card.expired && "opacity-60",
            )}
          >
            <div className="flex items-center gap-[12px]">
              <label className={cn("flex min-w-0 flex-1 items-center gap-[12px]", card.expired ? "cursor-not-allowed" : "cursor-pointer")}>
                <input
                  type="radio"
                  name="savedCardChoice"
                  value={card.id}
                  checked={selected}
                  disabled={card.expired}
                  onChange={() => onChange(card.id)}
                  className="size-[18px] shrink-0 accent-[#ff7300]"
                />
                <span className="min-w-0">
                  <span className="block truncate font-poppins text-[15px] font-semibold text-white">
                    {savedCardLabel(card)}
                  </span>
                  <span className="block truncate font-helvetica text-[12px] text-brand-fg-subtle">
                    {card.expired ? `Vencido em ${card.expiry}` : `Validade ${card.expiry}`}
                    {card.holder ? ` · ${card.holder}` : ""}
                  </span>
                </span>
              </label>

              {confirming === card.id ? null : (
                <button
                  type="button"
                  onClick={() => setConfirming(card.id)}
                  aria-label={`Remover o cartão ${savedCardLabel(card)}`}
                  className="shrink-0 font-poppins text-[12px] font-semibold text-white/60 underline-offset-[3px] transition-colors hover:text-white hover:underline"
                >
                  Remover
                </button>
              )}
            </div>

            {confirming === card.id ? (
              <div className="mt-[10px] flex flex-wrap items-center gap-x-[12px] gap-y-[6px] border-t border-white/10 pt-[10px] font-poppins text-[13px] text-white/80">
                <span>Remover este cartão da sua conta?</span>
                <button
                  type="button"
                  disabled={removing === card.id}
                  onClick={() => remove(card.id)}
                  className="font-semibold text-[#f87171] hover:underline disabled:opacity-60"
                >
                  {removing === card.id ? "Removendo…" : "Sim, remover"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  className="font-semibold text-white/70 hover:underline"
                >
                  Não
                </button>
              </div>
            ) : null}
          </div>
        );
      })}

      <label
        className={cn(
          "flex cursor-pointer items-center gap-[12px] rounded-[18px] border px-[16px] py-[12px] transition-colors",
          value === NEW_CARD ? "border-brand-orange bg-brand-orange/[0.06]" : "border-white/15 bg-[image:var(--brand-surface-fill)]",
        )}
      >
        <input
          type="radio"
          name="savedCardChoice"
          value={NEW_CARD}
          checked={value === NEW_CARD}
          onChange={() => onChange(NEW_CARD)}
          className="size-[18px] shrink-0 accent-[#ff7300]"
        />
        <span className="font-poppins text-[15px] font-semibold text-white">Usar outro cartão</span>
      </label>

      {error ? (
        <p role="alert" className="font-helvetica text-[13px] text-red-9">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

/**
 * A caixa de consentimento do cartão NOVO. Desmarcada por padrão: guardar o
 * cartão é escolha da pessoa (LGPD — consentimento não vem pré-marcado).
 */
export function SaveCardCheckbox({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-[12px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
        className="mt-[2px] size-[18px] shrink-0 accent-[#ff7300]"
      />
      <span>
        <span className="block font-poppins text-[14px] font-semibold text-white">
          Salvar este cartão para as próximas compras
        </span>
        <span className="mt-[2px] block font-helvetica text-[12px] leading-[17px] text-brand-fg-subtle">
          O cartão fica guardado na Cielo. Nós guardamos só a bandeira e os 4 últimos dígitos — nunca o número completo
          nem o código de segurança. Você pode remover quando quiser.
        </span>
      </span>
    </label>
  );
}
