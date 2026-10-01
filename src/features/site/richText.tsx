import Link from "next/link";
import type { ReactNode } from "react";
import { safeHref } from "@/features/pages/blocks/markdown";
import { cn } from "@/lib/cn";

/**
 * Texto FORMATADO dos campos do site (2026-10-01): negrito, itálico, destaque
 * laranja, link e alinhamento, escolhidos pelo admin no editor visual.
 *
 * ── Formato guardado ───────────────────────────────────────────────────────
 * O banco continua guardando TEXTO (as mesmas colunas, sem migração), com
 * marcações que o EDITOR escreve sozinho — ninguém precisa digitá-las:
 *
 *   **negrito** · __itálico__ · ==destaque laranja== · [texto](https://… ou /caminho)
 *   {:centro} / {:direita} / {:esquerda} no INÍCIO = alinhamento do campo
 *   \* \_ \= \[ \] \{ \\ = o caractere literal
 *
 * As três marcas de trecho são PARES de caracteres distintos, sem a
 * ambiguidade do Markdown (`**a***b*`): quem escreve é o editor, que sempre as
 * aninha na mesma ordem (destaque › negrito › itálico).
 *
 * ── Segurança ──────────────────────────────────────────────────────────────
 * O texto é escrito no painel e desenhado para TODO visitante. Aqui ele vira
 * ELEMENTOS React — nunca `dangerouslySetInnerHTML`, nunca HTML vindo do banco.
 * Só existe o que está listado acima; o resto sai como texto literal. Link só
 * com `https://` ou caminho interno (`safeHref`); senão vira texto sem `href`.
 */

export type RichAlign = "left" | "center" | "right";

const ALIGN_WORD: Record<RichAlign, string> = { left: "esquerda", center: "centro", right: "direita" };
const ALIGN_FROM_WORD: Record<string, RichAlign> = { esquerda: "left", centro: "center", direita: "right" };
const ALIGN_TOKEN = /^\{:(esquerda|centro|direita)\}/;
const ALIGN_CLASS: Record<RichAlign, string> = { left: "text-left", center: "text-center", right: "text-right" };

export type RichNode =
  | string
  | { kind: "b" | "i" | "hl"; children: RichNode[] }
  | { kind: "a"; href: string | null; text: string };

const BACKSLASH = "\\";

/** Caracteres que o editor escapa no texto comum (ver `escapeRich`). */
const ESCAPABLE = new Set(["*", "_", "=", "[", "]", "{", BACKSLASH]);

const MARKERS = { "**": "b", __: "i", "==": "hl" } as const;
type Marker = keyof typeof MARKERS;
const MARKER_LIST = Object.keys(MARKERS) as Marker[];

/** Classe Tailwind do alinhamento (para quem desenha o bloco inteiro, como o FAQ). */
export function alignClass(align: RichAlign | null): string | undefined {
  return align ? ALIGN_CLASS[align] : undefined;
}

/** Separa o alinhamento (prefixo) do texto. */
export function splitAlign(value: string): { align: RichAlign | null; text: string } {
  const match = ALIGN_TOKEN.exec(value);
  if (!match) return { align: null, text: value };
  return { align: ALIGN_FROM_WORD[match[1]], text: value.slice(match[0].length) };
}

/** Junta alinhamento + texto no formato guardado. Sem alinhamento = sem prefixo (o padrão do bloco). */
export function joinAlign(align: RichAlign | null, text: string): string {
  return align && text ? `{:${ALIGN_WORD[align]}}${text}` : text;
}

/** Escapa um trecho de texto COMUM, para ele não virar marcação. */
export function escapeRich(text: string): string {
  let out = "";
  for (const char of text) out += ESCAPABLE.has(char) ? BACKSLASH + char : char;
  return out;
}

/** Primeiro `marker` não escapado a partir de `from`. */
function closing(src: string, from: number, marker: Marker): number {
  for (let j = from; j < src.length - 1; j += 1) {
    if (src[j] === BACKSLASH) {
      j += 1;
      continue;
    }
    if (src.startsWith(marker, j)) return j;
  }
  return -1;
}

