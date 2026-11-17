/**
 * Zoom de CSS em vigor num elemento (2026-11-17: o site roda a 80% no
 * computador, ver `--site-zoom` em `globals.css`).
 *
 * O navegador entrega `getBoundingClientRect`, `clientX/Y` e a rolagem na
 * escala da TELA, mas `left`/`top`/`width` escritos num elemento são
 * multiplicados pelo zoom dele. Quem lê uma posição da tela e a escreve em px
 * precisa DIVIDIR pelo zoom — senão a peça cai em 80% do lugar (um menu no
 * canto direito abriria centenas de px à esquerda).
 *
 * `currentCSSZoom` é o zoom EFETIVO do elemento (produto dos ancestrais,
 * inclusive os `.fit-*` da home e da página do jogo). Sem suporte, cai no
 * zoom do <html>; fora do navegador, 1.
 */
export function cssZoom(element?: Element | null): number {
  if (typeof window === "undefined") return 1;
  const target = element ?? document.documentElement;
  const current = (target as Element & { currentCSSZoom?: number }).currentCSSZoom;
  if (typeof current === "number" && current > 0) return current;
  const root = parseFloat(getComputedStyle(target.ownerDocument.documentElement).zoom);
  return root > 0 ? root : 1;
}
