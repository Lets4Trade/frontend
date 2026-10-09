/**
 * A pílula de escolha da página de jogo (Figma 1471:1798): 197×50, ativa em
 * degradê laranja com texto preto, inativa em vidro com texto 80%.
 *
 * Uma definição só para os botões de servidor do catálogo e as pílulas do card
 * de serviço (1712:3968) — as duas telas desenham a mesma peça, e duas cópias
 * das classes divergiriam no primeiro ajuste.
 */
export function pillClassName(active: boolean, extra = "") {
  return `inline-flex h-[44px] min-w-[140px] items-center justify-center rounded-full px-[18px] font-poppins text-[14px] lg:h-[50px] lg:min-w-[197px] lg:px-6 lg:text-[16px] font-bold tracking-[0.16px] transition-opacity hover:opacity-90 outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg ${
    active
      ? "border border-[var(--brand-stroke-soft)] bg-[image:var(--brand-orange-gradient)] text-black"
      : "border border-brand-border bg-[image:var(--brand-surface-fill)] text-white/80"
  } ${extra}`.trim();
}
