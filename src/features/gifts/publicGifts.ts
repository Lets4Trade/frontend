import { publicApiGet } from "@/lib/publicApi";
import { parseGifts, type PublicGift } from "./cartGifts";

/**
 * Regras de brinde LIGADAS da loja (2026-10-12) — o cabeçalho (gaveta do
 * carrinho) e o checkout leem para mostrar o brinde.
 *
 *   GET /api/v1/gifts → [{ gameSlug, gameName, everyCents, amount, label, maxAmount? }]
 *
 * Leitura pública e igual para todos, cacheada como a tabela de níveis: uma
 * hora de `revalidate`, e a gravação do painel derruba `GIFTS_TAG` — a mudança
 * aparece na hora. Arquivo separado da leitura autenticada (regra da casa: o
 * `serverApi` puxa `next/headers`).
 *
 * Backend fora do ar: lista vazia, e a loja só não mostra brinde. O pedido não
 * depende disto — quem concede é o backend.
 */

const REVALIDATE_SECONDS = 3600;
export const GIFTS_TAG = "game-gifts";

export async function getPublicGifts(): Promise<PublicGift[]> {
  const data = await publicApiGet<unknown>("/gifts", {
    revalidate: REVALIDATE_SECONDS,
    tags: [GIFTS_TAG],
  });
  return parseGifts(data);
}
