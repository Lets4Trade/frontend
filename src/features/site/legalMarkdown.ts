/**
 * Termos de Uso e Política de Privacidade (2026-11-18): o texto vem dos
 * arquivos que o usuário escreveu em `public/docs/` (Markdown simples). Este
 * módulo é a parte PURA: Markdown → blocos. Quem desenha é `LegalDocument`.
 *
 * ── Por que um leitor próprio, e tão pequeno ──────────────────────────────
 * Os documentos usam só: `#`, `##`, `###`, `---`, `- item`, parágrafo, quebra
 * de linha com dois espaços no fim e `**negrito**`. Um leitor de Markdown
 * completo geraria HTML para injetar (`dangerouslySetInnerHTML`) — que o
 * projeto não usa em lugar nenhum. Aqui o resultado são DADOS, que viram
 * elementos React (texto sempre escapado). Sintaxe fora da lista sai como
 * texto, sem quebrar nada.
 */

export type LegalInline = { text: string; bold?: boolean; href?: string };

export type LegalBlock =
  | { type: "title"; text: string }
  | { type: "heading"; level: 2 | 3; text: string; id: string }
  | { type: "paragraph"; lines: LegalInline[][] }
  | { type: "list"; items: LegalInline[][] }
  | { type: "rule" };

export function parseLegalMarkdown(source: string): LegalBlock[] {
  const lines = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  const blocks: LegalBlock[] = [];
  const ids = new Set<string>();
  let paragraph: string[] = [];
  let list: string[] = [];

  const flush = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: "paragraph", lines: paragraph.map(parseInline) });
      paragraph = [];
    }
    if (list.length > 0) {
      blocks.push({ type: "list", items: list.map(parseInline) });
      list = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (trimmed === "") {
      flush();
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flush();
      const text = stripBold(heading[2].trim());
      if (heading[1].length === 1) blocks.push({ type: "title", text });
      else blocks.push({ type: "heading", level: heading[1].length as 2 | 3, text, id: uniqueId(text, ids) });
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flush();
      blocks.push({ type: "rule" });
      continue;
    }
    const item = /^[-*]\s+(.+)$/.exec(trimmed);
    if (item) {
      if (paragraph.length > 0) flush();
      list.push(item[1]);
      continue;
    }
    if (list.length > 0) flush();
    // Quebra "dura" do Markdown (dois espaços no fim) e quebra simples viram,
    // as duas, nova linha no mesmo parágrafo — é o bloco de endereço e contato.
    paragraph.push(trimmed);
  }
  flush();
  return blocks;
}

/** `**negrito**`, e-mail e endereço https viram trechos; o resto é texto. */
export function parseInline(text: string): LegalInline[] {
  const parts: LegalInline[] = [];
  const pieces = text.split(/(\*\*[^*]+\*\*)/g).filter((piece) => piece !== "");
  for (const piece of pieces) {
    const bold = piece.startsWith("**") && piece.endsWith("**") && piece.length > 4;
    const body = bold ? piece.slice(2, -2) : piece;
    for (const chunk of linkify(body)) parts.push(bold ? { ...chunk, bold: true } : chunk);
  }
  return parts;
}

const LINK_RE = /(https:\/\/[^\s)]+[^\s).,;:]|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;

function linkify(text: string): LegalInline[] {
  const out: LegalInline[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK_RE)) {
    const start = match.index ?? 0;
    if (start > last) out.push({ text: text.slice(last, start) });
    const value = match[0];
    out.push({ text: value, href: value.startsWith("https://") ? value : `mailto:${value}` });
    last = start + value.length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

function stripBold(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1");
}

/** "1. IDENTIFICAÇÃO DA EMPRESA" → "1-identificacao-da-empresa" (âncora do índice). */
function uniqueId(text: string, used: Set<string>): string {
  const base =
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "secao";
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  used.add(id);
  return id;
}
