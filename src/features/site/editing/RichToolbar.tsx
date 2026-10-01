"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { safeHref } from "@/features/pages/blocks/markdown";
import { cn } from "@/lib/cn";
import type { RichAlign } from "../richText";
import { toggleHighlight } from "./richDom";

/** O que a barra precisa saber do campo em edição (ver `RichEditing`). */
export type RichToolbarTarget = {
  element: HTMLElement;
  align: RichAlign | null;
  setAlign: (align: RichAlign | null) => void;
  finish: () => void;
  /** Avisa que o conteúdo mudou por um botão da barra (o campo de formulário regrava o valor). */
  changed?: () => void;
};

/**
 * Barra de formatação de um campo FORMATADO (2026-10-01): negrito, itálico,
 * destaque laranja, link e alinhamento.
 *
 * Fica FORA do campo, presa acima dele (`position: fixed`). Os botões agem no
 * `mousedown` com `preventDefault` — o foco e a seleção continuam no texto;
 * clicar normalmente tiraria o foco e encerraria a edição antes do comando.
 * O campo de link é a exceção (precisa de foco): a seleção é guardada antes e
 * devolvida ao aplicar, e o `data-rich-toolbar` avisa o editor de que o foco
 * saiu PARA a barra, não para fora.
 *
 * Negrito/itálico/link usam `execCommand` — obsoleto no papel, mas é o único
 * jeito de o desfazer (Ctrl+Z) do navegador continuar funcionando, e o que ele
 * gera passa pela allowlist de `domToRich` na volta de qualquer forma.
 */
