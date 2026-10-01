import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminGames } from "@/features/admin/catalog";
import { getGameTabs } from "@/features/admin/games/tabs/list";
import { getAdminPage } from "@/features/pages/adminPage";
import { ContentPageEditor } from "@/features/pages/editor/ContentPageEditor";
import { PageBuilder } from "@/features/pages/editor/PageBuilder";
import { hubGroups } from "@/features/pages/hub";
import { PagesHub } from "@/features/pages/PagesHub";
import { builderPage } from "@/features/pages/registry";
import { getSectionsAdmin } from "@/features/site/list";

export const metadata: Metadata = {
  title: "Páginas | Lets4Trade",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * "Páginas" — o construtor (fases 1–4, 2026-09-25). Fora do Figma: o arquivo
 * não desenha uma tela de montar páginas.
 *
 * Sem `?pagina=` (2026-10-01): a lista de cartões (`PagesHub`) — antes abria
 * direto na Home e o resto ficava escondido num select.
 *
 * `?pagina=` escolhe a página: home, venda, fidelidade, `jogo-<id>` (uma por
 * jogo ativo) — montadas por blocos — e as de conteúdo (cabeçalho, rodapé,
 * conteúdo comum dos jogos, termos). `?secao=` abre uma sessão de conteúdo já
 * selecionada. O slug antigo `layout` vai para `cabecalho`. Desconhecido é 404.
 *
 * A guarda é do `app/admin/layout.tsx` (ADMIN e EDITOR); quem autoriza de
 * verdade é o `RolesGuard` do backend em cada rota.
 */
export default async function AdminPagesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const slug = typeof params.pagina === "string" ? params.pagina : null;
  if (slug === "layout") redirect("/admin/paginas?pagina=cabecalho");

  // A lista não lê nada do backend: só links.
  if (slug === null) return <PagesHub groups={hubGroups()} />;

  const [games, sectionsSnapshot] = await Promise.all([getAdminGames(), getSectionsAdmin()]);
  const page = builderPage(slug, games);
  if (!page) notFound();

  const gameOptions = games.map(({ id, name, slug: gameSlug }) => ({ id, name, slug: gameSlug }));

  if (page.kind === "content") {
    return (
      <ContentPageEditor
        page={page}
        key={page.slug}
        sections={sectionsSnapshot.sections.filter((section) => section.key.startsWith(`${page.catalogPage}:`))}
        games={gameOptions}
        initialSection={typeof params.secao === "string" ? params.secao : undefined}
      />
    );
  }

  const initial = await getAdminPage(page);
  if (!initial) {
    return (
      <div className="px-[24px] pt-[40px]">
        <h1 className="font-helvetica text-[24px] font-bold text-white">Construtor de páginas</h1>
        <p className="mt-[12px] max-w-[640px] font-poppins text-[15px] leading-[23px] text-brand-fg-muted">
          Não foi possível carregar a página agora. Confira se o backend está no ar e com as migrações aplicadas.
          Enquanto isso, os textos e imagens continuam editáveis{" "}
          <Link href="/admin/paginas/desenho" className="text-brand-orange hover:underline">
            no desenho
          </Link>
          .
        </p>
      </div>
    );
  }

  const catalogPage = page.content.kind === "sections" ? page.content.catalogPage : null;

  // As abas CATALOG de cada jogo, para o filtro do bloco "Produtos" (FASE 5:
  // aba no lugar do tipo). Em paralelo — uma leitura por jogo ativo, só nesta
  // tela do painel. `null` = leitura falhou; o editor avisa.
  const tabsByGame = await Promise.all(
    games.map(async (game) => {
      const tabs = await getGameTabs(game.id);
      return tabs
        ? tabs
            .filter((tab) => tab.isActive && tab.layout === "CATALOG")
            .map((tab) => ({ slug: tab.slug, label: tab.label }))
        : null;
    }),
  );

  return (
    <PageBuilder
      key={page.slug}
      page={page}
      initial={initial}
      sections={
        catalogPage ? sectionsSnapshot.sections.filter((section) => section.key.startsWith(`${catalogPage}:`)) : []
      }
      games={games.map(({ id, name, slug: gameSlug, categories }, index) => ({
        id,
        name,
        slug: gameSlug,
        catalogTabs: tabsByGame[index],
        categories,
      }))}
    />
  );
}
