import { redirect } from "next/navigation";
import { legacyCentralHref } from "@/features/admin/games/central";
import { requireAdminPage } from "@/features/admin/guard";

/**
 * `/admin/jogos/[id]/abas` virou uma seção da Central do jogo
 * (admin-games-ux.md, Etapa 2). A rota fica só para links salvos e favoritos
 * continuarem abrindo. A guarda vem antes: para o EDITOR, 404 aqui também —
 * redirecionar confirmaria que a tela existe.
 */
export default async function LegacyGameRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  redirect(legacyCentralHref(id, "abas"));
}
