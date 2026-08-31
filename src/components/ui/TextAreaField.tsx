"use client";

import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Field, fieldSurface } from "./Field";

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
};

/**
 * Área de texto — 146px de altura e raio de **16px**, NÃO pílula.
 *
 * O raio veio do path do Rectangle 6441 exportado (canto de 18.5→34.5 = 16px).
 * Vale registrar porque é a única superfície do design que foge do
 * `rounded-full`: a 146px de altura, uma pílula viraria um estádio.
 *
 * `py-[15px]`: o texto começa a ~17px do topo da caixa no design, e a borda de
 * 2px entra na conta. `resize-none` mantém a caixa no tamanho desenhado.
 */
export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  function TextAreaField({ label, error, className, id, ...props }, ref) {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const errorId = `${textareaId}-error`;

    return (
      <Field label={label} htmlFor={textareaId} error={error} errorId={errorId}>
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            fieldSurface(error),
            "h-[146px] resize-none rounded-[16px] py-[15px] leading-[21px]",
            className,
          )}
          {...props}
        />
      </Field>
    );
  },
);
