import { apiGet } from "@/lib/serverApi";
import { toAdminServerGifts, type AdminServerGift } from "./types";

/**
 * Os servidores do jogo com o brinde de cada um (POR SERVIDOR desde
 * 2026-11-23). `ok: false` = a leitura falhou — a tela avisa e não oferece
 * salvar por cima de uma regra que não conseguiu ler.
 */
export async function getAdminGifts(
  gameId: string,
): Promise<{ ok: true; servers: AdminServerGift[] } | { ok: false }> {
  // `{ count, servers }`: o backend apaga lista vazia, então jogo sem servidor
  // chega só com `count: 0`.
  const result = await apiGet<{ count?: number; servers?: unknown }>(`/admin/games/${encodeURIComponent(gameId)}/gift`);
  if (!result.ok) return { ok: false };
  return { ok: true, servers: toAdminServerGifts(result.data.servers) };
}