export function RichToolbar({
  target,
  floating = true,
}: {
  target: RichToolbarTarget;
  /** `false`: barra fixa acima do campo (formulário), sem posição calculada. */
  floating?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [linkError, setLinkError] = useState(false);
  const savedRange = useRef<Range | null>(null);

  // Acima do campo; se não couber, abaixo. Recalcula ao rolar.
  useLayoutEffect(() => {
    if (!floating) return;
    const place = () => {
      const box = target.element.getBoundingClientRect();
      const height = ref.current?.offsetHeight ?? 44;
      const width = ref.current?.offsetWidth ?? 320;
      const above = box.top - height - 8;
      setPosition({
        top: above > 8 ? above : box.bottom + 8,
        left: Math.min(Math.max(8, box.left), window.innerWidth - width - 8),
      });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [target.element, linkOpen, floating]);

  useEffect(() => {
    if (!linkOpen) return;
    ref.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [linkOpen]);

  const command = (name: "bold" | "italic") => () => {
    if (!floating) restoreFocus();
    document.execCommand(name);
    target.changed?.();
  };

  /** No formulário, o clique pode vir sem o campo focado: devolve o foco a ele. */
  function restoreFocus() {
    if (document.activeElement !== target.element) target.element.focus({ preventScroll: true });
  }

  function restoreSelection() {
    target.element.focus({ preventScroll: true });
    const range = savedRange.current;
    if (!range) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function openLink() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!target.element.contains(range.commonAncestorContainer)) return;
    savedRange.current = range.cloneRange();
    const current = (range.startContainer.parentElement?.closest("a")?.getAttribute("href") ?? "").trim();
    setLinkValue(current);
    setLinkError(false);
    setLinkOpen(true);
  }

  function applyLink() {
    const url = linkValue.trim();
    if (url && !safeHref(url)) {
      setLinkError(true);
      return;
    }
    setLinkOpen(false);
    restoreSelection();
    if (!url) document.execCommand("unlink");
    else if (savedRange.current && !savedRange.current.collapsed) document.execCommand("createLink", false, url);
    target.changed?.();
  }

  if (floating && !position) return <div ref={ref} className="fixed opacity-0" aria-hidden />;

  return (
    <div
      ref={ref}
      data-rich-toolbar
      role="toolbar"
      aria-label="Formatação do texto"
      style={floating && position ? { top: position.top, left: position.left } : undefined}
      className={cn(
        "flex flex-wrap items-center gap-[4px] rounded-[12px] border border-white/15 bg-[#111] p-[5px]",
        floating && "fixed z-[60] shadow-[0_12px_30px_rgba(0,0,0,0.6)]",
      )}
    >
      {linkOpen ? (
        <form
          className="flex items-center gap-[6px]"
          onSubmit={(event) => {
            event.preventDefault();
            applyLink();
          }}
        >
          <input
            value={linkValue}
            onChange={(event) => {
              setLinkValue(event.target.value);
              setLinkError(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setLinkOpen(false);
                restoreSelection();
              }
            }}
            onBlur={(event) => {
              if (!floating) return;
              // Saiu da barra E do texto: termina a edição, como no texto.
              const next = event.relatedTarget as HTMLElement | null;
              if (next && (next.closest("[data-rich-toolbar]") || next === target.element)) return;
              setLinkOpen(false);
              target.finish();
            }}
            placeholder="https://… ou /pagina (vazio tira o link)"
            aria-label="Endereço do link"
            aria-invalid={linkError || undefined}
            className={cn(
              "h-[32px] w-[260px] rounded-[8px] border bg-black/40 px-[10px] font-poppins text-[12px] text-white",
              linkError ? "border-red-9" : "border-white/15",
            )}
          />
          <button type="submit" className="h-[32px] rounded-[8px] bg-brand-orange px-[10px] font-poppins text-[12px] font-bold text-black">
            OK
          </button>
          {linkError ? <span className="font-poppins text-[11px] text-red-9">Use https:// ou /página</span> : null}
        </form>
      ) : (
        <>
          <ToolButton label="Negrito (Ctrl+B)" onPress={command("bold")}>
            <span className="font-bold">N</span>
          </ToolButton>
          <ToolButton label="Itálico (Ctrl+I)" onPress={command("italic")}>
            <span className="italic">I</span>
          </ToolButton>
          <ToolButton
            label="Destaque laranja"
            onPress={() => {
              toggleHighlight(target.element);
              target.changed?.();
            }}
          >
            <span className="font-bold text-brand-orange">A</span>
          </ToolButton>
          <ToolButton label="Link" onPress={openLink}>
            <span className="underline">link</span>
          </ToolButton>
          <span aria-hidden className="mx-[2px] h-[20px] w-px bg-white/15" />
          {(["left", "center", "right"] as const).map((align) => (
            <ToolButton
              key={align}
              label={align === "left" ? "Alinhar à esquerda" : align === "center" ? "Centralizar" : "Alinhar à direita"}
              active={target.align === align}
              onPress={() => target.setAlign(target.align === align ? null : align)}
            >
              <AlignIcon align={align} />
            </ToolButton>
          ))}
          {floating ? (
            <span className="ml-[4px] hidden font-poppins text-[11px] text-white/45 sm:inline">Enter salva · Esc cancela</span>
          ) : null}
        </>
      )}
    </div>
  );
}

function ToolButton({
  label,
  active = false,
  onPress,
  children,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active || undefined}
      title={label}
      // `mousedown` + preventDefault: o foco e a seleção ficam no texto.
      onMouseDown={(event) => {
        event.preventDefault();
        onPress();
      }}
      className={cn(
        "flex h-[32px] min-w-[32px] items-center justify-center rounded-[8px] px-[8px] font-poppins text-[13px] text-white transition-colors hover:bg-white/10",
        active && "bg-brand-orange/25 text-white",
      )}
    >
      {children}
    </button>
  );
}

/** Três linhas, como nos editores de texto — desenhadas, sem fonte de ícones. */
function AlignIcon({ align }: { align: RichAlign }) {
  const x = (width: number) => (align === "left" ? 2 : align === "center" ? (16 - width) / 2 : 14 - width);
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden fill="currentColor">
      <rect x={x(12)} y="1" width="12" height="2" rx="1" />
      <rect x={x(8)} y="6" width="8" height="2" rx="1" />
      <rect x={x(12)} y="11" width="12" height="2" rx="1" />
    </svg>
  );
}
