import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Trava contra texto com RABO CORTADO (2026-11-03, pedido do usuário: "tá
 * cortando o rabo do g … pra isso não acontecer mais").
 *
 * Duas classes de texto cortam a letra que passa da própria caixa:
 *   - `line-clamp-N` (precisa de `overflow: hidden` para esconder as linhas a
 *     mais — e esconde junto o "g" da última);
 *   - texto em DEGRADÊ (`bg-clip-text` / `text-brand-gradient`): o degradê só
 *     é pintado dentro da caixa, a parte da letra fora dela fica transparente.
 * Com linha abaixo de 1,2× a fonte, o rabo do "g/p/y", a vírgula e o acento
 * maiúsculo da Poppins/Helvetica saem da caixa. Este teste lê as classes do
 * código e falha se alguém juntar uma das duas com linha baixa.
 *
 * `truncate` NÃO entra: ele corta só na horizontal desde 2026-11-03 (regra
 * global em `globals.css`). Para conferir na tela: `.claude/scripts/clip-audit.mjs`.
 */

const MIN_RATIO = 1.2;
const SRC = join(__dirname, "..");
const CUTS = /\b(line-clamp-\d|bg-clip-text|text-brand-gradient)\b/;

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return files(path);
    return /\.tsx$/.test(entry.name) && !/\.test\./.test(entry.name) ? [path] : [];
  });
}

/** Razão linha/fonte declarada na MESMA string de classes, por variante (`""`, `desk:`, `md:`…). */
export function tightLeadings(classes: string): string[] {
  const problems: string[] = [];
  const tokens = classes.split(/\s+/);
  const byVariant = new Map<string, { size?: number; leading?: string }>();
  for (const token of tokens) {
    const match = /^((?:[\w-]+:)*)(text-\[(\d+(?:\.\d+)?)px\]|leading-(none|tight|\[[^\]]+\]))$/.exec(token);
    if (!match) continue;
    const variant = match[1];
    const entry = byVariant.get(variant) ?? {};
    if (match[3]) entry.size = Number(match[3]);
    if (match[4]) entry.leading = match[4];
    byVariant.set(variant, entry);
  }
  const base = byVariant.get("") ?? {};
  for (const [variant, entry] of byVariant) {
    // `desk:line-clamp-none` desliga o corte nessa variante.
    if (variant && new RegExp(`(^|\\s)${variant.replace(/:/g, "\\:")}line-clamp-none(\\s|$)`).test(classes)) continue;
    const leading = entry.leading ?? base.leading;
    const size = entry.size ?? base.size;
    if (!leading) continue;
    let ratio: number | null = null;
    if (leading === "none") ratio = 1;
    else if (leading === "tight") ratio = 1.25;
    else {
      const px = /^\[(\d+(?:\.\d+)?)px\]$/.exec(leading);
      const unitless = /^\[(\d+(?:\.\d+)?)\]$/.exec(leading);
      if (px && size) ratio = Number(px[1]) / size;
      if (unitless) ratio = Number(unitless[1]);
    }
    if (ratio !== null && ratio < MIN_RATIO - 1e-9) {
      problems.push(`${variant || "(base)"} leading-${leading} em ${size ?? "?"}px = ${ratio.toFixed(2)}`);
    }
  }
  return problems;
}

describe("texto que corta a letra que passa da caixa", () => {
  it("line-clamp e degradê nunca com linha abaixo de 1,2× a fonte", () => {
    const offenders: string[] = [];
    for (const file of files(SRC)) {
      readFileSync(file, "utf8")
        .split(/\r?\n/)
        .forEach((line, index) => {
          for (const quoted of line.match(/(["'`])(?:(?!\1).)*\1/g) ?? []) {
            const classes = quoted.slice(1, -1);
            if (!CUTS.test(classes)) continue;
            for (const problem of tightLeadings(classes)) {
              offenders.push(`${relative(SRC, file).replace(/\\/g, "/")}:${index + 1} → ${problem}`);
            }
          }
        });
    }
    expect(offenders, `Aumente o leading (≥ ${MIN_RATIO}× a fonte):\n${offenders.join("\n")}`).toEqual([]);
  });

  it("a leitura das classes entende variante e unidade", () => {
    expect(tightLeadings("line-clamp-2 text-[12px] leading-none")).toHaveLength(1);
    expect(tightLeadings("line-clamp-2 text-[12px] leading-[1.2]")).toEqual([]);
    expect(tightLeadings("bg-clip-text text-[34px] leading-[40px]")).toHaveLength(1);
    expect(tightLeadings("bg-clip-text text-[34px] leading-[46px]")).toEqual([]);
    expect(tightLeadings("line-clamp-2 text-[12px] leading-[1.2] desk:line-clamp-none desk:leading-none")).toEqual([]);
  });
});
