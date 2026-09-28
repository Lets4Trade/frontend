import { notFound } from "next/navigation";
import { getSessionRole } from "@/features/auth/session";

/**
 * Telas do painel que o EDITOR NÃO vê (pedidos, produtos, usuários, logs,
 * chats, cadastro de jogo): 404, igual a quem não tem painel — nem a existência
 * da tela é confirmada.
 *
 * O layout do painel deixa ADMIN e EDITOR entrarem; esta é a segunda porta, por
 * tela. A autorização de verdade continua no `RolesGuard` do backend, rota por
 * rota — sem ela, nada aqui impediria uma chamada direta à API.
 */
export async function requireAdminPage(): Promise<void> {
  if ((await getSessionRole()) !== "ADMIN") notFound();
}
