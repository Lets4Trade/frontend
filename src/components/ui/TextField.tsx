"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Field, fieldSurface } from "./Field";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Mensagem de erro já traduzida. Quando presente, o campo entra em estado inválido. */
  error?: string;
};

/**
 * Campo de texto: pílula de 50px (raio 25 no design → `rounded-full`).
 *
 * Acessibilidade — o erro é ligado ao input por `aria-describedby` e anunciado
 * via `role="alert"` no `Field`, então leitor de tela informa a falha sem
 * depender da cor. `aria-invalid` marca o estado para tecnologia assistiva.
 *
 * `forwardRef` porque formulários costumam querer foco programático no primeiro
 * campo inválido.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField({ label, error, className, id, ...props }, ref) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;

    return (
      <Field label={label} htmlFor={inputId} error={error} errorId={errorId}>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(fieldSurface(error), "h-[50px] rounded-full", className)}
          {...props}
        />
      </Field>
    );
  },
);
