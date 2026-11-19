/**
 * Fundo da faixa dos contadores (2026-11-18, pedido do usuário: "essa div como
 * um banner que vai da esquerda da tela à direita, com fundo animado cheio da
 * logo do site, indo para a esquerda").
 *
 * ── Da borda à borda da TELA ──────────────────────────────────────────────
 * DESKTOP (`screen`): a moldura de 1920 da home corta o que passa dela, e numa
 * tela de 1920 (site a 80% = 2400 de área) a faixa parava 240px antes de cada
 * borda. Ela então se posiciona pela caixa da TELA da home (`app/page.tsx`):
 * `left/right: 0` dessa caixa, e o `top` fica o do próprio lugar no fluxo. Por
 * isso nada entre ela e essa caixa pode ser `relative` — o lugar dos números
 * é uma caixa à parte (`HomeNav`).
 *
 * CELULAR (`bleed`): não há moldura cortando; ela se estende muito para os
 * dois lados (`-2400px`) e o `overflow-x-clip` da página corta na tela.
 *
 * ── Movimento ─────────────────────────────────────────────────────────────
 * A arte (`logo-pattern.webp`, 322×132, logos em "tijolos", sem emenda) se
 * repete numa camada uma peça mais larga que a faixa, e essa camada anda UMA
 * peça para a esquerda em laço: só `transform`, que roda no compositor. Com
 * `prefers-reduced-motion`, fica parada. Ver `.logo-band-track` no CSS.
 *
 * Decorativo (`aria-hidden`): os números continuam texto por cima.
 */
export const LOGO_TILE = { width: 322, height: 132 } as const;

export function LogoBand({ mode = "bleed", className = "" }: { mode?: "screen" | "bleed"; className?: string }) {
  const place = mode === "screen" ? "right-0 left-0" : "inset-y-0 -right-[2400px] -left-[2400px]";
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute overflow-hidden border-y border-white/[0.06] bg-[#0c0c0c] ${place} ${className}`}
    >
      <div
        className="logo-band-track absolute inset-y-0 left-0 opacity-[0.13]"
        style={{
          right: -LOGO_TILE.width,
          backgroundImage: "url(/images/home/logo-pattern.webp)",
          backgroundSize: `${LOGO_TILE.width}px ${LOGO_TILE.height}px`,
          backgroundRepeat: "repeat",
          ["--logo-tile" as string]: `${LOGO_TILE.width}px`,
        }}
      />
    </div>
  );
}
