import { backendAsset, publicApiGet } from "@/lib/publicApi";

/**
 * Os jogos do menu GAMES do cabeçalho (`GET /api/v1/games`).
 *
 * Mesmo raciocínio de `features/site/layoutContent.ts`: o cabeçalho renderiza
 * em TODA requisição do site, então a leitura é cacheada por uma hora — a
 * resposta é igual para todo visitante e não carrega preço. As escritas do
 * painel que mudam nome, arte ou a existência de um jogo derrubam
 * `GAMES_MENU_TAG` na hora; o TTL é só a rede de segurança.
 *
 * Fail soft: backend fora do ar vira lista vazia, e o menu mostra só o aviso.
 */

const REVALIDATE_SECONDS = 3600;

/** Etiqueta que o cadastro de jogo e o Builder derrubam. */
export const GAMES_MENU_TAG = "games-menu";

export type MenuGame = {
  slug: string;
  name: string;
  image: string | null;
};

type RawGame = { slug: string; name: string; imageUrl: string | null };

export async function getMenuGames(): Promise<MenuGame[]> {
  const data = await publicApiGet<RawGame[]>("/games", {
    revalidate: REVALIDATE_SECONDS,
    tags: [GAMES_MENU_TAG],
  });
  if (!Array.isArray(data)) return [];

  return data.map((game) => ({
    slug: game.slug,
    name: game.name,
    image: backendAsset(game.imageUrl),
  }));
}
