/**
 * Botões de formatação do `MarkdownTextArea` — funções PURAS sobre o texto e a
 * seleção, para o teste não precisar de DOM.
 *
 * Escrevem a sintaxe do Markdown RESTRITO da loja (`pages/blocks/markdown.tsx`):
 * `**negrito**`, `*itálico*`, `[texto](https://…)`, `- lista` e `1. lista`.
 * Nada além disso é desenhado, então o botão nunca gera algo que a loja ignore.
 */
export type MarkdownFormat = "bold" | "italic" | "link" | "ul" | "ol";

export type Edit = { value: string; selectionStart: number; selectionEnd: number };

const PLACEHOLDER: Record<"bold" | "italic" | "link", string> = {
  bold: "negrito",
  italic: "itálico",
  link: "texto do link",
};

/**
 * Aplica o formato à seleção `[start, end)`. Sem seleção, insere um texto de
 * exemplo já selecionado, para quem clicou só digitar por cima.
 */
export function applyFormat(
  value: string,
  start: number,
  end: number,
  format: MarkdownFormat,
  href = "",
): Edit {
  if (format === "ul" || format === "ol") return prefixLines(value, start, end, format);

  const selected = value.slice(start, end);
  // Negrito e itálico não atravessam linha na loja: com várias linhas, cada
  // uma é marcada sozinha, com o marcador de lista do lado de FORA.
  if ((format === "bold" || format === "italic") && selected.includes("\n")) {
    const mark = format === "bold" ? "**" : "*";
    const block = selected
      .split("\n")
      .map((line) => {
        const [, prefix, body, trail] = /^(\s*(?:[-*]\s+|\d{1,3}[.)]\s+)?)(.*?)(\s*)$/.exec(line)!;
        return body ? `${prefix}${mark}${body}${mark}${trail}` : line;
      })
      .join("\n");
    return {
      value: value.slice(0, start) + block + value.slice(end),
      selectionStart: start,
      selectionEnd: start + block.length,
    };
  }

  // Espaço nas pontas fica FORA da marcação: `** negrito**` não vira negrito.
  const lead = selected.length - selected.trimStart().length;
  const trail = selected.length - selected.trimEnd().length;
  const inner = selected.trim() || PLACEHOLDER[format];
  const [open, close] =
    format === "bold" ? ["**", "**"] : format === "italic" ? ["*", "*"] : ["[", `](${href})`];

  const before = value.slice(0, start) + selected.slice(0, lead) + open;
  const after = close + selected.slice(selected.length - trail) + value.slice(end);
  return {
    value: before + inner + after,
    selectionStart: before.length,
    selectionEnd: before.length + inner.length,
  };
}

/** Lista: estende a seleção às linhas inteiras e numera/marca cada uma. */
function prefixLines(value: string, start: number, end: number, format: "ul" | "ol"): Edit {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const nextBreak = value.indexOf("\n", end);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;

  const lines = value.slice(lineStart, lineEnd).split("\n");
  const block = lines
    .map((line, index) => `${format === "ul" ? "-" : `${index + 1}.`} ${line.replace(/^\s*(?:[-*]|\d{1,3}[.)])\s+/, "")}`)
    .join("\n");

  return {
    value: value.slice(0, lineStart) + block + value.slice(lineEnd),
    selectionStart: lineStart,
    selectionEnd: lineStart + block.length,
  };
}
