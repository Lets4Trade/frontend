import { toCategoryTree } from "@/features/game/categoryTree";

/**
 * Categorias de um jogo → opções do select do cadastro de produto.
 *
 * Achatadas na ordem da árvore: cada categoria seguida das suas subcategorias,
 * rotuladas "Categoria › Subcategoria". O Radix Select não tem recuo nem grupo
 * clicável, e só o nome da filha ("Rara", "Comum") é ambíguo quando dois pais
 * têm filhas com o mesmo nome — o caminho completo resolve as duas coisas.
 *
 * Produto pode apontar para o pai OU para a filha (contrato C da FASE 4), então
 * as duas viram opção.
 */
export function categorySelectOptions(
  categories: readonly { id: string; label: string; parentId?: string | null }[],
): { value: string; label: string }[] {
  return toCategoryTree(categories).flatMap((root) => [
    { value: root.id, label: root.label },
    ...root.children.map((child) => ({
      value: child.id,
      label: `${root.label} › ${child.label}`,
    })),
  ]);
}
