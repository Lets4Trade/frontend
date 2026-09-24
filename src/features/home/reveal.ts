import type { CSSProperties } from "react";

/**
 * Marcação das ENTRADAS da home (2026-09-24). Quem toca é `HomeMotion`; quem
 * desenha o gesto é o bloco "ENTRADAS" do `globals.css`.
 *
 * Arquivo à parte, sem `"use client"`, porque quem marca são as SEÇÕES — que
 * continuam Server Components.
 *
 * Gestos (um por papel, não um fade genérico para tudo):
 * - `mask`  título que sobe de dentro de uma fenda
 * - `rise`  bloco que sobe e acende
 * - `wipe`  moldura que abre como cortina (o vídeo)
 * - `pop`   peça pequena que salta (estrelas, ladrilhos)
 * - `draw`  traço que se desenha do centro (divisores)
 * - `tilt`  card que cai no lugar, levemente girado (equipe)
 * - `fade`  moldura grande que só assenta (FAQ)
 */
export type RevealKind = "rise" | "mask" | "wipe" | "pop" | "draw" | "tilt" | "fade";

export function reveal(kind: RevealKind) {
  return { "data-reveal": kind } as const;
}

/**
 * Posição na cascata: cada índice atrasa 80 ms. Devolve só a variável, para
 * mesclar com o `style` que o elemento já tenha (posição absoluta etc.).
 */
export function revealDelay(index: number): CSSProperties {
  return { ["--reveal-i" as string]: index } as CSSProperties;
}
