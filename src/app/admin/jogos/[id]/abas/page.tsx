import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBuilderGame } from "@/features/admin/builder/list";
import { GameAdminNav } from "@/features/admin/games/GameAdminNav";
import { GameTabsEditor } from "@/features/admin/games/tabs/GameTabsEditor";
import { getGameTabs } from "@/features/admin/games/tabs/list";
import { requireAdminPage } from "@/features/admin/guard";
import { ADMIN_SHELL } from "@/features/admin/layout";

export const metadata: Metadata = {
  title: "Abas do jogo | Lets4Trade",
  robots: { index: false, follow: false },
};

/**
 * Painel → Jogos → Abas (contrato `game-tabs.md`, 2026-09-28, fora do Figma).
 *
 * Rota própria, e não seção do formulário de cadastro, porque as abas gravam a
 * cada gesto (ver `GameTabsEditor`) e o cadastro é um formulário com SALVAR.
 * Só ADMIN: aba é estrutura do catálogo.
 */
export default async function GameTabsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;

  const [game, tabs] = await Promise.all([getBuilderGame(id), getGameTabs(id)]);
  if (game === null) notFound();

  return (
    <div className={`${ADMIN_SHELL} pb-[120px]`}>
      <GameAdminNav gameId={game.id} gameName={game.name} active="abas" />
      <h1 className="mt-[30px] font-helvetica text-[30px] leading-none font-bold tracking-[0.3px] text-white">
        Abas — {game.name}
      </h1>

      <div className="mt-[30px]">
        {tabs === null ? (
          // Falha de leitura NÃO é "sem abas": mostrar o editor vazio convidaria
          // a recriar abas que já existem.
          <p role="alert" className="py-[60px] text-center font-helvetica text-[16px] text-brand-fg-muted">
            Não conseguimos carregar as abas deste jogo agora. Recarregue a página em instantes.
          </p>
        ) : (
          <GameTabsEditor gameId={game.id} gameSlug={game.slug} initialTabs={tabs} />
        )}
      </div>
    </div>
  );
}
