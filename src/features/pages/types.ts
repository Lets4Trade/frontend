/**
 * Construtor de páginas por blocos — tipos compartilhados (fase 1, 2026-09-25).
 *
 * Espelham o contrato em `.claude/context/page-builder.md`. Quem VALIDA é o
 * backend (zod, em `backend/src/app/pages/blocks.schema.ts`); aqui estão só as
 * formas, para o editor montar e a loja desenhar. Mudou um campo lá, muda aqui.
 */

export type BlockSpacing = "sm" | "md" | "lg";

/** Sessões ATUAIS da home que entram como bloco (o desenho do Figma). */
export const LEGACY_SECTION_KEYS = [
  "hero",
  "navegacao",
  "video",
  "reviews",
  "equipe",
  "guias",
  "faq",
] as const;
/**
 * Chave de uma seção do desenho. Cada página tem as suas (fase 4) — quem sabe
 * quais valem é o registro (`registry.ts`) e, de verdade, o backend.
 */
export type LegacySectionKey = string;

/** Caminho de imagem enviada pelo construtor (`/uploads/pages/…webp`). */
export type Asset = string;

export type PageLink =
  | { kind: "game"; gameId: string }
  | { kind: "path"; path: string }
  | { kind: "url"; url: string };

export type Cta = { label: string; link: PageLink };

export type BlockPropsMap = {
  secao: { key: LegacySectionKey };
  hero: {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    image?: Asset;
    cta?: Cta;
    align: "left" | "center";
  };
  textImage: {
    title: string;
    body: string;
    image?: Asset;
    imageSide: "left" | "right";
    cta?: Cta;
  };
  gameGrid: {
    title?: string;
    /** Vazio = todos os jogos ativos. */
    gameIds: string[];
    columns: 3 | 4 | 5 | 6;
  };
  productGrid: {
    title?: string;
    gameId: string;
    /**
     * Slug de uma aba CATALOG do jogo (FASE 5, 2026-09-28). Ausente = todas.
     * JSON antigo com `productType` é traduzido na leitura (`legacy.ts`).
     */
    tabSlug?: string;
    categoryId?: string;
    limit: number;
    sort: "destaque" | "preco-asc" | "preco-desc";
  };
  faq: {
    title?: string;
    items: { id: string; question: string; answer: string }[];
  };
  // ── Fase 2 (2026-09-25) ──────────────────────────────────────────────────
  banner: {
    image: Asset;
    mobileImage?: Asset;
    alt: string;
    link?: PageLink;
  };
  video: {
    title?: string;
    /** Só o ID do YouTube — a URL do player é montada num host fixo. */
    videoId: string;
    caption?: string;
  };
  stats: {
    items: { id: string; value: string; label: string }[];
  };
  reviews: {
    title?: string;
    items: { id: string; name: string; text: string; rating: number; avatar?: Asset }[];
  };
  richText: {
    title?: string;
    /** Markdown RESTRITO — ver `blocks/markdown.tsx`. */
    body: string;
  };
  cta: {
    title: string;
    text?: string;
    cta: Cta;
    tone: "orange" | "dark";
  };
};

export type BlockType = keyof BlockPropsMap;

export type Block<T extends BlockType = BlockType> = {
  [K in T]: {
    id: string;
    type: K;
    hidden?: boolean;
    spacing?: BlockSpacing;
    props: BlockPropsMap[K];
  };
}[T];

/** O que o backend resolve a partir das referências dos blocos. */
export type PageRefs = {
  games: Record<string, { id: string; name: string; slug: string; imageUrl: string | null }>;
  products: Record<
    string,
    { id: string; name: string; priceCents: number; imageUrl: string | null; gameSlug: string }[]
  >;
};

export const EMPTY_REFS: PageRefs = { games: {}, products: {} };

/** Página como o editor a recebe (`GET /admin/pages/:slug`). */
export type AdminPage = {
  slug: string;
  blocks: Block[];
  draftRevision: number;
  version: number;
  publishedAt: string | null;
  hasUnpublishedChanges: boolean;
};

/** Página publicada, como a loja a recebe (`GET /pages/:slug`). */
export type PublishedPage = {
  slug: string;
  version: number;
  blocks: Block[];
  refs: PageRefs;
};

export type PageRevision = {
  version: number;
  createdAt: string;
  createdBy: { name: string } | null;
};
