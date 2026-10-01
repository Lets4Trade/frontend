import { z } from "zod";

/**
 * Abas por jogo (contrato `.claude/context/game-tabs.md`, 2026-09-28) — tipos,
 * limites e validação. Módulo PURO: a tela (client component) e as server
 * actions importam daqui, então nada de `serverApi` neste arquivo.
 *
 * Os limites espelham os do backend (label 1–60, slug `^[a-z0-9-]{1,60}$`,
 * link interno ou https, textos ≤ 10 seções × 20 itens). Validar aqui é UX e
 * primeira barreira; quem decide é o DTO do backend.
 */

/** Contrato v2 (`game-tabs-v2.md`, 2026-09-30): + QUANTITY, PACKAGES, SELL. */
export const TAB_LAYOUT_VALUES = ["CATALOG", "SERVICE", "QUANTITY", "PACKAGES", "SELL", "LINK"] as const;

export type TabLayout = (typeof TAB_LAYOUT_VALUES)[number];

export type TabSection = { title: string; items: string[] };

/** `GameTabDto` do contrato. */
export type GameTab = {
  id: string;
  slug: string;
  label: string;
  /** Cru, como o backend guarda: `/uploads/tabs/...` ou `/icons/game/tab-*.svg`. */
  iconUrl: string | null;
  layout: TabLayout;
  linkHref: string | null;
  content: { sections: TabSection[] } | null;
  position: number;
  isActive: boolean;
  productCount: number;
};

/** Os 6 layouts, com o nome em português e uma linha do que a aba mostra na loja. */
export const TAB_LAYOUTS: readonly { value: TabLayout; label: string; hint: string }[] = [
  { value: "CATALOG", label: "Catálogo", hint: "Grade de produtos (moedas, itens, builds...)." },
  { value: "SERVICE", label: "Serviço", hint: "Textos à esquerda + card configurador de preço (boosting, carry, mentoria)." },
  { value: "QUANTITY", label: "Quantidade (Gold)", hint: "Botões de quantidade pronta + quantidade livre + card de preço." },
  { value: "PACKAGES", label: "Pacotes", hint: "Cards com tópicos e botão CONTINUAR, que abre o configurador." },
  { value: "SELL", label: "Venda pra nós", hint: "Formulário de venda dentro da página do jogo. Sem produtos." },
  { value: "LINK", label: "Link", hint: "Leva para outra página (fidelidade, /venda...). Sem produtos." },
];

export function layoutLabel(layout: TabLayout): string {
  return TAB_LAYOUTS.find((option) => option.value === layout)?.label ?? layout;
}

/** Layouts que recebem produto (e categorias). LINK só navega; SELL é o formulário de venda. */
export const PRODUCT_LAYOUTS: readonly TabLayout[] = ["CATALOG", "SERVICE", "QUANTITY", "PACKAGES"];

export function isProductTab(tab: Pick<GameTab, "layout">): boolean {
  return PRODUCT_LAYOUTS.includes(tab.layout);
}

/** Layouts com os textos da coluna esquerda (`content`). */
export const CONTENT_LAYOUTS: readonly TabLayout[] = ["SERVICE", "QUANTITY", "PACKAGES"];

export function hasTabContent(layout: TabLayout): boolean {
  return CONTENT_LAYOUTS.includes(layout);
}

/**
 * Formato fechado de todo id que vai para o CAMINHO da URL do backend. Sem ele
 * um `../` vindo do cliente viraria outra rota no `fetch` (que normaliza o
 * caminho) — com a sessão de admin de quem chamou.
 */
export const ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

export function isValidId(id: unknown): id is string {
  return typeof id === "string" && ID_PATTERN.test(id);
}

/**
 * URL do ícone para o `<Image>`.
 *
 * Upload mora no BACKEND (`/uploads/tabs/x.webp`) e servido pelo Next daria 404;
 * os ícones padrão (`/icons/game/tab-*.svg`) moram no PRÓPRIO front. Mesma
 * conversão de `productImage`, repetida aqui porque este módulo é importado
 * pelo navegador e `lib/publicApi` não deve ir junto.
 */
/**
 * Ícone de reserva de uma aba sem ícone salvo — o do modelo com esse slug ou o
 * do layout. Espelha `defaultTabIcon` do backend (que já grava isso na criação
 * desde 2026-09-30) e o fallback da vitrine; serve às abas criadas antes disso.
 */
const MODEL_ICON_SLUGS = new Set(["moedas", "itens", "gold", "builds", "boosting", "carry", "mentoria", "venda", "fidelidade"]);
const LAYOUT_ICON: Record<TabLayout, string> = {
  CATALOG: "/icons/game/tab-moedas.svg",
  SERVICE: "/icons/game/tab-boosting.svg",
  QUANTITY: "/icons/game/tab-gold.svg",
  PACKAGES: "/icons/game/tab-itens.svg",
  SELL: "/icons/game/tab-venda.svg",
  LINK: "/icons/game/tab-venda.svg",
};

