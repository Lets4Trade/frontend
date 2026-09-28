import { publicApiGet } from "@/lib/publicApi";
import { normalizeBlocks } from "./legacy";
import type { PublishedPage } from "./types";

/**
 * A página PUBLICADA, como a loja a desenha. `null` quando nunca foi publicada
 * — ou quando o backend não respondeu: nos dois casos a home cai no desenho
 * padrão, que é melhor que uma página vazia.
 *
 * Sem cache (padrão do `publicApiGet`): os blocos de produto trazem PREÇO, e
 * preço velho é o único erro que a loja não pode cometer. Mesma decisão da
 * vitrine de jogo.
 */
export async function getPublishedPage(slug: string): Promise<PublishedPage | null> {
  const page = await publicApiGet<PublishedPage>(`/pages/${encodeURIComponent(slug)}`);
  if (!page || !Array.isArray(page.blocks)) return null;
  return {
    ...page,
    blocks: normalizeBlocks(page.blocks),
    refs: { games: page.refs?.games ?? {}, products: page.refs?.products ?? {} },
  };
}
