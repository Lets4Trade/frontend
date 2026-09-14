import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BuilderShell } from "@/features/admin/builder/BuilderShell";
import { getBuilderGame } from "@/features/admin/builder/list";
import { getGamePage } from "@/features/game/content";

export const metadata: Metadata = {
  title: "Builder de Páginas — Lets4Trade",
  // O painel inteiro é `noindex`: são telas atrás de sessão, e o que elas
  // revelam no título já é informação interna.
  robots: { index: false, follow: false },
};

/**
 * "Builder de Páginas" (Figma 3883:2153) — personaliza a página de um jogo.
 *
 * A guarda de rota é do `app/admin/layout.tsx` (sem sessão vai para o login,
 * sessão sem ADMIN recebe 404) e quem autoriza de verdade é o `RolesGuard` do
 * backend, rota por rota. Aqui só resta o 404 de jogo inexistente.
 *
 * Server component fino de propósito: ele BUSCA e entrega. Quem edita é o
 * `BuilderShell`, que precisa ser client porque o rascunho vive na tela até o
 * botão de publicar.
 */
export default async function BuilderPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const game = await getBuilderGame(gameId);
  if (!game) notFound();

  /**
   * A página PUBLICADA, só para a maquete.
   *
   * A pré-visualização desenha o rascunho no que está sendo editado (arte,
   * título, abas, servidores, categorias, descrição, ordem) — mas referências,
   * notícias, FAQ e a moeda de fidelidade NÃO são editáveis por aqui: vêm da
   * tela "Edição de sessões" e do conteúdo editorial, iguais para todo jogo.
   *
   * Buscá-las aqui e passar adiante é o que faz a maquete mostrar os blocos DE
   * VERDADE em vez de retângulos rotulados. Sem isso a pessoa vê uma página que
   * não é a dela, e a única coisa que um preview não pode ser é diferente.
   */
  const published = await getGamePage(game.slug);

  return (
    <BuilderShell
      game={game}
      shared={
        published
          ? {
              references: published.references,
              news: published.news,
              faq: published.faq,
              coin: published.identity.coin,
            }
          : null
      }
    />
  );
}