export function defaultTabIcon(slug: string, layout: TabLayout): string {
  return MODEL_ICON_SLUGS.has(slug) ? `/icons/game/tab-${slug}.svg` : LAYOUT_ICON[layout];
}

export function tabIconSrc(iconUrl: string | null | undefined): string | null {
  if (!iconUrl) return null;
  if (iconUrl.startsWith("https://") || iconUrl.startsWith("http://")) return iconUrl;
  if (!iconUrl.startsWith("/uploads/")) return iconUrl;
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  const origin = base.replace(/\/api\/v\d+\/?$/, "").replace(/\/$/, "");
  return `${origin}${iconUrl}`;
}

// ── Validação ───────────────────────────────────────────────────────────────

const label = z
  .string()
  .trim()
  .min(1, "Dê um nome à aba.")
  .max(60, "O nome da aba pode ter no máximo 60 caracteres.");

const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]{1,60}$/, "O endereço da aba só aceita letras minúsculas, números e hífen (até 60).");

/**
 * Caminho interno (`/venda`) ou `https://`. `javascript:`, `//outro-site` e
 * `http://` ficam de fora — link de aba é clicado por cliente, e é o formato
 * clássico de open redirect/XSS armazenado.
 */
const linkHref = z
  .string()
  .trim()
  .max(300, "O link pode ter no máximo 300 caracteres.")
  .refine(
    (value) => /^\/[a-z0-9/_-]*$/.test(value) || /^https:\/\/[^\s<>"']+$/.test(value),
    "Use um caminho do site (ex.: /venda) ou um endereço https://.",
  );

/** Texto PURO: a vitrine renderiza como texto, nunca como HTML. */
const sectionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Toda seção de texto precisa de um título.")
    .max(120, "O título de uma seção pode ter no máximo 120 caracteres."),
  items: z
    .array(z.string().trim().min(1).max(300, "Cada item pode ter no máximo 300 caracteres."))
    .max(20, "Cada seção pode ter no máximo 20 itens."),
});

export const tabContentSchema = z.object({
  sections: z.array(sectionSchema).max(10, "No máximo 10 seções de texto."),
});

export type TabContent = z.infer<typeof tabContentSchema>;

export const createTabSchema = z
  .object({
    label,
    slug: slug.optional(),
    layout: z.enum(TAB_LAYOUT_VALUES, { message: "Escolha o layout da aba." }),
    linkHref: linkHref.optional(),
    content: tabContentSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.layout === "LINK" && !value.linkHref) {
      ctx.addIssue({ code: "custom", path: ["linkHref"], message: "Aba de link precisa do endereço." });
    }
    if (value.layout !== "LINK" && value.linkHref) {
      ctx.addIssue({ code: "custom", path: ["linkHref"], message: "Só aba de link tem endereço." });
    }
    if (!hasTabContent(value.layout) && value.content) {
      ctx.addIssue({
        code: "custom",
        path: ["content"],
        message: "Só abas de Serviço, Quantidade e Pacotes têm textos.",
      });
    }
  });

export type CreateTabInput = z.input<typeof createTabSchema>;

/**
 * PATCH parcial. `linkHref`/`content` com `null` limpam.
 *
 * O LAYOUT passou a ser editável (v2, 2026-09-30: jogos antigos têm GOLD como
 * Catálogo e VENDA como Link, e o admin troca na tela). Quem decide se a troca
 * pode é o BACKEND, que conhece os produtos da aba: virar LINK/SELL com
 * produto dentro é recusado com a mensagem dele, que a tela mostra como veio.
 *
 * Quando o layout vem junto, a coerência (link só LINK, textos só nos layouts
 * de `CONTENT_LAYOUTS`) é conferida aqui também; sem ele, só o backend sabe o
 * layout gravado — a action não faz uma leitura extra só para isso.
 */
export const updateTabSchema = z
  .object({
    label: label.optional(),
    slug: slug.optional(),
    layout: z.enum(TAB_LAYOUT_VALUES, { message: "Layout de aba inválido." }).optional(),
    linkHref: linkHref.nullable().optional(),
    content: tabContentSchema.nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.layout === undefined) return;
    if (value.layout === "LINK" && value.linkHref === null) {
      ctx.addIssue({ code: "custom", path: ["linkHref"], message: "Aba de link precisa do endereço." });
    }
    if (value.layout !== "LINK" && value.linkHref) {
      ctx.addIssue({ code: "custom", path: ["linkHref"], message: "Só aba de link tem endereço." });
    }
    if (!hasTabContent(value.layout) && value.content) {
      ctx.addIssue({
        code: "custom",
        path: ["content"],
        message: "Só abas de Serviço, Quantidade e Pacotes têm textos.",
      });
    }
  });

export type UpdateTabInput = z.input<typeof updateTabSchema>;

/** Árvore de categorias de um escopo (servidor + aba), como o backend devolve. */
export type ScopedCategoryRow = {
  id: string;
  label: string;
  slug: string;
  position: number;
  parentId?: string | null;
  children?: ScopedCategoryRow[] | null;
};
