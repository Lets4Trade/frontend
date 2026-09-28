import type { Block } from "./types";

/**
 * Bloco `productGrid` salvo ANTES da FASE 5 do contrato de abas (2026-09-28)
 * filtrava por `productType` ("MOEDAS"...). O tipo saiu do banco e a aba agora
 * é `tabSlug` — os slugs das abas migradas são exatamente o tipo em minúsculas.
 *
 * Espelho de `normalizeProductGridProps` do backend (`blocks.schema.ts`): o
 * backend já traduz na leitura, mas o front repete a regra na FRONTEIRA de
 * dados para que um JSON antigo (revisão, backend sem a tradução) continue
 * desenhando e editando — e o próximo save grave `tabSlug`, nunca `productType`.
 */
export function normalizeProductGridProps<T>(props: T): T {
  if (!props || typeof props !== "object" || Array.isArray(props)) return props;
  const record = props as Record<string, unknown>;
  if (!("productType" in record)) return props;
  const { productType, ...rest } = record;
  if (rest.tabSlug === undefined && typeof productType === "string" && productType) {
    rest.tabSlug = productType.toLowerCase();
  }
  return rest as T;
}

/** Aplica a tradução aos blocos `productGrid`; os outros passam intactos. */
export function normalizeBlocks(blocks: readonly Block[]): Block[] {
  return blocks.map((block) => {
    if (block?.type !== "productGrid") return block;
    const props = normalizeProductGridProps(block.props);
    return props === block.props ? block : { ...block, props };
  });
}
