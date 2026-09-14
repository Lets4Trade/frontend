"use client";

import Link from "next/link";
import { BUILDER_STEPS, type BuilderStepId } from "./steps";

/**
 * "Estrutura da página" — a lateral do builder (Figma 3909:2804).
 *
 * 280×686 no arquivo, com nove linhas de 230×50 a cada 65px. A pastilha do
 * número tem 37×34 e fica a 10px da borda; o título e a dica começam ambos a
 * 52px, um em cima do outro.
 *
 * Cada linha é um `<button>` de verdade e não uma `<div onClick>`: são
 * controles que trocam o painel à direita, então precisam de foco, Tab, Enter e
 * do papel certo para leitor de tela. A única exceção é a etapa 8, que NAVEGA
 * para a tela de produtos — e essa é um `<Link>`, porque o destino é outro
 * endereço e a pessoa tem direito de abri-lo em outra aba.
 *
 * A lista inteira é um `<nav>` com `aria-current` na etapa aberta: é o mesmo
 * padrão do `AdminHeader`, e é o que anuncia "onde estou" sem depender da cor
 * de fundo.
 */
export function BuilderSidebar({
  gameId,
  gameSlug,
  active,
  onSelect,
  dirtySteps,
}: {
  gameId: string;
  gameSlug: string;
  active: BuilderStepId | null;
  onSelect: (id: BuilderStepId) => void;
  /** Etapas com alteração ainda não publicada — ganham um ponto laranja. */
  dirtySteps: ReadonlySet<BuilderStepId>;
}) {
  return (
    <nav
      aria-label="Estrutura da página"
      className="w-[280px] shrink-0 rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)] px-[25px] py-[25px]"
    >
      <h2 className="font-helvetica text-[18px] leading-none font-bold tracking-[0.18px] text-white">
        Estrutura da página
      </h2>
      <p className="mt-[14px] font-poppins text-[14px] leading-none text-brand-fg-subtle">
        Crie a página personalizada
      </p>

      <ul className="mt-[25px] flex flex-col gap-[15px]">
        {BUILDER_STEPS.map((step) => {
          const isActive = step.id === active;
          const isDirty = dirtySteps.has(step.id);

          const inner = (
            <>
              <span
                aria-hidden
                className={`flex h-[34px] w-[37px] shrink-0 items-center justify-center rounded-[8px] font-poppins text-[13px] font-bold ${
                  isActive
                    ? "bg-[image:var(--brand-orange-gradient)] text-white"
                    : "border border-white/10 bg-black/40 text-brand-fg-muted"
                }`}
              >
                {step.number}
              </span>

              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate font-poppins text-[13px] leading-[16px] font-bold text-white">
                  {step.title}
                </span>
                <span className="block truncate font-poppins text-[12px] leading-[15px] text-brand-fg-subtle">
                  {step.hint}
                </span>
              </span>

              {isDirty ? (
                <span
                  // O ponto diz "esta etapa tem coisa não publicada". Sem ele,
                  // sair da etapa faz a alteração parecer perdida — o painel
                  // some e nada na tela lembra que ela continua no rascunho.
                  className="size-[8px] shrink-0 rounded-full bg-brand-orange"
                  title="Alteração ainda não publicada"
                  role="img"
                  aria-label="Alteração ainda não publicada"
                />
              ) : null}
            </>
          );

          const shell = `flex h-[50px] w-full items-center gap-[15px] rounded-[12px] border px-[10px] transition-opacity hover:opacity-90 ${
            isActive
              ? "border-brand-orange/60 bg-brand-orange/10"
              : "border-white/10 bg-[image:var(--brand-surface-fill)]"
          }`;

          return (
            <li key={step.id}>
              {step.href ? (
                <Link href={step.href(gameId, gameSlug)} className={shell}>
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(step.id)}
                  aria-current={isActive ? "step" : undefined}
                  className={shell}
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
