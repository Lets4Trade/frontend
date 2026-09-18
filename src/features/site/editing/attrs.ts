/**
 * Os atributos que tornam um pedaço da página editável no painel.
 *
 * Arquivo PURO e minúsculo de propósito: ele entra em componentes da LOJA, que
 * não podem carregar nada do editor. O que viaja para o navegador do cliente é
 * um atributo de texto; quem sabe editar é `/admin/paginas`.
 *
 * Três formas:
 *   `editField("home", "reviews", "title")`      → texto da própria sessão
 *   `editItem("home:reviews", id, "body")`       → texto de um item da lista
 *   `editItem("home:reviews", id, "image")`      → arte de um item da lista
 *   `editImage("home:video")`                    → arte da sessão
 */

export type EditAttrs = Record<string, string>;

/** Campo de texto da sessão (`title`, `subtitle`, `footnote`, `body`). */
export function editField(page: string, section: string, field: string): EditAttrs {
  return { "data-edit-field": `${page}:${section}:${field}` };
}

/** Arte da sessão — clicar abre o seletor de arquivo. */
export function editImage(page: string, section: string): EditAttrs {
  return { "data-edit-image": `${page}:${section}` };
}

/**
 * Campo de um item de lista. `field` é `title`, `body`, `href`, `image` ou
 * `secondaryImage` — os dois últimos abrem o seletor de arquivo.
 *
 * Sem id (item que ainda não existe no banco) devolve NADA: um atributo
 * apontando para um item inexistente viraria uma gravação que falha no clique.
 */
export function editItem(
  sectionKey: string,
  id: string | undefined,
  field: string,
): EditAttrs {
  if (!id) return {};
  return { "data-edit-item": `${sectionKey}|${id}|${field}` };
}

/**
 * "Clique aqui para ACRESCENTAR um item a esta lista."
 *
 * Existe para a lista VAZIA: sem nenhum item, não há elemento com
 * `data-edit-item` para clicar, e a barrinha de ações nunca apareceria — foi o
 * caso das artes do banner do hero, que começam sem lista nenhuma.
 */
export function editAdd(sectionKey: string, itemLabel: string): EditAttrs {
  return { "data-edit-add": `${sectionKey}|${itemLabel}` };
}
