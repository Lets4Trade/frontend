/**
 * Montagem do corpo do `PUT /admin/game-page/:id` — funções PURAS.
 *
 * Fora do `actions.ts` porque arquivo `"use server"` só pode exportar função
 * assíncrona (cada export vira um endereço público de server action), e estas
 * precisam ser importáveis pelo teste sem mock de sessão nem de rede.
 */

import type { BuilderCategory } from "./types";

/** Categoria como a tela manda (contrato C da FASE 4): dois níveis. */
export type SavePageCategory = {
  id?: string;
  label: string;
  children?: { id?: string; label: string }[];
};

export type CleanCategory = { id?: string; label: string; children: { id?: string; label: string }[] };

/**
 * Linhas em branco são DESCARTADAS, não recusadas.
 *
 * A lista da tela ganha uma linha vazia a cada clique em "adicionar", e quem
 * clicou duas vezes e preencheu uma não cometeu um erro que mereça um formulário
 * recusado — só deixou uma linha sobrando.
 */
export function cleanList(items: { id?: string; label: string }[]) {
  return items
    // Linha que nem tem `label` de texto é lixo do cliente, não erro de quem
    // edita — descartada junto das vazias, em vez de derrubar a action no `.trim()`.
    .filter((item) => typeof item?.label === "string")
    .map((item) => ({
      id: cleanId(item.id),
      label: item.label.trim(),
    }))
    .filter((item) => item.label !== "");
}

/**
 * Categorias → corpo do `PUT`, com as subcategorias.
 *
 * Mesma regra do `cleanList` nos dois níveis (linha em branco é descartada), com
 * UMA recusa: categoria sem nome e com subcategoria preenchida. Descartá-la
 * levaria junto as filhas que alguém acabou de digitar, sem aviso — e inventar
 * um nome para o pai seria decidir por quem edita.
 *
 * O objeto é REMONTADO: das filhas saem só `id` e `label`, então um `children`
 * aninhado num terceiro nível (injetado na página) não viaja. `children` vai
 * sempre, mesmo vazio — a semântica do builder é lista COMPLETA, e "sem a
 * chave" poderia ser lido como "não mexer nas filhas".
 */
export function cleanCategories(
  items: unknown,
):
  | { ok: true; data: CleanCategory[] }
  | { ok: false; message: string } {
  if (!Array.isArray(items)) return { ok: false, message: "Dados da página inválidos." };

  const data: CleanCategory[] = [];
  for (const raw of items as SavePageCategory[]) {
    if (typeof raw?.label !== "string") continue;
    const children = cleanList(Array.isArray(raw.children) ? raw.children : []);
    const label = raw.label.trim();
    if (label === "") {
      if (children.length > 0) {
        return {
          ok: false,
          message: "Dê um nome à categoria antes de cadastrar subcategorias nela.",
        };
      }
      continue;
    }
    data.push({ id: cleanId(raw.id), label, children });
  }
  return { ok: true, data };
}

function cleanId(id: unknown) {
  return typeof id === "string" && id !== "" ? id : undefined;
}

/**
 * Rascunho → categorias do payload. Só `id` e `label` saem de cada nível: a
 * `key` é de renderização e o `slug` é decisão do servidor.
 */
export function draftCategoriesToPayload(categories: BuilderCategory[]): SavePageCategory[] {
  return categories.map((category) => ({
    id: category.id,
    label: category.label,
    children: category.children.map((child) => ({ id: child.id, label: child.label })),
  }));
}
