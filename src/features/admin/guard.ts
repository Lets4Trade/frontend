import { notFound } from "next/navigation";
import { getSessionRole } from "@/features/auth/session";
import { canAccess, type PanelArea } from "./permissions";

/**
 * Segunda porta de cada tela do painel: quem não tem a ÁREA (ver
 * `permissions.ts`) recebe 404, igual a quem não tem painel — nem a existência
 * da tela é confirmada.
 *
 * O layout deixa entrar todo cargo de painel (ADMIN, EDITOR, SUPPORT); esta é a
 * porta por tela. A autorização de verdade continua no `RolesGuard` do backend,
 * rota por rota — sem ela, nada aqui impediria uma chamada direta à API.
 */
export async function requirePanelArea(area: PanelArea): Promise<void> {
  if (!canAccess(await getSessionRole(), area)) notFound();
}
