import { GAME_SECTIONS, DEFAULT_SECTION_ORDER, gapBefore, type GameSectionKey } from "@/features/game/sections";

/**
 * As PÁGINAS do construtor (fase 4, 2026-09-25) — espelha a allowlist do
 * backend (`backend/src/app/pages/blocks.schema.ts`).
 *
 * Dois tipos:
 *  - `blocks`: página montada por blocos (rascunho → publicar), com as seções
 *    do desenho entrando como blocos `secao`;
 *  - `content`: página só de CONTEÚDO (cabeçalho/rodapé, termos) — lista fixa
 *    de sessões editadas no painel, sem blocos nem ordem.
 */

/** Moldura em que a página é desenhada (a mesma da página real). */
export type PageFrame = "home" | "narrow" | "wide" | "game";

export type BlocksPageDef = {
  kind: "blocks";
  slug: string;
  label: string;
  /** Endereço público da página, para o link "ver na loja". */
  href: string;
  frame: PageFrame;
  /** Seções do desenho, na ordem PADRÃO da página. */
  legacyKeys: readonly string[];
  legacyLabels: Record<string, string>;
  /**
   * Onde vive o conteúdo dessas seções: página do catálogo de sessões (texto e
   * arte editados no construtor) ou o Builder de jogo (link).
   */
  content: { kind: "sections"; catalogPage: string } | { kind: "gameBuilder"; gameId: string };
  // Sem funções aqui: a definição vai como prop para Client Components
  // (PageBuilder). A regra de vão do jogo sai de `frame === "game"` →
  // GAME_LEGACY_GAP, na página real e na prévia.
};

export type ContentPageDef = {
  kind: "content";
  slug: string;
  label: string;
  href: string;
  /** Página do catálogo de sessões (`features/site/sections.ts`). */
  catalogPage: string;
};

export type BuilderPageDef = BlocksPageDef | ContentPageDef;

const HOME: BlocksPageDef = {
  kind: "blocks",
  slug: "home",
  label: "Home",
  href: "/",
  frame: "home",
  legacyKeys: ["hero", "navegacao", "video", "reviews", "equipe", "guias", "faq"],
  legacyLabels: {
    hero: "Hero — carrossel de jogos",
    navegacao: "Contadores e atalhos",
    video: "Vídeo",
    reviews: "Reviews",
    equipe: "Equipe",
    guias: "Guias",
    faq: "Dúvidas",
  },
  content: { kind: "sections", catalogPage: "home" },
};

const VENDA: BlocksPageDef = {
  kind: "blocks",
  slug: "venda",
  label: "Venda pra nós",
  href: "/venda",
  frame: "narrow",
  legacyKeys: ["formulario"],
  legacyLabels: { formulario: "Formulário de venda e contato" },
  content: { kind: "sections", catalogPage: "venda" },
};

const FIDELIDADE: BlocksPageDef = {
  kind: "blocks",
  slug: "fidelidade",
  label: "Fidelidade",
  href: "/fidelidade",
  frame: "wide",
  legacyKeys: ["resumo", "niveis", "extrato"],
  legacyLabels: { resumo: "Resumo da conta", niveis: "Níveis", extrato: "Extrato" },
  content: { kind: "sections", catalogPage: "fidelidade" },
};

const GAME_LABELS: Record<string, string> = Object.fromEntries(
  GAME_SECTIONS.map((section) => [section.key, section.label]),
);

/** Página de UM jogo — slug pelo ID do jogo (trocar o link do jogo não a perde). */
export function gamePageDef(game: { id: string; name: string; slug: string }): BlocksPageDef {
  return {
    kind: "blocks",
    slug: `jogo-${game.id}`,
    label: `Jogo — ${game.name}`,
    href: `/games/${game.slug}`,
    frame: "game",
    legacyKeys: DEFAULT_SECTION_ORDER,
    legacyLabels: GAME_LABELS,
    content: { kind: "gameBuilder", gameId: game.id },
  };
}

/**
 * Mesma regra do desenho da vitrine: vão do arquivo quando a seção anterior é
 * a vizinha original, vão padrão nos outros casos (inclusive depois de um
 * bloco novo). Exportada à parte porque a página real e a prévia a usam.
 */
export const GAME_LEGACY_GAP = (prev: string | null, key: string) =>
  gapBefore([(prev ?? "__novo") as GameSectionKey, key as GameSectionKey], 1);

const LAYOUT: ContentPageDef = {
  kind: "content",
  slug: "layout",
  label: "Cabeçalho e rodapé",
  href: "/",
  catalogPage: "layout",
};

/** Referências, notícias e dúvidas que aparecem em TODAS as páginas de jogo. */
const GAMES_SHARED: ContentPageDef = {
  kind: "content",
  slug: "jogos-compartilhado",
  label: "Páginas de jogo — conteúdo comum",
  href: "/",
  catalogPage: "games",
};

const LEGAL: ContentPageDef = {
  kind: "content",
  slug: "legal",
  label: "Termos e privacidade",
  href: "/termos",
  catalogPage: "legal",
};

export const STATIC_PAGES: readonly BuilderPageDef[] = [HOME, VENDA, FIDELIDADE, LAYOUT, GAMES_SHARED, LEGAL];

/** Resolve o slug (inclusive `jogo-<id>`, com a lista de jogos). */
export function builderPage(
  slug: string,
  games: readonly { id: string; name: string; slug: string }[],
): BuilderPageDef | null {
  const fixed = STATIC_PAGES.find((page) => page.slug === slug);
  if (fixed) return fixed;
  if (slug.startsWith("jogo-")) {
    const game = games.find((item) => `jogo-${item.id}` === slug);
    return game ? gamePageDef(game) : null;
  }
  return null;
}

export function legacyLabel(page: BlocksPageDef, key: string): string {
  return page.legacyLabels[key] ?? key;
}
