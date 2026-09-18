"use client";

import { forwardRef, useId, type ChangeEvent, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { applyMask, MASKS, type MaskKind } from "@/lib/masks";
import { Field, fieldSurface } from "./Field";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Mensagem de erro já traduzida. Quando presente, o campo entra em estado inválido. */
  error?: string;
  /**
   * Máscara aplicada a cada tecla (`phone` ou `cnpj`, ver `lib/masks.ts`).
   *
   * Funciona com campo controlado (`value` + `onChange`) e não controlado
   * (`defaultValue` + `FormData`): a máscara reescreve o próprio `<input>`
   * ANTES do `onChange` de quem usa, então o valor que chega lá — e no
   * `FormData` — já está formatado.
   */
  mask?: MaskKind;
};

/** Teclado e tamanho máximo que cada máscara pede. */
const MASK_ATTRS: Record<MaskKind, InputHTMLAttributes<HTMLInputElement>> = {
  // "+55 (11) 91234-5678" tem 19; "+" + 15 dígitos, 16.
  phone: { inputMode: "tel", maxLength: 20 },
  // CNPJ alfanumérico pede teclado de texto; "00.000.000/0000-00" tem 18.
  cnpj: { inputMode: "text", maxLength: 18, autoCapitalize: "characters" },
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
  function TextField(
    { label, error, className, id, mask, onChange, value, defaultValue, ...props },
    ref,
  ) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;

    // Valor vindo do banco pode ser anterior à máscara ("11912345678"): exibe
    // já formatado. Só texto — número ou array passa como veio.
    const format = mask ? MASKS[mask] : null;
    const shown = format && typeof value === "string" ? format(value) : value;
    const initial =
      format && typeof defaultValue === "string" ? format(defaultValue) : defaultValue;

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
      if (mask) applyMask(event.currentTarget, mask);
      onChange?.(event);
    }

    return (
      <Field label={label} htmlFor={inputId} error={error} errorId={errorId}>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(fieldSurface(error), "h-[50px] rounded-full", className)}
          {...(mask ? MASK_ATTRS[mask] : {})}
          {...props}
          {...(value !== undefined ? { value: shown } : {})}
          {...(defaultValue !== undefined ? { defaultValue: initial } : {})}
          onChange={mask || onChange ? handleChange : undefined}
        />
      </Field>
    );
  },
);
