import { apiGet } from "@/lib/serverApi";
import { toAdminGift, type AdminGift } from "./types";

/**
 * `GET /admin/games/:id/gift`. `ok: false` = a leitura falhou (a tela avisa e
 * não oferece salvar por cima de algo que não conseguiu ler).
 */
export async function getAdminGift(gameId: string): Promise<{ ok: true; gift: AdminGift | null } | { ok: false }> {
  // `{ state, gift }`: o backend apaga campo nulo, então jogo sem brinde chega
  // só com `state: "NONE"`.
  const result = await apiGet<{ state?: string; gift?: unknown }>(`/admin/games/${encodeURIComponent(gameId)}/gift`);
  if (!result.ok) return { ok: false };
  return { ok: true, gift: toAdminGift(result.data.gift) };
}
