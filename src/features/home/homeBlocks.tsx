import type { ReactNode } from "react";
import { FaqSection } from "./FaqSection";
import { GuidesSection } from "./GuidesSection";
import { HeroSection } from "./HeroSection";
import { HomeNav } from "./HomeNav";
import { ReviewsSection } from "./ReviewsSection";
import { TeamSection } from "./TeamSection";
import { VideoSection } from "./VideoSection";
import { buildHeroSlides } from "./heroGames";
import type { SectionItemView, SectionView } from "@/features/site/content";

/**
 * Os blocos da HOME como uma LISTA, e não como uma sequência escrita no JSX.
 *
 * ── Por que ────────────────────────────────────────────────────────────────
 * A partir de 2026-09-15 a ordem das sessões é editável (arrastar no painel), e
 * ordem só é editável se for DADO. Com os blocos numa lista, a home e o editor
 * `/admin/paginas` desenham a MESMA coisa: a página monta na ordem do banco, o
 * editor monta na ordem do rascunho.
 *
 * ── O vão entre as seções ──────────────────────────────────────────────────
 * Cada bloco declara o vão que quer ANTES de si, medido do arquivo do Figma
 * (as coordenadas Y de `app/page.tsx`). Assim reordenar não inventa espaçamento:
 * o vão acompanha o bloco que vem depois, que é como o desenho se comporta.
 * O primeiro bloco da página nunca usa o seu.
 */
export type HomeBlock = {
  /** Chave curta da sessão, como no catálogo (`sections.ts`). */
  key: string;
  /** Listas extras que o bloco desenha, por chave cheia — ver `EditorBlock`. */
  itemLabels?: Record<string, string>;
  /** Vão acima do bloco, em pixels (ignorado quando ele é o primeiro). */
  gap: number;
  node: ReactNode;
};

export function buildHomeBlocks(
  section: (key: string) => SectionView,
  items: (key: string) => SectionItemView[],
): HomeBlock[] {
  return [
    {
      key: "hero",
      gap: 0,
      // O hero desenha DUAS listas: os cards do carrossel (a sessão "hero" do
      // catálogo) e as artes do banner, que não são uma sessão.
      itemLabels: { "home:hero-banner": "imagem do banner" },
      node: (
        <HeroSection
          image={section("hero").imageUrl}
          caption={section("hero").title}
          // Os cards do carrossel vêm de "Home - Hero". A geometria medida das
          // artes originais é reconhecida pela própria arte — ver `buildHeroSlides`.
          slides={buildHeroSlides(items("hero"))}
          // As artes do banner são lista PRÓPRIA: os cards ao lado já usam
          // `home:hero`, e misturar as duas faria um card virar banner.
          bannerImages={items("hero-banner")}
        />
      ),
    },
    {
      // A faixa de contadores e o divisor de 1076 do arquivo andam juntos: são
      // um bloco só na hora de reordenar.
      key: "navegacao",
      gap: 0,
      node: (
        <>
          <HomeNav stats={items("navegacao")} />
          <hr className="mt-[69px] border-0 border-t border-brand-hairline" />
        </>
      ),
    },
    {
      key: "video",
      gap: 50,
      node: (
        <VideoSection
          title={section("video").title}
          image={section("video").imageUrl}
          avatar={section("video").secondaryImageUrl}
          videoUrl={section("video").footnote}
          videoFile={section("video").videoUrl}
          buttonUrl={section("video").subtitle}
          extra={section("video").extra}
        />
      ),
    },
    {
      key: "reviews",
      gap: 99,
      node: (
        <ReviewsSection
          title={section("reviews").title}
          subtitle={section("reviews").subtitle}
          counter={section("reviews").footnote}
          items={items("reviews")}
        />
      ),
    },
    {
      key: "equipe",
      gap: 107,
      node: (
        <TeamSection
          title={section("equipe").title}
          subtitle={section("equipe").subtitle}
          // `|| undefined` e não o valor cru: passar `""` sobrescreveria o
          // padrão do componente com vazio.
          body={section("equipe").body || undefined}
          items={items("equipe")}
        />
      ),
    },
    {
      key: "guias",
      gap: 100,
      node: <GuidesSection title={section("guias").title} items={items("guias")} />,
    },
    {
      key: "faq",
      gap: 100,
      node: <FaqSection title={section("faq").title} items={items("faq")} />,
    },
  ];
}

/** Os blocos visíveis, na ordem pedida, já com o vão de cada um. */
export function orderBlocks(blocks: HomeBlock[], order: readonly string[]): HomeBlock[] {
  const byKey = new Map(blocks.map((block) => [block.key, block]));
  return order
    .map((key) => byKey.get(key))
    .filter((block): block is HomeBlock => Boolean(block));
}
