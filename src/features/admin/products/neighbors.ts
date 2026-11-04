import { getProductOrdering } from "./ordering";
import { getAdminProducts } from "./list";
import { buildHref, parseProductsQuery } from "./catalog";
import { editProductHref, safeReturnPath } from "./links";
import { isValidId } from "@/features/admin/games/tabs/types";
import { CENTRAL_PARAM } from "@/features/admin/games/central";

/**
 * "Anterior / Próximo" na edição de produto (2026-11-04, pedido do usuário:
 * "uma seta para passar ao próximo produto, para não precisar voltar e
 * procurar de novo a lista que eu estava seguindo").
 *
 * A LISTA é a de onde a pessoa veio, que já viaja no `?volta=` (conferido por
 * `safeReturnPath`): a listagem de produtos com os mesmos filtros, ordem e
 * página, ou a aba da Central do jogo (na ordem da loja, no servidor
 * escolhido). Outro `volta` (ou nenhum) = sem setas.
 *
 * Custo: uma leitura da página atual da lista, e mais uma só quando o produto
 * é o primeiro/último da página (o vizinho mora na página ao lado). As duas
 * pontas em paralelo.
 */

export type ProductNeighbor = { id: string; name: string; href: string };

export type ProductNeighbors = {
  prev: ProductNeighbor | null;
  next: ProductNeighbor | null;
  /** 1-based, na lista inteira (não só na página). */
  position: number;
  total: number;
};

const BASE = "http://painel.invalid";

export async function getProductNeighbors(
  productId: string,
  returnTo: string | null,
  gameIds: readonly string[],
): Promise<ProductNeighbors | null> {
  const back = safeReturnPath(returnTo);
  if (!back) return null;
  const url = new URL(back, BASE);
  if (url.pathname === "/admin/produtos") return fromProductList(productId, url, gameIds);
  const central = /^\/admin\/jogos\/([A-Za-z0-9_-]{1,100})$/.exec(url.pathname);
  if (central) return fromCentral(productId, central[1], url, back);
  return null;
}

/** Listagem `/admin/produtos?…` — mesmos filtros, ordem e paginação da tela. */
async function fromProductList(
  productId: string,
  url: URL,
  gameIds: readonly string[],
): Promise<ProductNeighbors | null> {
  const query = parseProductsQuery(Object.fromEntries(url.searchParams), gameIds);
  const page = await getAdminProducts(query);
  const index = page.items.findIndex((item) => item.id === productId);
  // Saiu da lista (outro admin mudou o filtro dele, a página andou…): sem setas,
  // em vez de setas que levam a lugar errado.
  if (index === -1) return null;

  const hereHref = buildHref(query, { page: page.page });
  const pageHref = (n: number) => buildHref(query, { page: n });
  const link = (item: { id: string; name: string }, listHref: string): ProductNeighbor => ({
    id: item.id,
    name: item.name,
    href: editProductHref(item.id, listHref),
  });

  const needPrev = index === 0 && page.page > 1;
  const needNext = index === page.items.length - 1 && page.page < page.pageCount;
  const [prevPage, nextPage] = await Promise.all([
    needPrev ? getAdminProducts({ ...query, page: page.page - 1 }) : null,
    needNext ? getAdminProducts({ ...query, page: page.page + 1 }) : null,
  ]);

  const prevItem = index > 0 ? page.items[index - 1] : prevPage?.items.at(-1);
  const nextItem = index < page.items.length - 1 ? page.items[index + 1] : nextPage?.items[0];

  return {
    prev: prevItem ? link(prevItem, index > 0 ? hereHref : pageHref(page.page - 1)) : null,
    next: nextItem ? link(nextItem, index < page.items.length - 1 ? hereHref : pageHref(page.page + 1)) : null,
    position: (page.page - 1) * page.limit + index + 1,
    total: page.total,
  };
}

/** Central do jogo (`?secao=abas&aba=…&servidor=…`): a aba na ordem da loja. */
async function fromCentral(
  productId: string,
  gameId: string,
  url: URL,
  back: string,
): Promise<ProductNeighbors | null> {
  const tabId = url.searchParams.get(CENTRAL_PARAM.tab) ?? "";
  const serverId = url.searchParams.get(CENTRAL_PARAM.server) ?? "";
  if (!isValidId(tabId)) return null;

  const ordering = await getProductOrdering(gameId, tabId);
  if (!ordering.ok) return null;
  const items = isValidId(serverId) ? ordering.items.filter((item) => item.serverId === serverId) : ordering.items;
  const index = items.findIndex((item) => item.id === productId);
  if (index === -1) return null;

  const link = (item: { id: string; name: string }): ProductNeighbor => ({
    id: item.id,
    name: item.name,
    href: editProductHref(item.id, back),
  });
  return {
    prev: index > 0 ? link(items[index - 1]) : null,
    next: index < items.length - 1 ? link(items[index + 1]) : null,
    position: index + 1,
    total: items.length,
  };
}
