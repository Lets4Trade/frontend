import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseInline, parseLegalMarkdown } from "./legalMarkdown";

describe("parseLegalMarkdown (Termos e Política, 2026-11-18)", () => {
  it("título, subtítulos, lista, linha, parágrafo com quebra e negrito", () => {
    const blocks = parseLegalMarkdown(
      [
        "# TERMOS DE USO",
        "## LETS 4 TRADE LTDA",
        "",
        "**Razão social:** LETS 4 TRADE LTDA  ",
        "**CNPJ:** 50.109.140/0001-70",
        "",
        "---",
        "",
        "## 1. IDENTIFICAÇÃO DA EMPRESA",
        "### 2.1. Dados",
        "Podemos coletar:",
        "",
        "- Nome completo;",
        "- E-mail;",
      ].join("\r\n"),
    );
    expect(blocks.map((block) => block.type)).toEqual([
      "title",
      "heading",
      "paragraph",
      "rule",
      "heading",
      "heading",
      "paragraph",
      "list",
    ]);
    expect(blocks[4]).toMatchObject({ level: 2, text: "1. IDENTIFICAÇÃO DA EMPRESA", id: "1-identificacao-da-empresa" });
    expect(blocks[5]).toMatchObject({ level: 3, id: "2-1-dados" });
    expect(blocks[2]).toEqual({
      type: "paragraph",
      lines: [
        [{ text: "Razão social:", bold: true }, { text: " LETS 4 TRADE LTDA" }],
        [{ text: "CNPJ:", bold: true }, { text: " 50.109.140/0001-70" }],
      ],
    });
    expect(blocks[7]).toMatchObject({ type: "list", items: [[{ text: "Nome completo;" }], [{ text: "E-mail;" }]] });
  });

  it("e-mail e https viram link; HTML continua texto", () => {
    expect(parseInline("Fale em suporte@lets4trade.com.br ou https://www.lets4trade.com.br.")).toEqual([
      { text: "Fale em " },
      { text: "suporte@lets4trade.com.br", href: "mailto:suporte@lets4trade.com.br" },
      { text: " ou " },
      { text: "https://www.lets4trade.com.br", href: "https://www.lets4trade.com.br" },
      { text: "." },
    ]);
    expect(parseInline('<script>alert(1)</script> javascript:alert(1)')).toEqual([
      { text: '<script>alert(1)</script> javascript:alert(1)' },
    ]);
  });

  it("os dois arquivos de verdade: um título só e seções numeradas sem repetir", () => {
    for (const [file, sections] of [
      ["Termo de Uso.txt", 21],
      ["Politica de Privacidade.txt", 18],
    ] as const) {
      const blocks = parseLegalMarkdown(readFileSync(join(process.cwd(), "public", "docs", file), "utf8"));
      expect(blocks.filter((block) => block.type === "title")).toHaveLength(1);
      const numbered = blocks.filter((block) => block.type === "heading" && block.level === 2 && /^\d/.test(block.text));
      expect(numbered).toHaveLength(sections);
    }
  });
});
