"use client";

import Image from "next/image";
import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Field, fieldSurface } from "./Field";

type Option = { value: string; label: string };

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: readonly Option[];
  /** Texto mostrado enquanto nada foi escolhido (opção desabilitada). */
  placeholder: string;
  error?: string;
};

/**
 * Select com a mesma pílula dos campos de texto e a seta do design (18px, a
 * 25px da borda direita).
 *
 * É um `<select>` nativo de propósito: no mobile abre o seletor do sistema,
 * funciona por teclado e é lido corretamente por leitor de tela — coisas que
 * um dropdown feito à mão só alcança com bastante trabalho. `appearance-none`
 * remove a seta padrão do browser para a do design entrar no lugar.
 *
 * O `<option>` herda o fundo do sistema, não o da página: por isso as opções
 * levam cor explícita, senão ficam texto branco sobre branco no Windows.
 */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField(
    { label, options, placeholder, error, className, id, ...props },
    ref,
  ) {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const errorId = `${selectId}-error`;

    return (
      <Field label={label} htmlFor={selectId} error={error} errorId={errorId}>
        <div className="relative w-full">
          <select
            ref={ref}
            id={selectId}
            defaultValue=""
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              fieldSurface(error),
              "h-[50px] appearance-none rounded-full pr-[53px]",
              // Sem valor escolhido o texto é placeholder, não conteúdo.
              "invalid:text-white/60",
              className,
            )}
            {...props}
          >
            <option value="" disabled className="bg-brand-surface text-white">
              {placeholder}
            </option>
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className="bg-brand-surface text-white"
              >
                {option.label}
              </option>
            ))}
          </select>

          <Image
            src="/icons/chevron-down.svg"
            alt=""
            width={18}
            height={18}
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-[25px] -translate-y-1/2"
          />
        </div>
      </Field>
    );
  },
);
