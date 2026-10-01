import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BuilderShell } from "@/features/admin/builder/BuilderShell";
import { getBuilderGame } from "@/features/admin/builder/list";
import { stepById, visibleSteps } from "@/features/admin/builder/steps";
import { getGamePage } from "@/features/game/content";
import { GameAdminNav } from "@/features/admin/games/GameAdminNav";
import { getGameTabs } from "@/features/admin/games/tabs/list";
import { getSessionRole } from "@/features/auth/session";

export const metadata: Metadata = {
  title: "Builder de Páginas | Lets4Trade",
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
  searchParams,
}: {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ gameId }, query] = await Promise.all([params, searchParams]);
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
  // As abas do jogo (Jogos → Abas) só para a maquete — não são editadas aqui.
  // Em paralelo com a página publicada: são duas leituras independentes.
  const [published, tabs, role] = await Promise.all([
    getGamePage(game.slug),
    getGameTabs(game.id),
    // Memorizada por requisição: o layout do painel já a leu.
    getSessionRole(),
  ]);
  // O EDITOR abre o Builder, mas a Central e Produtos são só-ADMIN: a
  // navegação e os atalhos que dariam 404 somem para ele.
  const canManage = role === "ADMIN";

  // `?etapa=` (mapa da página na Central): só etapa que EDITA aqui e que o
  // cargo enxerga — atalho (`href`) ou valor inventado abre a pré-visualização.
  const wanted = stepById(String(Array.isArray(query.etapa) ? query.etapa[0] : (query.etapa ?? "")));
  const initialStep =
    wanted && !wanted.href && visibleSteps(canManage).some((step) => step.id === wanted.id) ? wanted.id : null;

  return (
    <BuilderShell
      game={game}
      tabs={tabs}
      canManage={canManage}
      initialStep={initialStep}
      nav={<GameAdminNav game={game} active={null} canManage={canManage} variant="bar" />}
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
