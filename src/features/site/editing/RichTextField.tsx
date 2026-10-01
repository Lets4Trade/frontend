"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { splitAlign, type RichAlign } from "../richText";
import { fillRich, finalValue } from "./richDom";
import { RichToolbar } from "./RichToolbar";

/**
 * Campo de FORMULÁRIO com texto formatado (2026-10-01) — o mesmo editor visual
 * da edição na página, para `/admin/sessoes` e o painel lateral do Construtor.
 *
 * Não controlado por dentro: o React não reescreve o conteúdo editável a cada
 * tecla (isso jogaria o cursor para o início). O valor sobe por `onChange` no
 * formato guardado; só um valor que vem DE FORA (trocar de sessão, desfazer) é
 * redesenhado no campo.
 */
export function RichTextField({
  label,
  value,
  onChange,
  maxLength,
  placeholder,
  multiline = false,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Limite do backend para o campo — o contador fica vermelho acima dele. */
  maxLength: number;
  placeholder?: string;
  /** Texto longo: Enter quebra linha. Curto: só Shift+Enter. */
  multiline?: boolean;
  hint?: string;
}) {
  const id = useId();
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [align, setAlignState] = useState<RichAlign | null>(() => splitAlign(value).align);
  const emitted = useRef<string | null>(null);

  // Valor vindo de fora (não o que este campo acabou de emitir): redesenha.
  useLayoutEffect(() => {
    if (!element || value === emitted.current) return;
    const parts = splitAlign(value);
    fillRich(element, parts.text);
    showAlign(element, parts.align);
    setAlignState(parts.align);
    emitted.current = value;
  }, [element, value]);

  function emit(nextAlign: RichAlign | null = align) {
    if (!element) return;
    const next = finalValue(element, nextAlign);
    emitted.current = next;
    onChange(next);
  }

  function setAlign(next: RichAlign | null) {
    setAlignState(next);
    if (element) showAlign(element, next);
    emit(next);
  }

  const length = value.length;
  const over = length > maxLength;

  return (
    <div className="flex flex-col gap-[8px]">
      <span id={`${id}-label`} className="font-helvetica text-[16px] font-bold tracking-[0.16px] text-white">
        {label}
      </span>
      {element ? (
        <RichToolbar
          floating={false}
          target={{ element, align, setAlign, finish: () => undefined, changed: () => emit() }}
        />
      ) : null}
      <div
        ref={setElement}
        role="textbox"
        aria-labelledby={`${id}-label`}
        aria-multiline={multiline || undefined}
        aria-invalid={over || undefined}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        spellCheck={false}
        onInput={() => emit()}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          // Quebra SEMPRE como `<br>` (o navegador criaria blocos `<div>`).
          // Campo curto: só Shift+Enter quebra (títulos de duas linhas).
          event.preventDefault();
          if (multiline || event.shiftKey) {
            document.execCommand("insertLineBreak");
            emit();
          }
        }}
        onPaste={(event) => {
          event.preventDefault();
          const text = event.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, multiline ? text : text.replace(/\s+/g, " "));
        }}
        className={cn(
          "w-full rounded-[15px] border bg-black px-[16px] py-[12px] font-poppins text-[14px] leading-[22px] whitespace-pre-wrap text-white outline-none focus:border-brand-orange",
          "empty:before:pointer-events-none empty:before:text-white/35 empty:before:content-[attr(data-placeholder)]",
          multiline ? "min-h-[150px]" : "min-h-[50px]",
          over ? "border-red-9" : "border-brand-border",
        )}
      />
      <div className="flex justify-between gap-[10px] font-poppins text-[12px]">
        <span className="text-brand-fg-subtle">{hint ?? "Selecione um trecho para formatar."}</span>
        <span className={over ? "font-bold text-red-9" : "text-brand-fg-subtle"}>
          {length}/{maxLength}
          {over ? " — texto longo demais, não vai salvar" : ""}
        </span>
      </div>
    </div>
  );
}

/** O alinhamento escolhido, visível no próprio campo enquanto se edita. */
function showAlign(element: HTMLElement, align: RichAlign | null) {
  element.style.textAlign = align ?? "";
}

/**
 * O mesmo campo para formulários NÃO controlados (`FormData`): guarda o valor
 * num `<input type="hidden" name>` — quem envia o formulário lê o formato
 * guardado, como leria de um `<input>` comum.
 */
export function RichFormInput({
  name,
  defaultValue,
  ...props
}: Omit<Parameters<typeof RichTextField>[0], "value" | "onChange"> & { name: string; defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <>
      <RichTextField {...props} value={value} onChange={setValue} />
      <input type="hidden" name={name} value={value} />
    </>
  );
}
