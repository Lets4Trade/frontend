import { safeHref } from "@/features/pages/blocks/markdown";
import { escapeRich, joinAlign, parseInline, type RichAlign, type RichNode } from "../richText";

/**
 * Editor VISUAL dos campos formatados (2026-10-01): a ponte entre o que a
 * pessoa vê formatado na tela (`contentEditable`) e o texto guardado
 * (`richText.tsx`).
 *
 * ── Allowlist na volta ─────────────────────────────────────────────────────
 * `domToRich` lê o DOM editado e só reconhece negrito, itálico, destaque, link
 * e quebra de linha. QUALQUER outra coisa (estilo, cor, tag que o navegador
 * tenha criado) vira texto simples — o que chega ao banco é sempre o formato
 * restrito, nunca HTML. A colagem já entra como texto puro (o `paste` é
 * interceptado no editor).
 */

type Mark = "hl" | "b" | "i";
/** Ordem FIXA de aninhamento: destaque por fora, itálico por dentro. */
const ORDER: Mark[] = ["hl", "b", "i"];
const OPEN: Record<Mark, string> = { hl: "==", b: "**", i: "__" };

type Marks = Record<Mark, boolean>;
type Piece = { kind: "text"; text: string; marks: Marks } | { kind: "link"; label: string; href: string; marks: Marks };

const NONE: Marks = { hl: false, b: false, i: false };

function boldState(el: HTMLElement, inherited: boolean): boolean {
  const weight = el.style.fontWeight;
  if (weight === "normal" || weight === "400") return false;
  if (el.tagName === "B" || el.tagName === "STRONG") return true;
  if (weight === "bold" || Number(weight) >= 600) return true;
  return inherited;
}

function italicState(el: HTMLElement, inherited: boolean): boolean {
  if (el.style.fontStyle === "normal") return false;
  if (el.tagName === "I" || el.tagName === "EM" || el.style.fontStyle === "italic") return true;
  return inherited;
}

const BLOCK_TAGS = new Set(["DIV", "P", "LI", "H1", "H2", "H3", "H4"]);

function collect(root: Node): Piece[] {
  const pieces: Piece[] = [];
  const visit = (node: Node, marks: Marks, first: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? "").replace(/ /g, " ");
      if (text) pieces.push({ kind: "text", text, marks });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    if (el.tagName === "BR") {
      pieces.push({ kind: "text", text: "\n", marks: NONE });
      return;
    }
    if (el.tagName === "A") {
      const href = safeHref(el.getAttribute("href") ?? "");
      const label = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      if (href && label) pieces.push({ kind: "link", label, href, marks });
      else if (label) pieces.push({ kind: "text", text: label, marks });
      return;
    }
    // Parágrafo desenhado (`<p>`, ex.: respostas do FAQ) = linha em branco;
    // outro bloco que o navegador criou (alguns Enter/colagens) = nova linha.
    if (BLOCK_TAGS.has(el.tagName) && !first) {
      pieces.push({ kind: "text", text: "\n", marks: NONE });
      if (el.tagName === "P") pieces.push({ kind: "text", text: "\n", marks: NONE });
    }
    const next: Marks = {
      hl: marks.hl || el.dataset.rich === "hl",
      b: boldState(el, marks.b),
      i: italicState(el, marks.i),
    };
    el.childNodes.forEach((child, index) => visit(child, next, index === 0));
  };
  root.childNodes.forEach((child, index) => visit(child, NONE, index === 0));
  return pieces;
}

/**
 * Serializa o conteúdo editado para o formato guardado.
 *
 * As marcas abrem e fecham como uma PILHA na ordem destaque › negrito ›
 * itálico: um trecho fica em `**…**` uma vez só, mesmo que o navegador o
 * tenha aninhado (`<b><b>x</b></b>`), e vizinhos com a mesma marca se fundem.
 * Quebras de linha fecham tudo (marca não atravessa linha) e reabrem depois.
 */
