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

/**
 * Quantidade ABREVIADA (2026-10-06, pedido do usuário): "1.000" → "1K",
 * "1.000.000" → "1Mi", "2.500.000.000" → "2,5Bi", "1.000.000.000.000" →
 * "1Tri". Até duas casas, vírgula pt-BR, sem zeros à direita. Abaixo de mil
 * fica o número como está.
 *
 * Só para EXIBIR (botões, faixa e resumo): o campo de digitar continua com o
 * número inteiro, que é o que a pessoa edita.
 */
const UNITS: readonly [number, string][] = [
  [1e12, "Tri"],
  [1e9, "Bi"],
  [1e6, "Mi"],
  [1e3, "K"],
];

export function formatQuantity(value: number): string {
  const abs = Math.abs(value);
  for (const [size, suffix] of UNITS) {
    if (abs >= size) {
      const scaled = Math.floor((value / size) * 100) / 100;
      return `${scaled.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}${suffix}`;
    }
  }
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

/**
 * Marcar/desmarcar um serviço ou subserviço respeitando os limites da regra
 * (2026-11-09). A mesma conferência que o `quote` faz na cobrança, aplicada ANTES
 * no clique para o cliente nunca montar uma escolha que seria recusada.
 *
 * Serviço COM subserviços é uma caixinha que ABRE a "pasta" (pedido do usuário,
 * 2026-11-09: "tem que ficar como checkbox; se ativa a checkbox abre a pasta"):
 * marcar o serviço mostra os subserviços embaixo; desmarcar fecha e tira os
 * subserviços escolhidos. Subserviço só com o serviço marcado.
 *  - no limite: com máximo 1 o clique TROCA (como um botão de opção); acima de
 *    1, o clique é ignorado (a tela mostra os outros apagados).
 */
export function toggleAddon(
  pricing: Pick<Pricing, "addons" | "maxAddons">,
  selected: readonly string[],
  id: string,
): string[] {
  const addons = pricing.addons ?? [];
  const parent = addons.find((addon) => addon.id === id);
  const on = selected.includes(id);

  /** Abre espaço para mais um serviço no 1º nível; `null` = não cabe. */
  const roomForParent = (current: readonly string[]): string[] | null => {
    const chosenParents = addons.filter((addon) => current.includes(addon.id));
    if (!pricing.maxAddons || chosenParents.length < pricing.maxAddons) return [...current];
    if (pricing.maxAddons !== 1) return null;
    const drop = new Set(chosenParents.flatMap((addon) => [addon.id, ...(addon.children ?? []).map((child) => child.id)]));
    return current.filter((item) => !drop.has(item));
  };

  if (parent) {
    const childIds = (parent.children ?? []).map((child) => child.id);
    // Desmarcar fecha a "pasta" e leva os subserviços junto.
    if (on) return selected.filter((item) => item !== id && !childIds.includes(item));
    const room = roomForParent(selected);
    return room ? [...room, id] : [...selected];
  }

  const owner = addons.find((addon) => (addon.children ?? []).some((child) => child.id === id));
  if (!owner) return [...selected];
  const siblings = (owner.children ?? []).map((child) => child.id).filter((item) => selected.includes(item));

  if (on) return selected.filter((item) => item !== id);
  // Subserviço só aparece (e só vale) com o serviço marcado.
  if (!selected.includes(owner.id)) return [...selected];

  let base: string[] = [...selected];
  if (owner.maxChildren && siblings.length >= owner.maxChildren) {
    if (owner.maxChildren !== 1) return [...selected];
    base = base.filter((item) => !siblings.includes(item));
  }
  return [...base, id];
}

/** Lista no limite (e com máximo acima de 1): os não marcados ficam apagados. */
export function atLimit(chosen: number, max: number | undefined): boolean {
  return Boolean(max && max > 1 && chosen >= max);
}
