import { backendAsset } from "@/lib/publicApi";
import { effectivePricing, pricingSchema } from "@/features/pricing/quote";
import { toCategoryTree } from "./categoryTree";
export { scopeCategories } from "./catalog";
import { templateIcon } from "./tabs";
import type { GameCategory, GameProduct, GameTab, GameTabLayout, ServiceContent } from "./types";

/**
 * Tradução PURA das respostas da vitrine para o modelo da página — abas por
 * jogo (contrato `.claude/context/game-tabs.md`, 2026-09-28).
 *
 * Fica fora de `content.ts` para ser testável sem rede: `content.ts` busca,
 * este arquivo só converte. Nada aqui confia no formato da resposta — o
 * backend apaga campo nulo, e `tabs` ausente vira "jogo sem abas".
 */

/** Como a API manda cada aba (`GET /games/:slug` → `tabs`). */
export type ApiGameTab = {
  slug: string;
  label: string;
  iconUrl?: string | null;
  layout: string;
  linkHref?: string | null;
  content?: unknown;
};

export type ApiCategory = {
  id?: string;
  slug: string;
  label: string;
  parentId?: string | null;
  children?: ApiCategory[] | null;
  serverSlug?: string | null;
  tabSlug?: string | null;
};

const LAYOUTS = new Set<GameTabLayout>(["CATALOG", "SERVICE", "QUANTITY", "PACKAGES", "SELL", "LINK"]);

/** Layouts que levam os textos da esquerda (`content`) — contrato v2. */
const CONTENT_LAYOUTS = new Set<GameTabLayout>(["SERVICE", "QUANTITY", "PACKAGES"]);
const SLUG = /^[a-z0-9-]{1,60}$/;

/** Ícone de reserva: o do modelo com esse slug; aba nova sem ícone usa o do layout. */
const LAYOUT_ICON: Record<GameTabLayout, string> = {
  CATALOG: "/icons/game/tab-moedas.svg",
  SERVICE: "/icons/game/tab-boosting.svg",
  QUANTITY: "/icons/game/tab-gold.svg",
  PACKAGES: "/icons/game/tab-itens.svg",
  SELL: "/icons/game/tab-venda.svg",
  LINK: "/icons/game/tab-venda.svg",
};

function iconSrc(iconUrl: string | null | undefined, slug: string, layout: GameTabLayout) {
  if (iconUrl) {
    // Upload do painel mora no BACKEND; o ícone padrão (`/icons/game/...`) é
    // arquivo do próprio Next — prefixar o host da API daria 404.
    if (iconUrl.startsWith("/uploads/")) return backendAsset(iconUrl) ?? iconUrl;
    if (iconUrl.startsWith("/") && !iconUrl.startsWith("//")) return iconUrl;
    if (iconUrl.startsWith("https://")) return iconUrl;
  }
  return templateIcon(slug) ?? LAYOUT_ICON[layout];
}

/**
 * Destino de uma aba LINK. A mesma allowlist do backend (caminho interno ou
 * https) — repetida aqui porque é o NAVEGADOR que segue o link: um
 * `javascript:` gravado por engano não pode virar `href`.
 */
export function safeLinkHref(value: string | null | undefined): string | null {
  if (!value) return null;
  const href = value.trim();
  if (/^\/[a-z0-9/_-]*$/i.test(href) && !href.startsWith("//")) return href;
  if (/^https:\/\/[^\s]+$/i.test(href)) return href;
  return null;
}

/** `content` da aba (SERVICE/QUANTITY/PACKAGES), saneado: só texto, nos limites do contrato. */
export function parseServiceContent(raw: unknown): ServiceContent | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const sections = (raw as { sections?: unknown }).sections;
  if (!Array.isArray(sections)) return undefined;

  const clean = sections
    .slice(0, 10)
    .map((section) => {
      const s = (section ?? {}) as { title?: unknown; items?: unknown };
      const title = typeof s.title === "string" ? s.title.trim().slice(0, 120) : "";
      const items = Array.isArray(s.items)
        ? s.items
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim().slice(0, 300))
            .filter(Boolean)
            .slice(0, 20)
        : [];
      return { title, items };
    })
    .filter((section) => section.title || section.items.length > 0);

  return clean.length > 0 ? { sections: clean } : undefined;
}