export function domToRich(root: Node): string {
  const pieces = collect(root);
  let out = "";
  const open: Mark[] = [];

  const closeFrom = (level: number) => {
    while (open.length > level) out += OPEN[open.pop() as Mark];
  };
  const target = (marks: Marks) => ORDER.filter((mark) => marks[mark]);

  for (const piece of pieces) {
    if (piece.kind === "text" && piece.text === "\n") {
      closeFrom(0);
      out += "\n";
      continue;
    }
    const want = target(piece.marks);
    let same = 0;
    while (same < open.length && same < want.length && open[same] === want[same]) same += 1;
    closeFrom(same);
    for (const mark of want.slice(same)) {
      out += OPEN[mark];
      open.push(mark);
    }
    out += piece.kind === "link" ? `[${escapeRich(piece.label)}](${piece.href})` : escapeRich(piece.text);
  }
  closeFrom(0);

  return (
    out
      // Marca vazia (abre e fecha sem nada) não significa nada.
      .replace(/(\*\*|__|==)\1/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .trim()
  );
}

/** Monta o valor final da edição: alinhamento + texto. */
export function finalValue(root: Node, align: RichAlign | null): string {
  return joinAlign(align, domToRich(root));
}

/**
 * Liga/desliga o destaque laranja na seleção.
 *
 * Seleção DENTRO de um destaque: ele é desfeito (o trecho todo). Senão, o
 * trecho selecionado ganha um `<span data-rich="hl">`. Só o cursor, sem
 * trecho: nada — destaque é de um trecho.
 */
export function toggleHighlight(editable: HTMLElement): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  if (!editable.contains(range.commonAncestorContainer)) return;

  const start = range.startContainer instanceof HTMLElement ? range.startContainer : range.startContainer.parentElement;
  const existing = start?.closest<HTMLElement>('[data-rich="hl"]');
  if (existing && editable.contains(existing)) {
    existing.replaceWith(...Array.from(existing.childNodes));
    editable.normalize();
    return;
  }
  if (range.collapsed) return;

  const span = document.createElement("span");
  span.dataset.rich = "hl";
  span.className = "text-brand-orange";
  span.appendChild(range.extractContents());
  range.insertNode(span);
  selection.removeAllRanges();
  const after = document.createRange();
  after.selectNodeContents(span);
  selection.addRange(after);
}

/**
 * O caminho inverso, para o campo de FORMULÁRIO (`RichTextField`): monta o
 * DOM editável a partir do valor guardado (sem o prefixo de alinhamento).
 *
 * Elemento por elemento, com o texto sempre em `textContent` — nunca
 * `innerHTML` com o valor: o que veio do banco não vira marcação HTML.
 */
export function fillRich(target: HTMLElement, text: string): void {
  const build = (nodes: RichNode[], parent: Node) => {
    for (const node of nodes) {
      if (typeof node === "string") {
        node.split("\n").forEach((line, index) => {
          if (index > 0) parent.appendChild(document.createElement("br"));
          if (line) parent.appendChild(document.createTextNode(line));
        });
        continue;
      }
      if (node.kind === "a") {
        if (!node.href) {
          parent.appendChild(document.createTextNode(node.text));
          continue;
        }
        const link = document.createElement("a");
        link.setAttribute("href", node.href);
        link.className = "underline";
        link.textContent = node.text;
        parent.appendChild(link);
        continue;
      }
      const el =
        node.kind === "b" ? document.createElement("strong") : node.kind === "i" ? document.createElement("em") : document.createElement("span");
      if (node.kind === "hl") {
        el.dataset.rich = "hl";
        el.className = "text-brand-orange";
      }
      if (node.kind === "b") el.className = "font-bold";
      build(node.children, el);
      parent.appendChild(el);
    }
  };
  target.replaceChildren();
  build(parseInline(text), target);
}
