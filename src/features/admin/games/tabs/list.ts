import { apiGet } from "@/lib/serverApi";
import { isValidId, type GameTab, type ScopedCategoryRow } from "./types";

/**
 * Leituras das abas por jogo, no SERVIDOR (contrato `game-tabs.md`).
 *
 * Separado de `types.ts` pelo motivo de sempre: este arquivo puxa o
 * `serverApi` (e o `next/headers` dele), e a tela é client component.
 */

/**
 * Todas as abas do jogo, inclusive as inativas, por posição.
 *
 * `null` = a leitura FALHOU (backend fora, endpoint ainda não publicado) — é
 * diferente de "o jogo não tem abas" (`[]`). Quem chama decide o aviso —
 * desde a FASE 5 não há "tipo" antigo para onde cair.
 */
export async function getGameTabs(gameId: string): Promise<GameTab[] | null> {
  if (!isValidId(gameId)) return null;
  const result = await apiGet<GameTab[]>(`/admin/games/${encodeURIComponent(gameId)}/tabs`);
  if (!result.ok || !Array.isArray(result.data)) return null;
  return [...result.data].sort((a, b) => a.position - b.position);
}

/**
 * A árvore de categorias de UM escopo: aba + servidor (`null` = "todos os
 * servidores"). `null` na resposta = leitura falhou.
 */
export async function getTabCategories(
  gameId: string,
  tabId: string,
  serverId: string | null,
): Promise<ScopedCategoryRow[] | null> {
  if (!isValidId(gameId) || !isValidId(tabId)) return null;
  if (serverId !== null && !isValidId(serverId)) return null;

  const search = new URLSearchParams({ serverId: serverId ?? "" });
  const result = await apiGet<ScopedCategoryRow[]>(
    `/admin/games/${encodeURIComponent(gameId)}/tabs/${encodeURIComponent(tabId)}/categories?${search.toString()}`,
  );
  if (!result.ok || !Array.isArray(result.data)) return null;
  return result.data;
}
