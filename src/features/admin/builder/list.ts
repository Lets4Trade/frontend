import { backendAsset } from "@/lib/publicApi";
import { apiGet } from "@/lib/serverApi";
import type { BuilderGame, BuilderGameSummary } from "./types";

/**
 * Leitura do builder, a partir do SERVIDOR.
 *
 * Separado de `types.ts` pelo mesmo motivo que a listagem de produtos separou
 * `catalog.ts` de `list.ts`: este arquivo importa o `serverApi`, que puxa
 * `next/headers` — arrastá-lo para um módulo que o navegador importa quebra o
 * build. Os componentes de tela importam os TIPOS, nunca isto.
 */

type RawSummary = {
  id: string;
  slug: string;
  name: string;
  imageUrl?: string | null;
  _count?: { products?: number };
};

/** Os jogos que o builder pode editar. Lista vazia em qualquer imprevisto. */
export async function getBuilderGames(): Promise<BuilderGameSummary[]> {
  const result = await apiGet<RawSummary[]>("/admin/game-page");
  if (!result.ok || !Array.isArray(result.data)) return [];

  return result.data.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    imageUrl: row.imageUrl,
    // O backend apaga campo nulo da resposta, então um jogo sem produto vem
    // sem `_count.products` em vez de com zero. Falsy, nunca `=== null`.
    productCount: row._count?.products ?? 0,
  }));
}

/**
 * O estado atual da página de um jogo. `null` faz a rota devolver 404.
 *
 * As ARTES são convertidas para URL absoluta AQUI, na fronteira de dados — o
 * backend guarda `/uploads/games/x.webp`, que servido pelo Next cairia em
 * `localhost:3000` e daria 404. É a mesma conversão que a vitrine faz em
 * `content.ts`, e no mesmo lugar: fazê-la no componente significaria lembrar
 * dela em cada um que desenha uma imagem — e foi esquecê-la que deixou a logo
 * quebrada na primeira versão desta tela.
 */
export async function getBuilderGame(gameId: string): Promise<BuilderGame | null> {
  const result = await apiGet<BuilderGame>(
    `/admin/game-page/${encodeURIComponent(gameId)}`,
  );
  if (!result.ok) return null;

  const game = result.data;
  return {
    ...game,
    imageUrl: backendAsset(game.imageUrl),
    banners: game.banners.map((banner) => ({
      ...banner,
      // `?? banner.imageUrl` nunca acontece na prática (a coluna é obrigatória
      // no banco), mas manter o tipo `string` evita um opcional que se
      // propagaria por toda a tela para um caso que não existe.
      imageUrl: backendAsset(banner.imageUrl) ?? banner.imageUrl,
    })),
  };
}
