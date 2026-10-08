"use client";

import { useRef, useState, type ReactNode } from "react";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { safeHref } from "@/features/pages/blocks/markdown";
import { applyFormat, type MarkdownFormat } from "./markdownFormat";

/**
 * Área de texto com barra de formatação (negrito, itálico, link e listas).
 *
 * O texto continua sendo Markdown RESTRITO (`pages/blocks/markdown.tsx`): os
 * botões só escrevem a sintaxe por quem edita. Guardar HTML de um editor
 * visual exigiria sanitizar na entrada e na saída, e um esquecimento vira XSS
 * para todo visitante; aqui a loja transforma o texto em elementos React e
 * desenha só o que conhece.
 *
 * O link pede o endereço num campo da própria tela (nunca `window.prompt`) e
 * recusa o que a loja não desenharia: só `https://` ou caminho do site.
 */
export function MarkdownTextArea({
  label,
  value,
  onChange,
  maxLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  maxLength: number;
  placeholder?: string;
}) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  // A seleção de quando o link foi pedido: o foco vai para o campo do endereço
  // e a do textarea deixaria de valer.
  const pending = useRef({ start: 0, end: 0 });
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState("");
  const [error, setError] = useState<string>();

  function apply(format: MarkdownFormat, start: number, end: number, url?: string) {
    const edit = applyFormat(value, start, end, format, url);
    if (edit.value.length > maxLength) {
      setError(`O texto pode ter no máximo ${maxLength} caracteres.`);
      return;
    }
    setError(undefined);
    onChange(edit.value);
    // Depois do render: devolve o foco com o trecho formatado selecionado.
    requestAnimationFrame(() => {
      textarea.current?.focus();
      textarea.current?.setSelectionRange(edit.selectionStart, edit.selectionEnd);
    });
  }

  function format(kind: Exclude<MarkdownFormat, "link">) {
    const el = textarea.current;
    if (el) apply(kind, el.selectionStart, el.selectionEnd);
  }

  function openLink() {
    const el = textarea.current;
    pending.current = { start: el?.selectionStart ?? value.length, end: el?.selectionEnd ?? value.length };
    setHref("");
    setError(undefined);
    setLinkOpen(true);
  }

  function insertLink() {
    const url = href.trim();
    if (!safeHref(url)) {
      setError("Use um endereço que comece com https:// ou um caminho do site, como /noticias.");
      return;
    }
    setLinkOpen(false);
    apply("link", pending.current.start, pending.current.end, url);
  }

  return (
    <div className="flex flex-col gap-[8px]">
      <TextAreaField
        ref={textarea}
        label={label}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />

      <div role="toolbar" aria-label={`Formatação de ${label}`} className="flex flex-wrap gap-[6px]">
        <ToolButton label="Negrito" onClick={() => format("bold")}>
          <strong>B</strong>
        </ToolButton>
        <ToolButton label="Itálico" onClick={() => format("italic")}>
          <em>I</em>
        </ToolButton>
        <ToolButton label="Link" onClick={openLink} pressed={linkOpen}>
          Link
        </ToolButton>
        <ToolButton label="Lista" onClick={() => format("ul")}>
          • Lista
        </ToolButton>
        <ToolButton label="Lista numerada" onClick={() => format("ol")}>
          1. Lista
        </ToolButton>
      </div>

      {linkOpen ? (
        <div className="flex items-end gap-[10px]">
          <div className="min-w-0 flex-1">
            <TextField
              label="Endereço do link"
              value={href}
              placeholder="https://… ou /noticias"
              maxLength={500}
              autoFocus
              onChange={(event) => setHref(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  insertLink();
                }
                if (event.key === "Escape") setLinkOpen(false);
              }}
            />
          </div>
          <button
            type="button"
            onClick={insertLink}
            className="h-[50px] shrink-0 rounded-full bg-[image:var(--brand-orange-gradient)] px-[20px] font-poppins text-[14px] font-bold text-white transition-opacity hover:opacity-90"
          >
            Inserir
          </button>
          <button
            type="button"
            onClick={() => setLinkOpen(false)}
            className="h-[50px] shrink-0 rounded-full border border-white/15 px-[16px] font-poppins text-[14px] text-white/80 transition-opacity hover:opacity-90"
          >
            Cancelar
          </button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="font-poppins text-[13px] text-brand-orange">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ToolButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      // Sem isto o clique tira o foco do texto antes de lermos a seleção.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="h-[34px] min-w-[34px] rounded-[8px] border border-white/10 bg-[image:var(--brand-surface-fill)] px-[10px] font-poppins text-[13px] text-white transition-opacity hover:opacity-90 aria-pressed:border-brand-orange"
    >
      {children}
    </button>
  );
}
