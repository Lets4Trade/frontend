import { notFound, redirect } from "next/navigation";
import { isPanelRole, panelHome } from "@/features/admin/permissions";
import { getSessionRole } from "@/features/auth/session";

/**
 * `/admin` → a primeira tela do cargo (2026-10-16): pedidos para o ADMIN,
 * páginas para o EDITOR, chats para o ATENDENTE. Antes não existia (404).
 */
export default async function AdminHomePage() {
  const role = await getSessionRole();
  if (!isPanelRole(role)) notFound();
  redirect(panelHome(role));
}
