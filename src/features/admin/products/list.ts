import { apiGet } from "@/lib/serverApi";
import type { AdminProduct, AdminProductPage, ProductsQuery } from "./catalog";

/**
 * Leitura da listagem de produtos no SERVIDOR.
 *
 * Só o que toca a rede vive aqui; tipos, query e helpers puros ficam em
 * `catalog.ts`, para o card (client component) poder importá-los sem arrastar
 * o `next/headers` para o navegador.
 */

/** Página vazia — o que devolvemos quando a leitura falha. */
const EMPTY_PAGE: AdminProductPage = {
  items: [],
  total: 0,
  page: 1,
  limit: 24,
  pageCount: 1,
};

/**
 * Busca a página de produtos no backend.
 *
 * Falha vira página VAZIA em vez de exceção, como `getAdminGames()`. A tela
 * sabe desenhar "nenhum produto", e esse estado cobre a queda do backend sem
 * derrubar a página inteira.
 */
export async function getAdminProducts(
  query: ProductsQuery,
): Promise<AdminProductPage> {
  const search = new URLSearchParams();
  if (query.game) search.set("gameId", query.game);
  if (query.type) search.set("type", query.type);
  if (query.search) search.set("search", query.search);
  search.set("sort", query.sort);
  search.set("page", String(query.page));

  const response = await apiGet<AdminProductPage>(
    `/admin/products?${search.toString()}`,
  );
  return response.ok && Array.isArray(response.data?.items)
    ? response.data
    : EMPTY_PAGE;
}

/** Um produto, para preencher o formulário de edição. */
export async function getAdminProduct(
  id: string,
): Promise<AdminProduct | null> {
  const response = await apiGet<AdminProduct>(`/admin/products/${id}`);
  return response.ok ? response.data : null;
}
