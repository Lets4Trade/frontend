"use client";

import { useRouter } from "next/navigation";
import { useId, useTransition } from "react";
import { cn } from "@/lib/cn";

export type CategorySelectOption = { key: string; label: string; href: string };

/**
 * Um select do filtro de categoria (2026-11-18, pedido do usuário: a grade de
 * botões crescia com a lista — "seria bom se fosse um select").
 *
 * O filtro continua MORANDO NA URL: cada opção carrega o href já montado no
 * servidor (`buildHref`), e escolher é navegar para ele — o mesmo destino que
 * os botões tinham. Sem `scroll`, como os outros filtros: é a mesma tela.
 *
 * Select NATIVO de propósito: no celular abre o seletor do sistema (lista
 * grande rola sozinha, com o polegar), e teclado/leitor de tela vêm de graça.
 */
export function CategorySelect({
  label,
  options,
  value,
}: {
  label: string;
  options: CategorySelectOption[];
  /** `key` da opção marcada. */
  value: string;
}) {
  const id = useId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex min-w-0 flex-col gap-[8px] desk:w-[360px]">
      <label htmlFor={id} className="font-poppins text-[13px] leading-none font-bold tracking-[0.13px] text-white/60">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          aria-busy={pending || undefined}
          onChange={(event) => {
            const href = options.find((option) => option.key === event.target.value)?.href;
            if (href) startTransition(() => router.push(href, { scroll: false }));
          }}
          className={cn(
            "h-[50px] w-full cursor-pointer appearance-none truncate rounded-[12px] border border-white/10 bg-[image:var(--brand-surface-fill)] pr-[46px] pl-[16px] font-poppins text-[14px] font-bold tracking-[0.14px] text-white outline-none transition-opacity focus-visible:border-brand-orange",
            pending && "opacity-60",
          )}
        >
          {options.map((option) => (
            // Fundo escuro na opção: no Windows a lista aberta usa o fundo dela.
            <option key={option.key} value={option.key} className="bg-brand-bg text-white">
              {option.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className="pointer-events-none absolute top-1/2 right-[18px] size-[12px] -translate-y-1/2 text-white/70"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
