import type { ReactNode } from "react";
import { SPACING_PX } from "./catalog";
import { BannerBlock } from "./blocks/BannerBlock";
import { CtaBlock } from "./blocks/CtaBlock";
import { FaqBlock } from "./blocks/FaqBlock";
import { GameGridBlock } from "./blocks/GameGridBlock";
import { HeroBlock } from "./blocks/HeroBlock";
import { ProductGridBlock } from "./blocks/ProductGridBlock";
import { ReviewsBlock } from "./blocks/ReviewsBlock";
import { RichTextBlock } from "./blocks/RichTextBlock";
import { StatsBlock } from "./blocks/StatsBlock";
import { TextImageBlock } from "./blocks/TextImageBlock";
import { VideoBlock } from "./blocks/VideoBlock";
import type { Block, PageRefs } from "./types";

/** Uma sessão ATUAL da home já montada (nó + vão medido do Figma). */
export type LegacyNode = { node: ReactNode; gap: number };
export type LegacyNodes = Partial<Record<string, LegacyNode>>;

export type ComposedBlock = { key: string; gap: number; node: ReactNode };

/**
 * Desenha UM bloco novo. Os tipos legados (`secao`) não passam por aqui — o
 * nó deles vem pronto de `homeBlocks`, com a arte do Figma.
 */
export function BlockView({ block, refs }: { block: Block; refs: PageRefs }) {
  switch (block.type) {
    case "hero":
      return <HeroBlock props={block.props} refs={refs} />;
    case "textImage":
      return <TextImageBlock props={block.props} refs={refs} />;
    case "gameGrid":
      return <GameGridBlock props={block.props} refs={refs} />;
    case "productGrid":
      return <ProductGridBlock blockId={block.id} props={block.props} refs={refs} />;
    case "faq":
      return <FaqBlock props={block.props} />;
    case "banner":
      return <BannerBlock props={block.props} refs={refs} />;
    case "video":
      return <VideoBlock props={block.props} />;
    case "stats":
      return <StatsBlock props={block.props} />;
    case "reviews":
      return <ReviewsBlock props={block.props} />;
    case "richText":
      return <RichTextBlock props={block.props} />;
    case "cta":
      return <CtaBlock props={block.props} refs={refs} />;
    default:
      // Tipo desconhecido (versão futura do backend): some, nunca quebra a página.
      return null;
  }
}

/**
 * Transforma a lista de blocos da página na coluna que a home desenha.
 *
 * - `secao` usa o nó e o VÃO do desenho original (os mesmos da home de hoje).
 * - Bloco novo usa o espaçamento escolhido; no celular, 60% dele — 140px de
 *   vão numa tela de 390 é um buraco.
 * - Escondido fica de fora. Sessão legada sem nó (chave que esta coluna não
 *   desenha) também.
 */
export function composeBlocks(
  blocks: Block[],
  refs: PageRefs,
  legacy: LegacyNodes,
  {
    mobile = false,
    legacyGap,
  }: {
    mobile?: boolean;
    /**
     * Vão de uma seção do desenho que depende da VIZINHA (página de jogo: o
     * vão do arquivo só vale quando a anterior é a vizinha original).
     * `prev` = chave da seção do desenho anterior, ou null se foi bloco novo.
     */
    legacyGap?: (prev: string | null, key: string) => number | undefined;
  } = {},
): ComposedBlock[] {
  let prevLegacy: string | null = null;

  return blocks.flatMap((block): ComposedBlock[] => {
    if (block.hidden) return [];

    if (block.type === "secao") {
      const found = legacy[block.props.key];
      if (!found) return [];
      const gap = legacyGap?.(prevLegacy, block.props.key) ?? found.gap;
      prevLegacy = block.props.key;
      return [{ key: block.id, gap, node: found.node }];
    }

    prevLegacy = null;
    const gap = SPACING_PX[block.spacing ?? "md"];
    return [
      {
        key: block.id,
        gap: mobile ? Math.round(gap * 0.6) : gap,
        node: <BlockView block={block} refs={refs} />,
      },
    ];
  });
}

/** Mapa chave → nó a partir da lista `homeBlocks` (desktop ou mobile). */
export function legacyNodesFrom(list: { key: string; gap: number; node: ReactNode }[]): LegacyNodes {
  const map: LegacyNodes = {};
  for (const item of list) map[item.key] = { node: item.node, gap: item.gap };
  return map;
}
