import { apiGet } from "@/lib/serverApi";

/**
 * Jogo como o formulário de PRODUTO precisa dele: com as plataformas, os tipos
 * e os servidores que o próprio jogo declarou.
 *
 * É o contrato de `GET /api/v1/admin/games`.
 */
export type AdminGame = {
  id: string;
  slug: string;
  name: string;
  /** Nomes do enum `GamePlatform` do backend. */
  platforms: string[];
  /** Nomes do enum `GameProductType` do backend. */
  productTypes: string[];
  servers: { id: string; label: string }[];
  /**
   * Categorias criadas no Builder de Páginas (etapa 7). Lista vazia é o normal
   * de um jogo que ainda não passou pelo builder — o select some nesse caso, em
   * vez de aparecer sem nenhuma opção.
   */
  categories: { id: string; label: string }[];
};

/**
 * Lista os jogos ativos para montar os selects do cadastro de produto.
 *
 * Lê no SERVIDOR, como todo o resto do painel: o token é cookie `httpOnly` e o
 * JS da página não o alcança.
 *
 * Falha vira lista VAZIA, e não exceção. A tela sabe tratar "nenhum jogo
 * cadastrado" — mostra o caminho para cadastrar um — e esse mesmo estado cobre
 * a queda do backend sem derrubar a página inteira. O que ela nunca faz é
 * inventar um jogo.
 */
export async function getAdminGames(): Promise<AdminGame[]> {
  const response = await apiGet<AdminGame[]>("/admin/games");
  return response.ok && Array.isArray(response.data) ? response.data : [];
}
