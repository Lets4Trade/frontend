import type { Pricing, PricingAddon } from "@/features/pricing/quote";

/**
 * Lógica PURA dos configuradores (serviço, quantidade/gold, pacote) — fora dos
 * componentes para ser testada sem DOM. Nada aqui calcula PREÇO: preço é só
 * `quote()`; aqui mora o que decide a ESCOLHA que vai para o `quote`.
 */

type QuantityPricing = Extract<Pricing, { mode: "QUANTITY" }>;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Prende um valor à regra: só min, min+step, min+2·step… ≤ max. O `quote`
 * RECUSA valor fora da regra (não corrige), então a tela nunca deixa a escolha
 * sair dela.
 */
export function snapQuantity(pricing: Pick<QuantityPricing, "min" | "max" | "step">, raw: number): number {
  const { min, max, step } = pricing;
  if (!Number.isFinite(raw)) return min;
  const bounded = clamp(raw, min, max);
  let snapped = min + Math.round((bounded - min) / step) * step;
  if (snapped > max) snapped -= step;
  return Math.max(snapped, min);
}

/**
 * As quantidades prontas que valem: dentro da regra, sem repetição, em ordem.
 * O `pricingSchema` já recusa preset fora da regra — o filtro aqui é a segunda
 * camada, para um botão nunca levar a um `quote` recusado.
 */
export function validPresets(pricing: QuantityPricing): number[] {
  const seen = new Set<number>();
  for (const preset of pricing.presets ?? []) {
    if (snapQuantity(pricing, preset) === preset) seen.add(preset);
  }
  return [...seen].sort((a, b) => a - b);
}

/** Quantidade inicial: a primeira pronta (o botão aceso do Figma) ou o mínimo. */
export function initialQuantity(pricing: QuantityPricing): number {
  return validPresets(pricing)[0] ?? pricing.min;
}

/** "5000" → "5.000" — separador de milhar pt-BR, como o resto dos números da loja. */
export function formatQuantity(value: number): string {
  return value.toLocaleString("pt-BR");
}

/** Acima disto a lista de adicionais ganha o campo "Pesquisar itens..." (Figma 1735:4247). */
export const ADDON_SEARCH_THRESHOLD = 6;

/** Tira acento e caixa: "Épico" casa com "epico". */
function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR");
}

/**
 * Filtro da busca de adicionais. Busca VAZIA mostra tudo; os ESCOLHIDOS
 * continuam na lista mesmo sem casar — esconder um adicional marcado deixaria a
 * pessoa pagando por algo que ela não vê na tela.
 */
export function filterAddons(
  addons: readonly PricingAddon[],
  search: string,
  selected: readonly string[] = [],
): PricingAddon[] {
  const needle = fold(search.trim());
  if (!needle) return [...addons];
  return addons.filter((addon) => selected.includes(addon.id) || fold(addon.label).includes(needle));
}
