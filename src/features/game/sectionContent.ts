/**
 * Seção de texto da coluna esquerda (abas SERVICE/QUANTITY/PACKAGES e página do
 * pacote) — formato v2, 2026-10-16. Espelha `backend/src/app/games/section-content.ts`.
 *
 * Pedido do usuário: editor de texto com título, textos, o marcador dos itens
 * (a "bolinha") e imagem — "100% de personalização".
 *
 *   body        Markdown RESTRITO da loja (`pages/blocks/markdown.tsx`) + imagem
 *               em linha própria `![alt](/uploads/pages/<id>.webp)` ou
 *               `![alt](https://i.imgur.com/<id>.png)`.
 *   marker      o que vai na frente de cada item de lista.
 *   markerColor a cor do marcador (ausente = a cor de cada tela).
 *   markerIcon  arte própria do marcador (só com `marker = "icon"`).
 *   items       formato antigo (uma linha por item), ainda desenhado.
 *
 * Módulo PURO: a loja (servidor) e o painel (cliente) importam daqui.
 */

export const SECTION_MARKERS = ["dot", "check", "arrow", "dash", "star", "none", "icon"] as const;
export type SectionMarker = (typeof SECTION_MARKERS)[number];

export const SECTION_MARKER_COLORS = ["white", "orange", "green", "gray"] as const;
export type SectionMarkerColor = (typeof SECTION_MARKER_COLORS)[number];

/** Arte enviada pelo painel (`POST /admin/pages/assets`). Nenhum outro endereço vira `<img>` na loja. */
export const CONTENT_IMAGE = /^\/uploads\/pages\/[A-Za-z0-9_-]+\.webp$/;

/**
 * Link DIRETO de imagem do Imgur (2026-10-16, pedido do usuário: "colocar
 * imagem por imgur, um link"). Um host só e o formato exato do link direto —
 * imagem de endereço livre continua recusada (pixel de rastreamento de
 * terceiro). Vale só no TEXTO; o ícone dos itens segue sendo do painel.
 * Espelha `backend/src/app/games/section-content.ts`.
 */
export const IMGUR_IMAGE = /^https:\/\/i\.imgur\.com\/[A-Za-z0-9]{5,10}\.(?:png|jpe?g|gif|webp)$/;

/** Imagem que pode aparecer no texto: arte do painel ou link direto do Imgur. */
export function isBodyImage(src: string): boolean {
  return CONTENT_IMAGE.test(src) || IMGUR_IMAGE.test(src);
}

export const MAX_SECTION_BODY = 20_000;
export const MAX_SECTION_TITLE = 200;

export type ServiceSection = {
  title: string;
  items: string[];
  body?: string;
  marker?: SectionMarker;
  markerColor?: SectionMarkerColor;
  markerIcon?: string;
};

/** Glifo de cada marcador de texto (`none` e `icon` não têm). */
export const MARKER_GLYPH: Record<Exclude<SectionMarker, "none" | "icon">, string> = {
  dot: "●",
  check: "✓",
  arrow: "→",
  dash: "–",
  star: "★",
};

export const MARKER_LABEL: Record<SectionMarker, string> = {
  dot: "Bolinha",
  check: "Check",
  arrow: "Seta",
  dash: "Traço",
  star: "Estrela",
  none: "Nenhum",
  icon: "Ícone próprio",
};

export const MARKER_COLOR_LABEL: Record<SectionMarkerColor, string> = {
  white: "Branco",
  orange: "Laranja",
  green: "Verde",
  gray: "Cinza",
};

/** Classe de cor do marcador. Tokens da marca, nunca hex solto. */
export const MARKER_COLOR_CLASS: Record<SectionMarkerColor, string> = {
  white: "text-white",
  orange: "text-brand-orange",
  // O verde da marca é o das estrelas de avaliação (`--brand-rating`).
  green: "text-brand-rating",
  gray: "text-brand-placeholder",
};

const IMAGE_SYNTAX = /!\[[^\]\n]*\]\(([^)\n]*)\)/g;

/** Toda imagem citada no texto é arte do painel ou link direto do Imgur. */
export function bodyImagesAllowed(body: string): boolean {
  for (const match of body.matchAll(IMAGE_SYNTAX)) {
    if (!isBodyImage(match[1].trim())) return false;
  }
  return true;
}

/**
 * Seção vinda da API, saneada: só o formato do contrato, nos limites dele. A
 * mesma leitura defensiva do backend — é o NAVEGADOR que desenha, então a
 * allowlist vale de novo aqui. `null` = não é seção (ou está vazia).
 */
export function parseSection(raw: unknown): ServiceSection | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const s = raw as Record<string, unknown>;
  const title = typeof s.title === "string" ? s.title.trim().slice(0, MAX_SECTION_TITLE) : "";
  const items = Array.isArray(s.items)
    ? s.items
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().slice(0, 2_000))
        .filter(Boolean)
        .slice(0, 100)
    : [];
  const body =
    typeof s.body === "string" && s.body.length <= MAX_SECTION_BODY && bodyImagesAllowed(s.body)
      ? s.body.trim()
      : "";
  if (!title && items.length === 0 && !body) return null;

  const section: ServiceSection = { title, items };
  if (body) section.body = body;
  const marker = SECTION_MARKERS.find((value) => value === s.marker);
  if (marker === "icon") {
    if (typeof s.markerIcon === "string" && CONTENT_IMAGE.test(s.markerIcon)) {
      section.marker = "icon";
      section.markerIcon = s.markerIcon;
    }
  } else if (marker && marker !== "dot") {
    section.marker = marker;
  }
  const color = SECTION_MARKER_COLORS.find((value) => value === s.markerColor);
  if (color) section.markerColor = color;
  return section;
}
