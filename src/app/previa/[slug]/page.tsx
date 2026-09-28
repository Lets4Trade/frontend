import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getAdminGames } from "@/features/admin/catalog";
import { canEditContent, getSessionRole } from "@/features/auth/session";
import { parseCatalogQuery } from "@/features/game/catalog";
import { getGamePage, withActiveTab } from "@/features/game/content";
import { gameSectionNodes } from "@/features/game/GamePageSections";
import { buildHomeBlocks } from "@/features/home/homeBlocks";
import { buildMobileHomeBlocks } from "@/features/home/mobile/MobileHome";
import { getLoyalty } from "@/features/loyalty/data";
import { loyaltyNodes } from "@/features/loyalty/loyaltyNodes";
import { getAdminPage } from "@/features/pages/adminPage";
import { legacyNodesFrom, type LegacyNodes } from "@/features/pages/compose";
import { PreviewCanvas } from "@/features/pages/editor/PreviewCanvas";
import { builderPage, type BlocksPageDef } from "@/features/pages/registry";
import { SellPageBody } from "@/features/sell/SellPageBody";
import { getSectionItemsFor, getSectionsFor } from "@/features/site/content";

export const metadata: Metadata = {
  title: "Prévia — Lets4Trade",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ slug: string }> };

/**
 * Prévia do construtor de páginas — aberta NUM IFRAME pelo editor em
 * `/admin/paginas`. Fase 4: toda página montada por blocos (home, venda,
 * fidelidade, cada jogo), cada uma na MESMA moldura da página real.
 *
 * Fica FORA de `/admin` de propósito: o layout do painel desenharia o
 * cabeçalho do admin dentro da prévia. A guarda, então, é daqui: quem não edita
 * conteúdo recebe 404 — a prévia mostra rascunho não publicado.
 *
 * É a ÚNICA rota que aceita ser enquadrada (mesma origem) — ver `next.config.ts`.
 */
export default async function PreviewPage({ params }: PageProps) {
  const { slug } = await params;
  if (!canEditContent(await getSessionRole())) notFound();

  const games = slug.startsWith("jogo-") ? await getAdminGames() : [];
  const page = builderPage(slug, games);
  if (!page || page.kind !== "blocks") notFound();

  const [draft, legacy] = await Promise.all([getAdminPage(page), legacyFor(page)]);
  if (!draft) notFound();

  return (
    <div className="flex min-h-dvh flex-col bg-brand-bg">
      <SiteHeader />
      <PreviewCanvas
        frame={page.frame}
        legacyDesktop={legacy.desktop}
        legacyMobile={legacy.mobile}
        initialBlocks={draft.blocks}
      />
      <SiteFooter />
    </div>
  );
}

/**
 * As seções do DESENHO da página, montadas no servidor (leem banco). A home tem
 * duas versões (celular e desktop); as outras, uma só.
 */
async function legacyFor(page: BlocksPageDef): Promise<{ desktop: LegacyNodes; mobile?: LegacyNodes }> {
  switch (page.frame) {
    case "home": {
      const [section, items] = await Promise.all([getSectionsFor("home"), getSectionItemsFor("home")]);
      return {
        desktop: legacyNodesFrom(buildHomeBlocks(section, items)),
        mobile: legacyNodesFrom(buildMobileHomeBlocks(section, items)),
      };
    }
    case "narrow":
      return { desktop: { formulario: { node: <SellPageBody />, gap: 0 } } };
    case "wide": {
      // Dados da conta de quem está editando — é a fidelidade DELE na prévia.
      const [section, loyalty] = await Promise.all([getSectionsFor("fidelidade"), getLoyalty()]);
      return { desktop: loyalty.ok ? loyaltyNodes(loyalty.summary, loyalty.entries, section) : {} };
    }
    case "game": {
      const base = await getGamePage(page.href.replace(/^\/games\//, ""));
      if (!base) return { desktop: {} };
      const query = parseCatalogQuery({}, base);
      return { desktop: gameSectionNodes(withActiveTab(base, query.tab), query) };
    }
  }
}
