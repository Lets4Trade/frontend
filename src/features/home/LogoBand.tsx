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
 * ── Fileiras inteiras (2026-11-23, pedido do usuário) ─────────────────────
 * Antes era UM padrão de 161×132 cobrindo a faixa: na de 170px a terceira
 * fileira saía cortada embaixo, e no celular (98px) a segunda saía pela metade
 * — "mal dá pra ver". Agora cada fileira é a sua tira de SVG, da altura da
 * logo, e as tiras se distribuem na altura da faixa (`justify-evenly`): nenhuma
 * logo fica cortada, qualquer que seja a altura (no celular ela vem do texto).
 * Logos menores: 3 fileiras no computador, 2 no celular. Fileiras pares
 * deslocadas meio passo, como os tijolos do arquivo. O período da animação é o
 * passo, então o laço não dá salto.
 */
const BAND = {
  // Computador: medidas da moldura (o site está a 80%; na tela, ~64×33).
  screen: { rows: 3, logo: { width: 80, height: 41 }, step: 124, opacity: "opacity-[0.13]" },
  // Celular: um pouco mais forte — a faixa é estreita e as logos são poucas.
  bleed: { rows: 2, logo: { width: 64, height: 33 }, step: 100, opacity: "opacity-[0.17]" },
} as const;
const DEFAULT_LOGO = "/images/lets4trade-logo.png";

export async function LogoBand({ mode = "bleed", className = "" }: { mode?: "screen" | "bleed"; className?: string }) {
  const layout = await getLayoutContent();
  const uploaded = layout.text("marca").imageUrl;
  const logo = uploaded ?? DEFAULT_LOGO;
  // A logo padrão é um quadrado com respiro (o cabeçalho a corta com
  // `object-cover`); a enviada pelo painel entra INTEIRA, como no cabeçalho.
  const fit = uploaded ? "xMidYMid meet" : "xMidYMid slice";
  const place = mode === "screen" ? "right-0 left-0" : "inset-y-0 -right-[2400px] -left-[2400px]";
  const { rows, logo: box, step, opacity } = BAND[mode];
  const x = (step - box.width) / 2;

  return (
    <div aria-hidden className={`pointer-events-none absolute overflow-hidden ${place} ${className}`}>
      <div
        className={`logo-band-track absolute inset-y-0 left-0 flex flex-col justify-evenly grayscale ${opacity}`}
        style={{ width: `calc(100% + ${step}px)`, ["--logo-tile" as string]: `${step}px` }}
      >
        {Array.from({ length: rows }, (_, row) => {
          // Id POR MODO e fileira: a home desenha a versão do celular (`bleed`)
          // E a do computador (`screen`), uma escondida por CSS; com o mesmo
          // id, `url(#id)` pegava o padrão da escondida e as logos sumiam.
          const id = `logo-band-${mode}-${row}`;
          const shift = row % 2 === 1 ? step / 2 : 0;
          return (
            <svg key={row} width="100%" height={box.height} className="block shrink-0">
              <defs>
                <pattern id={id} width={step} height={box.height} patternUnits="userSpaceOnUse">
                  <image href={logo} x={x + shift} width={box.width} height={box.height} preserveAspectRatio={fit} />
                  {/* Cópia que fecha a borda na fileira deslocada. */}
                  {shift ? (
                    <image href={logo} x={x - shift} width={box.width} height={box.height} preserveAspectRatio={fit} />
                  ) : null}
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#${id})`} />
            </svg>
          );
        })}
      </div>
    </div>
  );
}
