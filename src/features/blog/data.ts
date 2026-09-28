import { backendAsset, publicApiGet } from "@/lib/publicApi";
import { BLOG_TAG, formatBlogDate } from "./format";
import { BLOG_PAGE_SIZE, BLOG_SLUG_RE, blogPostHref, type BlogQuery } from "./query";
import type { BlogArticleView, BlogCardView, BlogGameRef, BlogListView } from "./types";

/**
 * Leituras PÚBLICAS do blog (`GET /blog`, `/blog/:slug`, `/blog/games`).
 *
 * ── Cache ─────────────────────────────────────────────────────────────────
 * Diferente do catálogo (no-store por causa de preço), notícia é conteúdo
 * editorial igual para todo visitante: 60s de cache + etiqueta `BLOG_TAG`, que
 * o painel derruba ao salvar/excluir (`features/admin/blog/actions.ts`). O TTL
 * é só rede de segurança — e é o que protege o backend quando a lista for
 * compartilhada e receber pico de acesso.
 *
 * ── Fail soft ─────────────────────────────────────────────────────────────
 * `publicApiGet` já devolve `null` em qualquer imprevisto (timeout de 4s,
 * 5xx, corpo inesperado). Aqui a resposta ainda é conferida campo a campo: um
 * item malformado é DESCARTADO, e não derruba a lista inteira.
 */

const REVALIDATE_SECONDS = 60;
const CACHE = { revalidate: REVALIDATE_SECONDS, tags: [BLOG_TAG] };

/** `BlogPostCard` do contrato. O backend apaga campos nulos da resposta. */
type RawGame = { slug?: unknown; name?: unknown; imageUrl?: unknown };
type RawCard = {
  slug?: unknown;
  title?: unknown;
  excerpt?: unknown;
  coverUrl?: unknown;
  publishedAt?: unknown;
  game?: RawGame | null;
};
type RawList = { items?: unknown; total?: unknown; page?: unknown; pageCount?: unknown };
type RawArticle = RawCard & { body?: unknown; related?: unknown };

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toGameRef(raw: RawGame | null | undefined): BlogGameRef | null {
  if (!raw || typeof raw !== "object") return null;
  const slug = str(raw.slug);
  const name = str(raw.name);
  if (!slug || !name) return null;
  return { slug, name, logo: backendAsset(str(raw.imageUrl) || null) };
}

/** Item da API → card. `null` quando falta o que o card não sabe inventar. */
export function toBlogCard(raw: unknown): BlogCardView | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as RawCard;
  const slug = str(item.slug);
  const title = str(item.title);
  // Slug fora do formato não vira link: ele entra no CAMINHO da URL.
  if (!BLOG_SLUG_RE.test(slug) || !title) return null;

  const publishedAt = str(item.publishedAt);
  return {
    slug,
    title,
    excerpt: str(item.excerpt),
    cover: backendAsset(str(item.coverUrl) || null),
    publishedAt,
    date: formatBlogDate(publishedAt),
    game: toGameRef(item.game),
    href: blogPostHref(slug),
  };
}

function toCards(raw: unknown): BlogCardView[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(toBlogCard).filter((card): card is BlogCardView => card !== null);
}

function positiveInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : fallback;
}

/**
 * Uma página da lista. `null` = backend indisponível (a tela diz isso, em vez
 * de afirmar "nenhuma notícia" — seriam coisas diferentes).
 */
export async function getBlogList(query: BlogQuery): Promise<BlogListView | null> {
  const params = new URLSearchParams();
  if (query.game) params.set("game", query.game);
  if (query.search) params.set("search", query.search);
  if (query.page > 1) params.set("page", String(query.page));
  params.set("limit", String(BLOG_PAGE_SIZE));

  const data = await publicApiGet<RawList>(`/blog?${params.toString()}`, CACHE);
  if (!data || typeof data !== "object" || !Array.isArray(data.items)) return null;

  const items = toCards(data.items);
  return {
    items,
    total: typeof data.total === "number" && data.total >= 0 ? data.total : items.length,
    page: positiveInt(data.page, query.page),
    pageCount: positiveInt(data.pageCount, 1),
  };
}

/**
 * A matéria. `null` para inexistente, rascunho OU backend fora — a rota vira
 * 404 nos três casos (fail secure: nunca mostrar rascunho, nunca inventar).
 */
export async function getBlogPost(slug: string): Promise<BlogArticleView | null> {
  // Validado ANTES de ir à rede: o slug vem da URL e entra no caminho da API.
  if (!BLOG_SLUG_RE.test(slug)) return null;

  const data = await publicApiGet<RawArticle>(`/blog/${encodeURIComponent(slug)}`, CACHE);
  const card = toBlogCard(data);
  if (!card || !data) return null;

  return {
    ...card,
    body: str(data.body),
    // Nunca a própria matéria nos relacionados, mesmo que o backend a mande.
    related: toCards(data.related)
      .filter((item) => item.slug !== card.slug)
      .slice(0, 3),
  };
}

/** Jogos com ao menos uma notícia publicada — a fileira de filtros. */
export async function getBlogGames(): Promise<BlogGameRef[]> {
  const data = await publicApiGet<RawGame[]>("/blog/games", CACHE);
  if (!Array.isArray(data)) return [];
  return data.map(toGameRef).filter((game): game is BlogGameRef => game !== null);
}

/**
 * As últimas notícias de UM jogo, para a seção NOTÍCIAS da página do jogo.
 * Lista vazia em qualquer falha: quem chama cai no conteúdo editorial.
 */
export async function getGameNews(gameSlug: string, limit = 4): Promise<BlogCardView[]> {
  if (!BLOG_SLUG_RE.test(gameSlug)) return [];
  const params = new URLSearchParams({ game: gameSlug, limit: String(limit) });
  const data = await publicApiGet<RawList>(`/blog?${params.toString()}`, CACHE);
  if (!data || typeof data !== "object") return [];
  return toCards(data.items).slice(0, limit);
}
