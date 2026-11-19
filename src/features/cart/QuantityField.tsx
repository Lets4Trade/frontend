"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

/** Dígitos aceitos no campo: 999.999.999 cobre qualquer pedido real. */
const MAX_DIGITS = 9;

/**
 * Quantidade DIGITÁVEL (2026-11-18, pedido do usuário: "tem que conseguir
 * digitar 10000000" no card e no carrinho). Era um número entre − e +, e
 * chegar a 10 milhões clicando não é opção.
 *
 * - Só dígitos; cada valor válido (≥ mínimo) já vale — o preço acompanha.
 * - Vazio ou abaixo do mínimo NÃO grava: ao sair do campo volta ao último
 *   valor bom. O teto (`max`) corta.
 * - Fora da edição mostra o número com pontos (10.000.000); focado, os dígitos
 *   crus, todos selecionados para digitar por cima.
 * - Enter confirma; ↑/↓ somam/tiram um.
 *
 * ── `fit`: número grande no card estreito ────────────────────────────────
 * A LETRA NÃO DIMINUI: no celular todo campo tem 16px (regra global em
 * `globals.css`, senão o iPhone dá zoom ao tocar). Quem diminui é o campo
 * inteiro, por `transform: scale` — mede o texto e, se não couber na caixa do
 * pai (`relative`), o campo fica mais largo na medida exata e é reduzido de
 * volta para a largura da caixa. Número curto: escala 1, nada muda.
 */
export function QuantityField({
  value,
  min = 1,
  max,
  onChange,
  label,
  className,
  fit = false,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  className?: string;
  /** Reduz o campo para caber na caixa do pai (que precisa ser `relative`). */
  fit?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const editing = draft !== null;
  const shown = editing ? draft : value.toLocaleString("pt-BR");
  const input = useRef<HTMLInputElement>(null);
  const scale = useFitScale(input, shown, fit);

  function change(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, MAX_DIGITS);
    setDraft(digits);
    const next = Number(digits);
    if (digits !== "" && next >= min) onChange(Math.min(next, max));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const next = Math.min(max, Math.max(min, value + (event.key === "ArrowUp" ? 1 : -1)));
      onChange(next);
      setDraft(String(next));
    }
  }

  // Os pontos de milhar são estreitos: meio dígito cada.
  const dots = shown.length - shown.replace(/\D/g, "").length;
  const chars = Math.max(2, shown.length - dots / 2);
  const style: CSSProperties = fit
    ? { width: `${100 / scale}%`, transform: `translateX(-50%) scale(${scale})` }
    : { width: `calc(${chars}ch + 10px)` };

  return (
    <input
      ref={input}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      enterKeyHint="done"
      autoComplete="off"
      aria-label={label}
      value={shown}
      onFocus={(event) => {
        setDraft(String(value));
        const field = event.currentTarget;
        // Depois do render com os dígitos crus.
        requestAnimationFrame(() => field.select());
      }}
      onChange={(event) => change(event.target.value)}
      onBlur={() => setDraft(null)}
      onKeyDown={onKeyDown}
      style={style}
      className={cn(
        "min-w-0 bg-transparent text-center font-poppins font-bold text-white tabular-nums outline-none",
        fit && "absolute inset-y-0 left-1/2 origin-center",
        className,
      )}
    />
  );
}

let measureCanvas: HTMLCanvasElement | null = null;

/** Escala (≤ 1) para o texto do campo caber na largura do pai. */
function useFitScale(input: React.RefObject<HTMLInputElement | null>, text: string, enabled: boolean): number {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const field = input.current;
    const box = field?.parentElement;
    if (!enabled || !field || !box) return;

    const measure = () => {
      measureCanvas ??= document.createElement("canvas");
      const context = measureCanvas.getContext("2d");
      if (!context) return;
      const css = getComputedStyle(field);
      context.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
      const spacing = Number.parseFloat(css.letterSpacing) || 0;
      // +12%: o canvas não aplica `tabular-nums` (dígitos de largura fixa, um
      // pouco mais largos); +6px de respiro nas bordas.
      const needed = context.measureText(text).width * 1.12 + spacing * text.length + 6;
      const available = box.clientWidth;
      if (available > 0) setScale(Math.min(1, available / needed));
    };

    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [input, text, enabled]);

  return scale;
}
