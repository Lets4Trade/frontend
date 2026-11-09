/**
 * Regras puras do "Organizar ordem" (2026-11-09, pedido do usuário: "poucos
 * filtros — tem que ter categoria, subcategoria — e drag and drop de
 * multisseleção"). Fora do componente para serem testadas.
 *
 * ── Ordem com filtro ───────────────────────────────────────────────────────
 * A ordem salva é a da ABA inteira (o backend grava a lista completa). Com um
 * filtro ligado, mexer só nos produtos visíveis NÃO pode embaralhar os
 * escondidos: os visíveis trocam de lugar ENTRE AS POSIÇÕES QUE JÁ OCUPAVAM
 * (`applyVisibleOrder`), e cada escondido fica exatamente onde estava.
 */

/** O que o filtro precisa de cada produto (subconjunto de `OrderableProduct`). */
export type FilterableProduct = {
  id: string;
  name: string;
  serverId?: string | null;
  categoryId?: string | null;
  extraCategoryIds?: string[];
};

export type OrderCategory = { id: string; label: string; parentId?: string | null };

/** Valores especiais dos selects (o Radix não aceita opção com valor vazio). */
export const ALL = "all";
export const NONE = "none";

export type OrderFilters = {
  search: string;
  /** `ALL`, `NONE` (sem servidor) ou id do servidor. */
  server: string;
  /** `ALL`, `NONE` (sem categoria) ou id da categoria de 1º nível. */
  category: string;
  /** `ALL` ou id da subcategoria (filha de `category`). */
  subcategory: string;
};

export const EMPTY_FILTERS: OrderFilters = { search: "", server: ALL, category: ALL, subcategory: ALL };

export function hasFilters(filters: OrderFilters): boolean {
  return (
    filters.search.trim() !== "" || filters.server !== ALL || filters.category !== ALL || filters.subcategory !== ALL
  );
}

/** Minúsculas e sem acento: "Poção" acha "pocao". */
function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * O produto passa no filtro? Categoria olha a PRINCIPAL e as extras; escolher
 * só a categoria inclui as subcategorias dela; escolher a sub, só ela.
 */
export function matchesFilters(
  product: FilterableProduct,
  filters: OrderFilters,
  categories: readonly OrderCategory[],
): boolean {
  const term = fold(filters.search.trim());
  if (term && !fold(product.name).includes(term)) return false;

  if (filters.server === NONE ? product.serverId : filters.server !== ALL && product.serverId !== filters.server) {
    return false;
  }

  const own = [product.categoryId, ...(product.extraCategoryIds ?? [])].filter((id): id is string => Boolean(id));
  if (filters.category === NONE) return own.length === 0;
  if (filters.subcategory !== ALL) return own.includes(filters.subcategory);
  if (filters.category !== ALL) {
    const family = new Set([
      filters.category,
      ...categories.filter((category) => category.parentId === filters.category).map((category) => category.id),
    ]);
    return own.some((id) => family.has(id));
  }
  return true;
}

/**
 * A ordem completa com a NOVA ordem dos visíveis encaixada nas posições que
 * eles já ocupavam. `visibleAfter` tem que ser uma permutação de `visibleBefore`
 * (senão devolve `full` sem mexer — fail safe, nada some nem duplica).
 */
export function applyVisibleOrder(full: readonly string[], visibleBefore: readonly string[], visibleAfter: readonly string[]): string[] {
  if (visibleBefore.length !== visibleAfter.length) return [...full];
  const before = new Set(visibleBefore);
  if (visibleAfter.some((id) => !before.has(id)) || new Set(visibleAfter).size !== visibleAfter.length) return [...full];
  let cursor = 0;
  return full.map((id) => (before.has(id) ? visibleAfter[cursor++] : id));
}

/**
 * Move o BLOCO selecionado para junto de `overId`, mantendo a ordem relativa
 * dos selecionados. Arrastando para baixo, o bloco entra DEPOIS do alvo; para
 * cima, ANTES — o mesmo sentimento do arrasto de um card só. Soltar em cima de
 * um selecionado não muda nada.
 */
export function moveSelection(list: readonly string[], selected: ReadonlySet<string>, activeId: string, overId: string): string[] {
  if (selected.has(overId) || !list.includes(overId)) return [...list];
  const block = list.filter((id) => selected.has(id));
  if (block.length === 0) return [...list];
  const rest = list.filter((id) => !selected.has(id));
  const downward = list.indexOf(activeId) < list.indexOf(overId);
  const at = rest.indexOf(overId) + (downward ? 1 : 0);
  return [...rest.slice(0, at), ...block, ...rest.slice(at)];
}

/** Bloco selecionado para o começo (`"top"`) ou o fim (`"bottom"`) da lista. */
export function moveSelectionTo(list: readonly string[], selected: ReadonlySet<string>, where: "top" | "bottom"): string[] {
  const block = list.filter((id) => selected.has(id));
  const rest = list.filter((id) => !selected.has(id));
  return where === "top" ? [...block, ...rest] : [...rest, ...block];
}

/** Ids de `from` até `to` (inclusive), na ordem da lista — o Shift+clique. */
export function rangeBetween(list: readonly string[], from: string, to: string): string[] {
  const a = list.indexOf(from);
  const b = list.indexOf(to);
  if (a === -1 || b === -1) return [to];
  return list.slice(Math.min(a, b), Math.max(a, b) + 1);
}
