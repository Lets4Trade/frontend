/**
 * Categorias em árvore (FASE 4, contrato "C" de `.claude/context/page-builder.md`).
 *
 * Profundidade máxima 2: categoria → subcategoria. O backend promete as leituras
 * "com `parentId` (e `children` montado no builder/vitrine)", o que deixa duas
 * formas possíveis de chegar a mesma árvore:
 *
 *   - raízes com `children` já montado;
 *   - lista plana em que cada filha aponta para o pai por `parentId`.
 *
 * Este helper aceita as duas em vez de apostar numa só: a tela não quebra se o
 * backend mudar de uma para a outra, e uma resposta antiga (sem `parentId`
 * nenhum) continua virando uma lista de raízes sem filhas — que é exatamente o
 * que ela significava antes da árvore.
 *
 * Neto é DESCARTADO: a regra dos dois níveis é do backend, e a tela não tem onde
 * desenhar um terceiro.
 */
export type CategoryRow = {
  id?: string;
  parentId?: string | null;
  children?: CategoryRow[] | null;
};

export type CategoryNode<T> = T & { children: T[] };

export function toCategoryTree<T extends CategoryRow>(rows: readonly T[]): CategoryNode<T>[] {
  const ids = new Set(rows.map((row) => row.id).filter((id): id is string => !!id));

  // Filha cujo pai não veio na lista é tratada como raiz: esconder um item que
  // tem produto ligado seria pior do que mostrá-lo um nível acima.
  const roots = rows.filter((row) => !row.parentId || !ids.has(row.parentId));

  return roots.map((root) => {
    const nested = Array.isArray(root.children) ? (root.children as T[]) : [];
    const children =
      nested.length > 0 ? nested : rows.filter((row) => !!root.id && row.parentId === root.id);
    return { ...root, children: children.map(stripChildren) };
  });
}

/** A filha não carrega a lista dela adiante — é o corte do terceiro nível. */
function stripChildren<T extends CategoryRow>(row: T): T {
  if (!("children" in row)) return row;
  const copy = { ...row };
  delete copy.children;
  return copy;
}
