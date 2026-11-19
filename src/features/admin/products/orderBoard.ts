/**
 * Regras puras do "Organizar ordem" (2026-11-09, pedido do usuário: "poucos
 * filtros — tem que ter categoria, subcategoria — e drag and drop de
 * multisseleção"). Fora do componente para serem testadas.
 *
 * ── Ordem com filtro ───────────────────────────────────────────────────────
 * Desde 2026-11-18 cada CATEGORIA/SUBCATEGORIA tem a sua própria ordem
 * (`orderScope`/`categoryOrder`): escolher uma no filtro troca a LISTA que se
 * organiza, e a lista da aba inteira (sem categoria) não muda.
 * Busca e servidor só recortam a lista escolhida: mexer nos visíveis NÃO pode
 * embaralhar os escondidos — os visíveis trocam de lugar ENTRE AS POSIÇÕES QUE
 * JÁ OCUPAVAM (`applyVisibleOrder`), e cada escondido fica onde estava.
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
 * Qual LISTA o quadro está organizando (2026-11-18, pedido do usuário: mexer em
 * "Chaves" mudava a lista sem filtro). Subcategoria escolhida = a ordem dela;
 * categoria escolhida = a dela; sem categoria (ou "Sem categoria") = a da aba
 * inteira (`null`). Busca e servidor só recortam a lista escolhida.
 */
export function orderScope(filters: Pick<OrderFilters, "category" | "subcategory">): string | null {
  if (filters.subcategory !== ALL) return filters.subcategory;
  if (filters.category !== ALL && filters.category !== NONE) return filters.category;
  return null;
}

/** Os filtros de busca e servidor, sem o de categoria (que vira a lista). */
export function cutFilters(filters: OrderFilters): OrderFilters {
  return { ...filters, category: ALL, subcategory: ALL };
}

/**
 * A lista de uma categoria: os produtos dela (principal ou extra; categoria de
 * 1º nível inclui as filhas) — primeiro os que já têm posição gravada NELA, na
 * ordem gravada; depois o resto, na ordem da aba (`tabOrder`). Espelha o
 * `sortByCategoryPosition` do backend, que é o que a vitrine mostra.
 */
export function categoryOrder(
  tabOrder: readonly string[],
  categoryId: string,
  savedForCategory: readonly string[] | undefined,
  products: ReadonlyMap<string, FilterableProduct>,
  categories: readonly OrderCategory[],
): string[] {
  const isSub = categories.some((category) => category.id === categoryId && category.parentId);
  const filters: OrderFilters = isSub
    ? { ...EMPTY_FILTERS, subcategory: categoryId }
    : { ...EMPTY_FILTERS, category: categoryId };
  const members = tabOrder.filter((id) => {
    const product = products.get(id);
    return product ? matchesFilters(product, filters, categories) : false;
  });
  const memberSet = new Set(members);
  const placed = (savedForCategory ?? []).filter((id) => memberSet.has(id));
  const placedSet = new Set(placed);
  return [...placed, ...members.filter((id) => !placedSet.has(id))];
}

/** Duas listas iguais, na mesma ordem. */
export function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
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
