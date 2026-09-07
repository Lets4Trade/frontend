import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { parseCatalogQuery } from "@/features/game/catalog";
import {
  CatalogToolbar,
  CategoryPanel,
  ServerPicker,
} from "@/features/game/CatalogFilters";
import { getGamePage } from "@/features/game/content";
import { GameIdentity } from "@/features/game/GameIdentity";
import {
  BannerSection,
  GameFaqSection,
  NewsSection,
  ReferencesSection,
} from "@/features/game/GameSections";
import { ProductGrid } from "@/features/game/ProductGrid";

type RouteParams = { slug: string };
type RouteSearch = Record<string, string | string[] | undefined>;

type PageProps = {
  params: Promise<RouteParams>;
  searchParams: Promise<RouteSearch>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getGamePage(slug);
  if (!page) return {};

  return {
    title: page.seo.title,
    description: page.seo.description,
    alternates: { canonical: `/games/${page.slug}` },
    openGraph: {
      title: page.seo.title,
      description: page.seo.description,
      url: `/games/${page.slug}`,
      type: "website",
      siteName: "Lets4Trade",
    },
  };
}

/**
 * Página de um jogo — Figma nó 1116:314 (1920×5892).
 *
 * DUAS DECISÕES estruturam este arquivo, e as duas vêm do requisito de ela ser
 * 100% editável pelo admin:
 *
 * 1. NADA de texto ou imagem está escrito aqui. Tudo vem de `getGamePage()`,
 *    que devolve um `GamePage` (ver `features/game/types.ts`). Trocar o
 *    conteúdo semente por uma chamada de API não mexe em nenhum componente.
 *
 * 2. A página é montada em FLUXO, e não em coordenada absoluta como a home.
 *    Aqui os textos são escritos por outra pessoa e vão ter comprimentos que o
 *    arquivo não previu — um título de duas linhas, uma resposta de FAQ com o
 *    dobro do tamanho. Coordenada fixa quebraria na primeira edição. Os
 *    espaçamentos continuam sendo os do arquivo, medidos como diferença entre
 *    as coordenadas Y das seções:
 *
 *      133   banner            →  fim em 623
 *      665   identidade        →  fim em 829
 *      873   "Selecionar servidor"
 *      991   painel de categoria
 *      1281  barra do catálogo
 *      1356  grade de produtos →  paginação em 3149
 *      3249  referências
 *      3700  notícias
 *      4256  dúvidas
 *      5338  rodapé
 *
 * O catálogo (filtro, ordenação, busca, paginação) roda no SERVIDOR, com o
 * estado na URL — ver `features/game/catalog.ts`.
 */
export default async function GamePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const page = await getGamePage(slug);
  if (!page) notFound();

  const query = parseCatalogQuery(await searchParams, page);

  const showBanner = page.sections.includes("banner");
  const rest = page.sections.filter((section) => section !== "banner");

  return (
    <div className="flex min-h-dvh flex-col bg-brand-bg">
      <SiteHeader />

      {/*
        Mesma moldura elástica da home, e pelo mesmo motivo: a faixa de
        conteúdo tem 1714px e as margens de 103px é que cedem quando a janela
        aperta. Ver o comentário em `app/page.tsx`.
      */}
      <main className="flex-1 overflow-x-auto">
        <div className="relative mx-auto w-full max-w-[1920px] min-w-[1714px] overflow-x-clip">
          {/* Brilho do topo (Figma 1127:360): o centro dele cai acima do frame,
              o que aparece é só a borda de baixo. */}
          <Image
            src="/images/game/glow-top.svg"
            alt=""
            width={472}
            height={472}
            aria-hidden
            priority
            className="pointer-events-none absolute -top-[310px] -left-[222px] size-[472px] max-w-none"
          />

          <div className="relative mx-auto w-[1714px] pt-[50px] pb-[100px]">
            {showBanner ? <BannerSection banners={page.banners} /> : null}

            <div className={showBanner ? "mt-[42px]" : undefined}>
              <GameIdentity page={page} />
            </div>

            <div className="mt-[44px]">
              <ServerPicker page={page} query={query} />
            </div>

            <div className="mt-[25px]">
              <CategoryPanel page={page} query={query} />
            </div>

            <div className="mt-[47px]">
              <CatalogToolbar page={page} query={query} />
            </div>

            <div className="mt-[25px]">
              <ProductGrid page={page} query={query} />
            </div>

            {rest.map((section) => (
              <div key={section} className="mt-[50px]">
                {section === "references" ? (
                  <ReferencesSection references={page.references} />
                ) : null}
                {section === "news" ? <NewsSection news={page.news} /> : null}
                {section === "faq" ? <GameFaqSection groups={page.faq} /> : null}
              </div>
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
