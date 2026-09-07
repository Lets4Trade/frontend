import type { Metadata } from "next";
import { AdminFormCard } from "@/features/admin/AdminFormCard";
import { GameForm } from "@/features/admin/games/GameForm";

export const metadata: Metadata = {
  title: "Cadastro de jogo | Lets4Trade",
  robots: { index: false, follow: false },
};

/**
 * Painel → Produtos → "CADASTRO DE JOGO" (Figma 4468:1792).
 *
 * O cabeçalho, o rodapé e a guarda de ADMIN vivem em `app/admin/layout.tsx`; a
 * moldura do card, em `AdminFormCard`, compartilhada com o cadastro de produto.
 */
export default function NewGamePage() {
  return (
    <AdminFormCard title="CADASTRO DE JOGO" headingId="cadastro-jogo-heading">
      <GameForm />
    </AdminFormCard>
  );
}
