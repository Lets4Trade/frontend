import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Moldura comum de campo: label acima, controle no meio, erro abaixo.
 * Extraído para os três tipos (texto, select, textarea) não repetirem a mesma
 * label, o mesmo `aria-describedby` e o mesmo espaçamento.
 *
 * Medidas do design: label Helvetica Bold 18px com caixa de 21px, 12px até o
 * controle. Ver comentário de `fieldSurface` para o resto.
 */
export function Field({
  label,
  htmlFor,
  error,
  errorId,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  errorId: string;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-3">
      <label
        htmlFor={htmlFor}
        // `whitespace-nowrap` como no design: a label mais longa ("Descrição
        // Sobre o Produto Vendido:") é mais larga que a coluna de 315px e
        // transborda sobre o espaço vazio ao lado, em vez de quebrar em duas
        // linhas e empurrar o campo para baixo.
        className="font-helvetica text-[18px] leading-[21px] font-bold tracking-[0.18px] whitespace-nowrap text-white"
      >
        {label}
      </label>

      {children}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="px-[25px] font-helvetica text-[13px] text-red-9"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Superfície dos controles (Rectangle 6440/6441 do Figma): fill cinza a 10% e
 * stroke branco a 15% com 2px.
 *
 * `px-[23px]` e não 25: o texto começa a 25px da BORDA EXTERNA no design, e a
 * borda de 2px do CSS fica dentro da caixa — 2 + 23 fecha os 25.
 */
export function fieldSurface(error?: string) {
  return cn(
    "w-full border-2 bg-[image:var(--brand-surface-fill)] px-[23px]",
    "font-poppins text-[16px] tracking-[0.16px] text-white",
    "placeholder:text-white/60",
    "outline-none transition-colors focus:border-brand-orange",
    error ? "border-red-9" : "border-[var(--brand-stroke-soft)]",
  );
}
