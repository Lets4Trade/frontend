"use client";

import { useRef, useState, type ReactNode } from "react";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { safeHref } from "@/features/pages/blocks/markdown";
import { applyFormat, insertImage, toggleHeading, type Edit, type MarkdownFormat } from "./markdownFormat";

/** Envia a imagem e devolve o caminho que entra no texto, ou a frase do erro. */
export type UploadImage = (file: File) => Promise<{ url: string } | { error: string }>;

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
  onUploadImage,
  imageHint,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  maxLength: number;
  placeholder?: string;
  /**
   * Liga os botões "Subtítulo" e "Imagem" (2026-10-16, textos da página do
   * pacote). Só quem desenha imagem (`parseBlocks({ images: true })`) passa.
   */
  onUploadImage?: UploadImage;
  /** Dica de tamanho no botão Imagem (regra do painel: toda imagem mostra a medida). */
  imageHint?: string;
}) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  // A seleção de quando o link foi pedido: o foco vai para o campo do endereço
  // e a do textarea deixaria de valer.
  const pending = useRef({ start: 0, end: 0 });
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState("");
  const [error, setError] = useState<string>();

  function apply(format: MarkdownFormat, start: number, end: number, url?: string) {
    commit(applyFormat(value, start, end, format, url));
  }

  function commit(edit: Edit) {
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

  function heading() {
    const el = textarea.current;
    if (el) commit(toggleHeading(value, el.selectionStart, el.selectionEnd));
  }

  function pickImage() {
    const el = textarea.current;
    pending.current = { start: el?.selectionStart ?? value.length, end: el?.selectionEnd ?? value.length };
    fileInput.current?.click();
  }

  async function uploadImage(file: File | undefined) {
    if (!file || !onUploadImage) return;
    setUploading(true);
    setError(undefined);
    try {
      const result = await onUploadImage(file);
      if ("error" in result) setError(result.error);
      else commit(insertImage(value, pending.current.end, result.url));
    } finally {
      setUploading(false);
      // Permite escolher o MESMO arquivo de novo (o `change` não dispararia).
      if (fileInput.current) fileInput.current.value = "";
    }
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
      setError("Use um endereço que comece com https:// ou um caminho do site, como /blog.");
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
        {onUploadImage ? (
          <>
            <ToolButton label="Subtítulo" onClick={heading}>
              Subtítulo
            </ToolButton>
            <ToolButton
              label={imageHint ? `Imagem (${imageHint})` : "Imagem"}
              onClick={pickImage}
              disabled={uploading}
            >
              {uploading ? "Enviando…" : "Imagem"}
            </ToolButton>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              aria-label={`Imagem para ${label}`}
              onChange={(event) => void uploadImage(event.target.files?.[0])}
            />
          </>
        ) : null}
      </div>
      {onUploadImage && imageHint ? (
        <p className="font-poppins text-[12px] text-brand-fg-subtle">
          A imagem entra na linha do cursor, do tamanho da coluna ({imageHint}).
        </p>
      ) : null}

      {linkOpen ? (
        <div className="flex items-end gap-[10px]">
          <div className="min-w-0 flex-1">
            <TextField
              label="Endereço do link"
              value={href}
              placeholder="https://… ou /blog"
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
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      // Sem isto o clique tira o foco do texto antes de lermos a seleção.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="h-[34px] min-w-[34px] rounded-[8px] border border-white/10 bg-[image:var(--brand-surface-fill)] px-[10px] font-poppins text-[13px] text-white transition-opacity hover:opacity-90 disabled:opacity-50 aria-pressed:border-brand-orange"
    >
      {children}
    </button>
  );
}
