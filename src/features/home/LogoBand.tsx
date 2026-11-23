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
import { getLayoutContent } from "@/features/site/layoutContent";

/**
 * Desde 2026-11-22 (pedido do usuário) a faixa usa a LOGO DO SITE enviada no
 * painel (a mesma do cabeçalho, `marca`), em vez da imagem fixa
 * `logo-pattern.webp`; e saíram o fundo e as bordas — sobram só as logos
 * correndo, em CINZA (`grayscale`, pedido do usuário no mesmo dia).
 *
 * O desenho é um `<pattern>` de SVG em linha: a imagem entra por `<image>`
 * (que, diferente de um SVG usado como `background`, carrega URL de fora) e
 * o padrão se repete sozinho. Fileiras desencontradas como o arquivo: logo a
 * cada 161px, a segunda fileira deslocada meio passo. O período da animação é
 * o passo (161), então o laço não dá salto.
 */
export const LOGO_TILE = { width: 161, height: 132 } as const;
const LOGO_BOX = { width: 104, height: 54 };
const DEFAULT_LOGO = "/images/lets4trade-logo.png";

export async function LogoBand({ mode = "bleed", className = "" }: { mode?: "screen" | "bleed"; className?: string }) {
  const layout = await getLayoutContent();
  const uploaded = layout.text("marca").imageUrl;
  const logo = uploaded ?? DEFAULT_LOGO;
  // A logo padrão é um quadrado com respiro (o cabeçalho a corta com
  // `object-cover`); a enviada pelo painel entra INTEIRA, como no cabeçalho.
  const fit = uploaded ? "xMidYMid meet" : "xMidYMid slice";
  const place = mode === "screen" ? "right-0 left-0" : "inset-y-0 -right-[2400px] -left-[2400px]";
  const x = (LOGO_TILE.width - LOGO_BOX.width) / 2;
  const half = LOGO_TILE.width / 2;
  // Id POR MODO: a home desenha a versão do celular (`bleed`) E a do
  // computador (`screen`), uma escondida por CSS; com o mesmo id, `url(#id)`
  // pegava o padrão da escondida e no computador as logos sumiam.
  const patternId = `logo-band-${mode}`;
  const rowTwo = LOGO_TILE.height / 2 + 6;

  return (
    <div aria-hidden className={`pointer-events-none absolute overflow-hidden ${place} ${className}`}>
      <svg
        className="logo-band-track absolute inset-y-0 left-0 h-full opacity-[0.13] grayscale"
        style={{ width: `calc(100% + ${LOGO_TILE.width}px)`, ["--logo-tile" as string]: `${LOGO_TILE.width}px` }}
      >
        <defs>
          <pattern id={patternId} width={LOGO_TILE.width} height={LOGO_TILE.height} patternUnits="userSpaceOnUse">
            <image href={logo} x={x} y={6} width={LOGO_BOX.width} height={LOGO_BOX.height} preserveAspectRatio={fit} />
            {/* Segunda fileira, meio passo à frente (e a cópia que fecha a borda). */}
            <image href={logo} x={x + half} y={rowTwo} width={LOGO_BOX.width} height={LOGO_BOX.height} preserveAspectRatio={fit} />
            <image href={logo} x={x - half} y={rowTwo} width={LOGO_BOX.width} height={LOGO_BOX.height} preserveAspectRatio={fit} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
}
