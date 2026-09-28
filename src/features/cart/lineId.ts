import type { Selection } from "@/features/pricing/quote";

/**
 * Identidade de uma linha do carrinho.
 *
 *   catálogo  `produto::servidor` — o mesmo produto em servidores diferentes
 *             são linhas diferentes; o mesmo produto/servidor SOMA.
 *   serviço   `produto::servidor::<hash da escolha>` — "nível 1 → 50" e
 *             "nível 10 → 90" do mesmo boosting são pedidos diferentes, e a
 *             mesma escolha duas vezes é a mesma linha (quantidade fixa em 1).
 *
 * O hash é de uma forma CANÔNICA da escolha: a ordem em que os adicionais
 * foram marcados não pode gerar duas linhas para o mesmo pedido.
 */
export function selectionKey(selection: Selection): string {
  const addons = [...new Set(selection.addonIds ?? [])].sort();
  return [
    `q=${selection.quantity ?? ""}`,
    `f=${selection.levelFrom ?? ""}`,
    `t=${selection.levelTo ?? ""}`,
    `a=${addons.join(",")}`,
  ].join("|");
}

/** FNV-1a 32 bits em hex. Só identidade de linha — não é segurança. */
export function hashString(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function cartLineId(productId: string, platform: string, selection?: Selection): string {
  const base = `${productId}::${platform}`;
  return selection ? `${base}::${hashString(selectionKey(selection))}` : base;
}
