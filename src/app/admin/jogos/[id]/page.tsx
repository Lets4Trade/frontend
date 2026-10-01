import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBuilderGame } from "@/features/admin/builder/list";
import { parseCentralQuery } from "@/features/admin/games/central";
import { OverviewSection, StorePageSection, TabsSection } from "@/features/admin/games/CentralSections";
import { GameAdminNav } from "@/features/admin/games/GameAdminNav";
import { getGameTabs } from "@/features/admin/games/tabs/list";
import { isValidId } from "@/features/admin/games/tabs/types";
import { requireAdminPage } from "@/features/admin/guard";
import { ADMIN_SHELL } from "@/features/admin/layout";

export const metadata: Metadata = {
  title: "Jogo | Lets4Trade",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Central do jogo (admin-games-ux.md, Etapa 2, 2026-09-30, fora do Figma) — a
 * "casa" de um jogo no painel: navegação fixa à esquerda (≥ 1024px; pílulas no
 * topo abaixo disso) e três seções por `?secao=`:
 *   - `visao-geral`: o cadastro (nome, link, imagem, servidores);
 *   - `abas` (padrão): mestre-detalhe das abas, com produtos e categorias;
 *   - `pagina`: atalhos para o Builder, o Construtor e a loja.
 *
 * Substitui `/editar`, `/abas` e `/categorias` (hoje redirecionamentos). Só
 * ADMIN: aba, produto e categoria são estrutura do catálogo — o EDITOR recebe
 * 404, como nas outras telas só-ADMIN.
 */
export default async function GameCentralPage({ params, searchParams }: PageProps) {
  await requireAdminPage();
  const [{ id }, raw] = await Promise.all([params, searchParams]);
  if (!isValidId(id)) notFound();
  const query = parseCentralQuery(raw);

  // Jogo e abas em paralelo (as abas só na seção que as desenha). Jogo
  // inexistente, desativado ou leitura que falhou: 404, como no produto.
  const [game, tabs] = await Promise.all([
    getBuilderGame(id),
    query.section === "abas" ? getGameTabs(id) : Promise.resolve(null),
  ]);
  if (game === null) notFound();

  return (
    <div className={`${ADMIN_SHELL} pb-[120px]`}>
      {/* Cabeçalho "clean" (2026-10-01): voltar, nome, ver na loja e as seções
          como abas logo abaixo — antes eram uma coluna à esquerda, que somada à
          coluna de abas deixava três colunas na tela. */}
      <header className="flex flex-col gap-[16px]">
        <div className="min-w-0">
          <Link
            href="/admin/jogos"
            className="font-poppins text-[13px] font-bold text-brand-orange transition-opacity hover:opacity-80"
          >
            ← Jogos
          </Link>
          <div className="mt-[4px] flex flex-wrap items-baseline gap-x-[14px]">
            <h1 className="truncate font-helvetica text-[28px] leading-tight font-bold text-white">{game.name}</h1>
            <a
              href={`/games/${encodeURIComponent(game.slug)}`}
              target="_blank"
              rel="noopener"
              className="font-poppins text-[13px] text-white/60 transition-colors hover:text-white"
            >
              Ver na loja ↗
            </a>
          </div>
        </div>
        <GameAdminNav game={game} active={query.section} variant="bar" showExtras={false} />
      </header>

      <div className="mt-[28px]">
        <div className="min-w-0">
          {query.section === "visao-geral" ? (
            <OverviewSection game={game} />
          ) : query.section === "pagina" ? (
            <StorePageSection game={game} />
          ) : (
            <section aria-labelledby="abas-titulo">
              {/* O título visível já é a própria navegação; este é para leitor
                  de tela navegar por títulos (h1 → h2 → h3). */}
              <h2 id="abas-titulo" className="sr-only">
                Abas e produtos
              </h2>
              <TabsSection game={game} tabs={tabs} query={query} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
