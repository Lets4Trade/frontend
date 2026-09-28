import { apiGet } from "@/lib/serverApi";

/**
 * Jogo como o formulário de PRODUTO precisa dele: com as plataformas e os
 * servidores que o próprio jogo declarou (as abas vêm de `games/tabs/list.ts`).
 *
 * É o contrato de `GET /api/v1/admin/games`.
 */
export type AdminGame = {
  id: string;
  slug: string;
  name: string;
  /** Nomes do enum `GamePlatform` do backend. */
  platforms: string[];
  servers: { id: string; label: string }[];
  /**
   * Categorias criadas no Builder de Páginas (etapa 7). Lista vazia é o normal
   * de um jogo que ainda não passou pelo builder — o select some nesse caso, em
   * vez de aparecer sem nenhuma opção.
   */
  categories: {
    id: string;
    label: string;
    /**
     * Pai da subcategoria (contrato C da FASE 4); `null`/ausente no primeiro
     * nível. Lista PLANA — quem monta "Categoria › Subcategoria" para o select é
     * `categorySelectOptions` (`products/categoryOptions.ts`).
     */
    parentId?: string | null;
    /**
     * Escopo da categoria (abas por jogo, 2026-09-28): `null`/ausente = vale
     * para todos os servidores / todas as abas. O cadastro de produto filtra por
     * aqui. Se o backend não mandar os campos, tudo conta como global — o
     * select mostra a mais, e o backend recusa a combinação errada no save.
     */
    serverId?: string | null;
    tabId?: string | null;
  }[];
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
