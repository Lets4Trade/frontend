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

/**
 * Subtítulo (`### `) nas linhas da seleção. Clicar de novo numa linha que já é
 * subtítulo tira a marcação — o botão liga e desliga, como o negrito.
 */
export function toggleHeading(value: string, start: number, end: number): Edit {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const nextBreak = value.indexOf("\n", end);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;

  const lines = value.slice(lineStart, lineEnd).split("\n");
  const allHeadings = lines.every((line) => /^#{2,3}\s+/.test(line) || line.trim() === "");
  const block = lines
    .map((line) => {
      if (line.trim() === "") return line;
      const plain = line.replace(/^#{2,3}\s+/, "").replace(/^\s*(?:[-*]|\d{1,3}[.)])\s+/, "");
      return allHeadings ? plain : `### ${plain || "Subtítulo"}`;
    })
    .join("\n");

  return {
    value: value.slice(0, lineStart) + block + value.slice(lineEnd),
    selectionStart: lineStart,
    selectionEnd: lineStart + block.length,
  };
}

/**
 * Imagem enviada pelo painel, numa linha SÓ dela (é assim que a loja a
 * reconhece): no fim da linha do cursor, com linha em branco antes e depois
 * para não grudar num parágrafo ou numa lista.
 */
export function insertImage(value: string, position: number, url: string, alt = "imagem"): Edit {
  const nextBreak = value.indexOf("\n", position);
  const at = nextBreak === -1 ? value.length : nextBreak;
  const before = value.slice(0, at);
  const after = value.slice(at);
  const syntax = `![${alt}](${url})`;
  const lead = before === "" ? "" : before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const trail = after === "" ? "\n" : after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
  const inserted = lead + syntax + trail;
  // O cursor vai para DEPOIS da imagem (linha seguinte): quem continua
  // digitando escreve o próximo parágrafo, não grudado no link da imagem.
  const caret = before.length + inserted.length;
  return {
    value: before + inserted + after,
    selectionStart: caret,
    selectionEnd: caret,
  };
}

const NOT_IMGUR = "Cole o link de uma imagem do Imgur, como https://i.imgur.com/abc1234.png.";
const IMGUR_ALBUM =
  "Esse link é de um álbum ou post. Abra a imagem, clique nela com o botão direito e escolha “Copiar endereço da imagem”.";

/**
 * Link do Imgur colado pelo admin → link DIRETO da imagem
 * (`https://i.imgur.com/<id>.<ext>`), o único formato que a loja desenha
 * (`IMGUR_IMAGE` em `game/sectionContent.ts`).
 *
 * Aceita o link direto e a página de uma imagem (`imgur.com/<id>`, que vira
 * `.png` — o Imgur entrega a imagem pelo id com qualquer extensão). `.gifv` vira
 * `.gif`. Álbum/post (`/a/`, `/gallery/`) não tem como virar imagem sem a API
 * deles, então o erro ensina a copiar o endereço da imagem.
 */
export function imgurImageUrl(input: string): { url: string } | { error: string } {
  const text = input.trim();
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return { error: NOT_IMGUR };
  }
  if (!/^(?:www\.|m\.|i\.)?imgur\.com$/i.test(url.hostname)) return { error: NOT_IMGUR };
  const path = url.pathname.replace(/\/+$/, "");
  if (/^\/(?:a|gallery|t|r|user)\//i.test(path)) return { error: IMGUR_ALBUM };
  const match = /^\/([A-Za-z0-9]{5,10})(?:\.(png|jpe?g|gifv?|webp))?$/i.exec(path);
  if (!match) return { error: NOT_IMGUR };
  const ext = (match[2] ?? "png").toLowerCase().replace("gifv", "gif");
  return { url: `https://i.imgur.com/${match[1]}.${ext}` };
}