/** `[rótulo](destino)` a partir de `start`; o rótulo pode ter escapes. */
function readLink(src: string, start: number): { label: string; href: string; end: number } | null {
  let label = "";
  let j = start + 1;
  for (; j < src.length; j += 1) {
    const char = src[j];
    if (char === BACKSLASH && j + 1 < src.length) {
      label += src[j + 1];
      j += 1;
      continue;
    }
    if (char === "]" || char === "\n") break;
    label += char;
  }
  if (src[j] !== "]" || src[j + 1] !== "(" || !label) return null;
  const close = src.indexOf(")", j + 2);
  if (close === -1) return null;
  const href = src.slice(j + 2, close);
  if (!href || /\s/.test(href)) return null;
  return { label, href, end: close + 1 };
}

export function parseInline(src: string): RichNode[] {
  const out: RichNode[] = [];
  let buffer = "";
  const flush = () => {
    if (buffer) out.push(buffer);
    buffer = "";
  };

  let i = 0;
  scan: while (i < src.length) {
    const char = src[i];

    if (char === BACKSLASH && i + 1 < src.length && ESCAPABLE.has(src[i + 1])) {
      buffer += src[i + 1];
      i += 2;
      continue;
    }

    for (const marker of MARKER_LIST) {
      if (!src.startsWith(marker, i)) continue;
      const end = closing(src, i + 2, marker);
      if (end > i + 2) {
        flush();
        out.push({ kind: MARKERS[marker], children: parseInline(src.slice(i + 2, end)) });
        i = end + 2;
        continue scan;
      }
    }

    if (char === "[") {
      const link = readLink(src, i);
      if (link) {
        flush();
        out.push({ kind: "a", href: safeHref(link.href), text: link.label });
        i = link.end;
        continue;
      }
    }

    buffer += char;
    i += 1;
  }
  flush();
  return out;
}

/** O texto sem marcação — para `alt`, `aria-label`, `<title>`, contadores. */
export function richToPlain(value: string | null | undefined): string {
  if (!value) return "";
  const walk = (nodes: RichNode[]): string =>
    nodes.map((node) => (typeof node === "string" ? node : node.kind === "a" ? node.text : walk(node.children))).join("");
  return walk(parseInline(splitAlign(value).text));
}

const LINK_CLASS = "underline underline-offset-2 transition-colors hover:text-brand-orange";

/**
 * `inHighlight`: negrito/itálico DENTRO do destaque herdam o laranja — o
 * `text-white` do negrito (o "Muito prazer" branco do Figma, num parágrafo
 * cinza) cobriria a cor do destaque.
 */
function renderNodes(nodes: RichNode[], inHighlight = false): ReactNode[] {
  return nodes.map((node, index) => {
    if (typeof node === "string") return node;
    switch (node.kind) {
      case "b":
        return (
          <strong key={index} className={inHighlight ? "font-bold" : "font-bold text-white"}>
            {renderNodes(node.children, inHighlight)}
          </strong>
        );
      case "i":
        return (
          <em key={index} className="italic">
            {renderNodes(node.children, inHighlight)}
          </em>
        );
      case "hl":
        return (
          <span key={index} data-rich="hl" className="text-brand-orange">
            {renderNodes(node.children, true)}
          </span>
        );
      case "a":
        if (!node.href) return <span key={index}>{node.text}</span>;
        return node.href.startsWith("https://") ? (
          <a key={index} href={node.href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            {node.text}
          </a>
        ) : (
          <Link key={index} href={node.href} className={LINK_CLASS}>
            {node.text}
          </Link>
        );
    }
  });
}

/**
 * Desenha um campo formatado. Sem alinhamento escolhido é INLINE (herda o
 * bloco onde está — o desenho do Figma continua mandando); com alinhamento,
 * vira um bloco com o alinhamento pedido. Quebras de linha são `\n` de
 * verdade: quem desenha usa `whitespace-pre-line`, como já fazia.
 */
export function RichText({ value, className }: { value: string | null | undefined; className?: string }) {
  if (!value) return null;
  const { align, text } = splitAlign(value);
  const nodes = renderNodes(parseInline(text));
  if (!align) return className ? <span className={className}>{nodes}</span> : <>{nodes}</>;
  return (
    <span data-rich-align={align} className={cn("block", ALIGN_CLASS[align], className)}>
      {nodes}
    </span>
  );
}