/**
 * Abas do BANCO. A primeira aba que não é LINK é o estado padrão da página e
 * não carrega `?aba=` (a mesma regra da paginação).
 */
export function tabsFromApi(gameSlug: string, raw: readonly ApiGameTab[]): GameTab[] {
  let defaultTaken = false;
  const seen = new Set<string>();
  const tabs: GameTab[] = [];

  for (const tab of raw) {
    if (!tab || typeof tab.slug !== "string" || !SLUG.test(tab.slug) || seen.has(tab.slug)) continue;
    const layout = tab.layout as GameTabLayout;
    if (!LAYOUTS.has(layout)) continue;

    let href: string;
    if (layout === "LINK") {
      const link = safeLinkHref(tab.linkHref);
      if (!link) continue; // aba de link sem destino válido não é clicável
      href = link;
    } else {
      href = defaultTaken ? `/games/${gameSlug}?aba=${tab.slug}` : `/games/${gameSlug}`;
      defaultTaken = true;
    }

    seen.add(tab.slug);
    tabs.push({
      id: tab.slug,
      label: (typeof tab.label === "string" && tab.label.trim()) || tab.slug.toUpperCase(),
      icon: { src: iconSrc(tab.iconUrl, tab.slug, layout), width: 50, height: 50 },
      href,
      layout,
      content: CONTENT_LAYOUTS.has(layout) ? parseServiceContent(tab.content) : undefined,
    });
  }

  return tabs;
}

/** A aba padrão: a primeira que não é LINK. */
export function defaultTabId(tabs: readonly GameTab[]): string {
  return tabs.find((tab) => tab.layout !== "LINK")?.id ?? "";
}

/**
 * Árvore da vitrine. O `id` de cada item é o SLUG (vai na URL e no filtro da
 * API); o escopo (servidor/aba) vem junto para o painel filtrar.
 */
export function toGameCategories(rows: readonly ApiCategory[]): GameCategory[] {
  return toCategoryTree(rows).map((root) => ({
    id: root.slug,
    label: root.label,
    parentId: null,
    serverSlug: root.serverSlug ?? null,
    tabSlug: root.tabSlug ?? null,
    children: root.children.map((child) => ({
      id: child.slug,
      label: child.label,
      parentId: root.slug,
      serverSlug: child.serverSlug ?? null,
      tabSlug: child.tabSlug ?? null,
      children: [],
    })),
  }));
}

/** Regra de preço da API → validada. Inválida não vira FIXED em silêncio. */
export function readPricing(raw: unknown): Pick<GameProduct, "pricing" | "pricingInvalid"> {
  if (raw === null || raw === undefined) return {};
  const parsed = pricingSchema.safeParse(raw);
  return parsed.success ? { pricing: parsed.data } : { pricingInvalid: true };
}

/**
 * Tópicos do card de pacote, saneados como o backend (≤ 6 × 80, trim, sem
 * vazios). Ausente/formato estranho = `[]`: o backend anterior ao contrato v2
 * não manda o campo, e o card simplesmente sai sem tópicos.
 */
export function readHighlights(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 6);
}

/**
 * Aplica a regra que VALE (`effectivePricing`) aos produtos de uma aba cotada.
 *
 * O backend já manda `pricing` efetivo (contrato v2), mas o front não depende
 * disso: um backend mais antigo manda `null` para produto de aba QUANTITY, e
 * sem este passo o gold viraria FIXED na tela e QUANTITY na cobrança. Com a
 * MESMA função dos dois lados, a prévia e a conta do pedido não divergem.
 *
 * Regra inválida continua inválida (serviço indisponível) — nunca vira padrão.
 */
export function withEffectivePricing(products: readonly GameProduct[], layout: GameTabLayout): GameProduct[] {
  return products.map((product) => {
    if (product.pricingInvalid) return product;
    const pricing = effectivePricing(layout, product.pricing);
    return pricing ? { ...product, pricing } : product;
  });
}
