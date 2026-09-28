import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminFormCard } from "@/features/admin/AdminFormCard";
import { getBuilderGame } from "@/features/admin/builder/list";
import { GameEditForm } from "@/features/admin/games/GameEditForm";
import { requireAdminPage } from "@/features/admin/guard";

export const metadata: Metadata = {
  title: "Editar jogo | Lets4Trade",
  robots: { index: false, follow: false },
};

/**
 * Painel → Jogos → lápis (2026-09-28, fora do Figma). Edita o CADASTRO do
 * jogo; a página dele na loja é do Builder. Ver `GameEditForm`.
 */
export default async function EditGamePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;

  // Jogo inexistente, desativado ou leitura que falhou: 404, como no produto.
  const game = await getBuilderGame(id);
  if (game === null) notFound();

  return (
    <AdminFormCard title="EDITAR JOGO" headingId="editar-jogo-heading">
      <GameEditForm game={game} />
    </AdminFormCard>
  );
}
