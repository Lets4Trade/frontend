"use client";

import { cn } from "@/lib/cn";
import { emptyDraft, type PricingDraft } from "./pricingDraft";

/**
 * "Depois do CONTINUAR" — o layout da página do PACOTE (2026-10-01, contrato
 * `.claude/context/boosting-pacotes.md`).
 *
 * Não é um campo à parte: o layout É o modo de preço, que o configurador da
 * loja já desenha. Escolher aqui troca o modo do `PricingEditor` logo abaixo —
 * uma fonte de verdade só, sem chance de "layout de faixa de nível com preço
 * fixo".
 *   - Faixa de nível (Figma 1708:3266) → `LEVEL_RANGE`;
 *   - Lista de serviços (Figma 1735:4247) → `FIXED`; os serviços marcáveis são
 *     os "Adicionais" do editor de preço.
 */
const OPTIONS = [
  {
    mode: "LEVEL_RANGE",
    title: "Faixa de nível",
    text: "O cliente escolhe nível inicial e final; o preço sai das faixas de nível.",
    sketch: ["Nível 1  →  90", "+ adicionais", "R$ total", "COMPRAR AGORA"],
  },
  {
    mode: "FIXED",
    title: "Lista de serviços",
    text: "Preço base + serviços que o cliente marca (os “Adicionais” abaixo), com busca.",
    sketch: ["Servidor: [A] [B]", "☐ Serviço  + R$", "☐ Serviço  + R$", "R$ total"],
  },
] as const;

export function PackageLayoutPicker({
  draft,
  onChange,
}: {
  draft: PricingDraft;
  onChange: (next: PricingDraft) => void;
}) {
  function choose(mode: PricingDraft["mode"]) {
    if (mode === draft.mode) return;
    // Mesma regra do editor: trocar de modo mantém horas base e adicionais.
    const fresh = emptyDraft(mode);
    onChange({ ...fresh, baseHours: draft.baseHours, addons: draft.addons });
  }

  return (
    <fieldset>
      <legend className="font-poppins text-[16px] font-bold text-white">Depois do CONTINUAR</legend>
      <p className="mt-[4px] font-helvetica text-[13px] text-brand-fg-subtle">
        O que o cliente vê ao clicar em CONTINUAR neste card. A página troca a grade de pacotes por esta tela.
      </p>
      <div role="radiogroup" aria-label="Layout depois do CONTINUAR" className="mt-[14px] grid gap-[14px] sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const active = draft.mode === option.mode;
          return (
            <button
              key={option.mode}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(option.mode)}
              className={cn(
                "flex flex-col gap-[10px] rounded-[20px] border p-[16px] text-left transition-colors focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none",
                active ? "border-brand-orange bg-brand-orange/10" : "border-white/15 bg-black/20 hover:border-white/30",
              )}
            >
              <span className="flex items-center justify-between gap-[10px] font-poppins text-[15px] font-bold text-white">
                {option.title}
                <span
                  aria-hidden
                  className={cn(
                    "size-[16px] rounded-full border-2",
                    active ? "border-brand-orange bg-brand-orange" : "border-white/40",
                  )}
                />
              </span>
              <span aria-hidden className="rounded-[12px] border border-white/10 bg-black/40 px-[12px] py-[8px] font-mono text-[11px] leading-[17px] text-white/60">
                {/* Índice como chave: o desenho repete linhas ("☐ Serviço") e é fixo. */}
                {option.sketch.map((line, index) => (
                  <span key={index} className="block">
                    {line}
                  </span>
                ))}
              </span>
              <span className="font-helvetica text-[12px] leading-[17px] text-brand-fg-muted">{option.text}</span>
            </button>
          );
        })}
      </div>
      {draft.mode === "QUANTITY" ? (
        <p className="mt-[10px] font-helvetica text-[13px] text-brand-orange">
          Este pacote está com preço “Por quantidade”. Escolha um dos layouts acima para a página do pacote.
        </p>
      ) : null}
    </fieldset>
  );
}
