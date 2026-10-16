import { redirect } from "next/navigation";
import { legacyCentralHref } from "@/features/admin/games/central";
import { requirePanelArea } from "@/features/admin/guard";

/**
 * `/admin/jogos/[id]/categorias` virou uma seção da Central do jogo
 * (admin-games-ux.md, Etapa 2). A rota fica só para links salvos e favoritos
 * continuarem abrindo. A guarda vem antes: para o EDITOR, 404 aqui também —
 * redirecionar confirmaria que a tela existe.
 */
export default async function LegacyGameRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePanelArea("catalog");
  const { id } = await params;
  redirect(legacyCentralHref(id, "categorias", await searchParams));
}
