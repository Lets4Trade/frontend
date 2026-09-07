"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { cn } from "@/lib/cn";
import { Field, fieldSurface } from "./Field";

type MoneyFieldProps = {
  label: string;
  /** Nome do campo que vai para o `FormData` — com o valor em CENTAVOS. */
  name: string;
  placeholder?: string;
  error?: string;
  /** Teto em centavos. Espelha o `@Max` do DTO. */
  maxCents?: number;
  defaultCents?: number;
  className?: string;
};

/** 5000 → "R$ 50,00". Aritmética de inteiros: dividir dinheiro por 100 em float erra centavo. */
function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.trunc(abs / 100);
  const remainder = abs % 100;
  const grouped = whole.toLocaleString("pt-BR");
  return `${sign}R$ ${grouped},${String(remainder).padStart(2, "0")}`;
}

/**
 * Campo de dinheiro (Figma 3806:7060, "Preço").
 *
 * ── Por que não é um `<input type="number">` ────────────────────────────────
 * O valor NUNCA existe como decimal neste componente. O que a pessoa digita são
 * dígitos, e eles entram pela DIREITA: "5" vira R$ 0,05, "50" vira R$ 0,50,
 * "5000" vira R$ 50,00. O estado interno é um inteiro de centavos, e é ele que
 * vai para o `FormData` — o backend recebe `priceCents` inteiro e converte para
 * `Decimal` na borda do banco, sem que um `number` fracionário exista em ponto
 * nenhum do caminho.
 *
 * Um `type="number"` com vírgula decimal traria três problemas de uma vez: o
 * separador muda com o locale do navegador, a setinha de incremento não faz
 * sentido para preço, e o valor chegaria como float — que é exatamente o que a
 * regra do projeto proíbe para dinheiro.
 *
 * ── O que o FormData recebe ─────────────────────────────────────────────────
 * Um `<input type="hidden">` com os centavos. O campo visível não tem `name`,
 * de propósito: se tivesse, o texto formatado ("R$ 50,00") viajaria junto e
 * alguém acabaria lendo o campo errado do outro lado.
 *
 * O arquivo escreve "R$ 50.00", com ponto. Aqui o separador é a vírgula, como
 * em todo o resto do site (`formatPrice` da vitrine, o carrinho e o checkout
 * usam `toLocaleString("pt-BR")`). Um preço com ponto na tela de cadastro e com
 * vírgula na vitrine é a mesma loja falando duas línguas.
 */
export function MoneyField({
  label,
  name,
  placeholder = "R$ 0,00",
  error,
  maxCents = 10_000_000,
  defaultCents = 0,
  className,
}: MoneyFieldProps) {
  const generatedId = useId();
  const inputId = `${generatedId}-money`;
  const errorId = `${inputId}-error`;

  const inputRef = useRef<HTMLInputElement>(null);
  const [cents, setCents] = useState(defaultCents);

  /**
   * O valor deste campo é estado do React, e `form.reset()` mexe só no DOM —
   * ele esvazia os inputs e não avisa ninguém. Sem isto, depois de salvar o
   * formulário limpava tudo e o preço continuava marcando "R$ 129,90", pronto
   * para ir no próximo cadastro como se tivesse sido digitado.
   *
   * É a MESMA armadilha do `FileField`, e o mesmo conserto: escutar o evento
   * `reset` do próprio `<form>`, para valer em qualquer formulário que use o
   * campo sem quem o usa precisar lembrar.
   */
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;

    const handleReset = () => setCents(defaultCents);
    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, [defaultCents]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const digits = event.target.value.replace(/\D/g, "");

    // Vazio volta a zero em vez de virar `NaN` — apagar tudo é o gesto normal
    // de quem vai redigitar o preço.
    if (digits === "") {
      setCents(0);
      return;
    }

    // `slice` antes do `Number`: um colar de trinta dígitos passaria de
    // `Number.MAX_SAFE_INTEGER` e o teto compararia contra um valor já errado.
    const value = Number(digits.slice(0, 12));
    setCents(Math.min(value, maxCents));
  }

  return (
    <Field label={label} htmlFor={inputId} error={error} errorId={errorId}>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        // `numeric` e não `decimal`: só dígitos entram, e o teclado do celular
        // não precisa oferecer a vírgula que o campo ignoraria.
        inputMode="numeric"
        autoComplete="off"
        value={cents === 0 ? "" : formatCents(cents)}
        onChange={handleChange}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(fieldSurface(error), "h-[50px] rounded-full", className)}
      />

      <input type="hidden" name={name} value={cents} />
    </Field>
  );
}
