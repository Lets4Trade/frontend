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
  /**
   * Avisa quem precisa do valor ENQUANTO se digita (a prévia de preço de
   * serviço do cadastro de produto). O `FormData` continua vindo do hidden.
   */
  onCentsChange?: (cents: number) => void;
  /**
   * Casas depois da vírgula, em REAIS. 2 (padrão) = a máscara de sempre, com os
   * dígitos entrando pela direita. 4 (2026-11-09, preço do produto: "preciso
   * colocar 0,035") = a pessoa digita a vírgula ("0,035", "129,90") e os
   * centavos saem com até 2 casas (3,5).
   */
  fractionDigits?: 2 | 4;
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

/** 3.5 → "R$ 0,035": até 4 casas, mínimo 2 (o que o `formatPrice` da loja mostra). */
function formatFineCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 4,
  });
}

/**
 * Texto digitado no modo de 4 casas → centavos (até 2 casas), sem float no
 * caminho: "0,035" vira 35 décimos-milésimos de real → 3,5 centavos. Vírgula é
 * a decimal; ponto é milhar, exceto o ponto único claramente decimal ("4.10",
 * "0.035", "0.0035").
 * `null` = texto que não é valor.
 */
export function parseFineMoney(raw: string): number | null {
  let text = raw.replace(/R\$/gi, "").replace(/\s/g, "");
  if (!text) return 0;
  if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else {
    const dots = text.split(".").length - 1;
    // "1.234" é milhar (como no `parsePriceInput` da tabela de preços); "0.035",
    // "4.10" e "0.0035" são decimais.
    const decimalDot = /\.\d{1,2}$/.test(text) || /\.\d{4}$/.test(text) || /^0\.\d{3}$/.test(text);
    if (dots > 1 || (dots === 1 && !decimalDot)) text = text.replace(/\./g, "");
  }
  const match = /^(\d*)(?:\.(\d{0,4}))?$/.exec(text);
  if (!match || (match[1] === "" && !match[2])) return match ? 0 : null;
  const whole = match[1].slice(0, 12) || "0";
  const tenThousandths = Number(whole) * 10_000 + Number((match[2] ?? "").padEnd(4, "0"));
  if (!Number.isSafeInteger(tenThousandths)) return null;
  // 1 décimo-milésimo de real = 0,01 centavo: a divisão por 100 dá o número
  // curto e exato ("3.5", "3.51") que o backend valida por casas.
  return tenThousandths / 100;
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
  onCentsChange,
  fractionDigits = 2,
}: MoneyFieldProps) {
  const generatedId = useId();
  const inputId = `${generatedId}-money`;
  const errorId = `${inputId}-error`;

  const inputRef = useRef<HTMLInputElement>(null);
  const [cents, setCents] = useState(defaultCents);
  const fine = fractionDigits === 4;
  // Modo de 4 casas: o texto é o que a pessoa digitou ("0,03" a caminho de
  // "0,035") — formatar a cada tecla comeria a vírgula e o zero do fim.
  const [text, setText] = useState(() => (defaultCents ? formatFineCents(defaultCents) : ""));

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

    const handleReset = () => {
      setCents(defaultCents);
      setText(defaultCents ? formatFineCents(defaultCents) : "");
      onCentsChange?.(defaultCents);
    };
    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, [defaultCents, onCentsChange]);

  function handleFineChange(event: ChangeEvent<HTMLInputElement>) {
    // Só dígitos, vírgula, ponto e o "R$" de um valor colado; o resto some.
    const raw = event.target.value.replace(/[^\d.,R$\s]/gi, "");
    const parsed = parseFineMoney(raw);
    // Texto que não vira valor (duas vírgulas, 5ª casa): a tecla é ignorada.
    if (parsed === null) return;
    const next = Math.min(parsed, maxCents);
    setText(next === parsed ? raw : formatFineCents(next));
    setCents(next);
    onCentsChange?.(next);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const digits = event.target.value.replace(/\D/g, "");

    // Vazio volta a zero em vez de virar `NaN` — apagar tudo é o gesto normal
    // de quem vai redigitar o preço.
    if (digits === "") {
      setCents(0);
      onCentsChange?.(0);
      return;
    }

    // `slice` antes do `Number`: um colar de trinta dígitos passaria de
    // `Number.MAX_SAFE_INTEGER` e o teto compararia contra um valor já errado.
    const value = Number(digits.slice(0, 12));
    const next = Math.min(value, maxCents);
    setCents(next);
    onCentsChange?.(next);
  }

  return (
    <Field label={label} htmlFor={inputId} error={error} errorId={errorId}>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        // `numeric` e não `decimal`: só dígitos entram, e o teclado do celular
        // não precisa oferecer a vírgula que o campo ignoraria. No modo de 4
        // casas a vírgula é digitada, então o teclado é o `decimal`.
        inputMode={fine ? "decimal" : "numeric"}
        autoComplete="off"
        value={fine ? text : cents === 0 ? "" : formatCents(cents)}
        onChange={fine ? handleFineChange : handleChange}
        // Ao sair do campo o texto vira o valor formatado ("0,035" → "R$ 0,035").
        onBlur={fine ? () => setText(cents === 0 ? "" : formatFineCents(cents)) : undefined}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(fieldSurface(error), "h-[50px] rounded-full", className)}
      />

      <input type="hidden" name={name} value={cents} />
    </Field>
  );
}
