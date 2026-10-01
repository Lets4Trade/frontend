"use server";

import { getAdminGames } from "@/features/admin/catalog";
import { canEditContent, getSessionRole } from "@/features/auth/session";

/**
 * Jogos para a busca do painel — lidos só quando a busca abre pela primeira
 * vez (o layout do painel não paga uma ida ao backend por tela para isto).
 *
 * Só id e nome saem daqui. A conferência de cargo é conveniência: quem
 * autoriza `/admin/games` é o `RolesGuard` do backend.
 */
export async function adminSearchGamesAction(): Promise<{ id: string; name: string }[]> {
  if (!canEditContent(await getSessionRole())) return [];
  const games = await getAdminGames();
  return games.map(({ id, name }) => ({ id, name }));
}
