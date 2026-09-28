import { formatBlogDate } from "@/features/blog/format";
import { backendAsset } from "@/lib/publicApi";
import { apiGet } from "@/lib/serverApi";
import { adminBlogApiParams, type AdminBlogQuery } from "./query";
import { ID_RE } from "./schema";

/**
 * Leituras do painel de notícias, no SERVIDOR (cookie httpOnly; `no-store`).
 * Separado dos tipos/queries porque importa `serverApi` → `next/headers`.
 */

export const ADMIN_BLOG_PAGE_SIZE = 20;

export type AdminBlogRow = {
  id: string;
  slug: string;
  title: string;
  cover: string | null;
  gameName: string | null;
  isPublished: boolean;
  /** "28/09/26" ou "" (rascunho sem data). */
  publishedDate: string;
};

export type AdminBlogPage = { items: AdminBlogRow[]; total: number; page: number; pageCount: number };

/** O post completo, como o formulário de edição precisa. */
export type AdminBlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  cover: string | null;
  gameId: string;
  isPublished: boolean;
  /** ISO ou "". */
  publishedAt: string;
};

type Raw = Record<string, unknown>;

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function gameOf(row: Raw): Raw | null {
  return typeof row.game === "object" && row.game !== null ? (row.game as Raw) : null;
}

function toRow(raw: unknown): AdminBlogRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Raw;
  const id = str(row.id);
  if (!ID_RE.test(id)) return null;
  return {
    id,
    slug: str(row.slug),
    title: str(row.title) || "(sem título)",
    cover: backendAsset(str(row.coverUrl) || null),
    gameName: str(gameOf(row)?.name) || null,
    isPublished: row.isPublished === true,
    publishedDate: formatBlogDate(str(row.publishedAt)),
  };
}

/**
 * Uma página da lista. `null` = leitura falhou (a tela diz isso, sem fingir
 * lista vazia). Aceita o envelope paginado do contrato ou um array puro.
 */
export async function getAdminBlogPosts(query: AdminBlogQuery): Promise<AdminBlogPage | null> {
  const response = await apiGet<unknown>(`/admin/blog?${adminBlogApiParams(query, ADMIN_BLOG_PAGE_SIZE)}`);
  if (!response.ok) return null;

  const data = response.data;
  const rawItems = Array.isArray(data) ? data : Array.isArray((data as Raw)?.items) ? ((data as Raw).items as unknown[]) : null;
  if (!rawItems) return null;

  const items = rawItems.map(toRow).filter((row): row is AdminBlogRow => row !== null);
  const meta = Array.isArray(data) ? {} : (data as Raw);
  const int = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : fallback;

  return {
    items,
    total: typeof meta.total === "number" ? meta.total : items.length,
    page: int(meta.page, query.page),
    pageCount: int(meta.pageCount, 1),
  };
}

/** O post para edição, ou `null` (a rota vira 404). */
export async function getAdminBlogPost(id: string): Promise<AdminBlogPost | null> {
  if (!ID_RE.test(id)) return null;
  const response = await apiGet<Raw>(`/admin/blog/${encodeURIComponent(id)}`);
  if (!response.ok || typeof response.data !== "object" || response.data === null) return null;

  const post = response.data;
  const postId = str(post.id);
  if (!ID_RE.test(postId)) return null;
  return {
    id: postId,
    slug: str(post.slug),
    title: str(post.title),
    excerpt: str(post.excerpt),
    body: str(post.body),
    cover: backendAsset(str(post.coverUrl) || null),
    gameId: str(post.gameId) || str(gameOf(post)?.id),
    isPublished: post.isPublished === true,
    publishedAt: str(post.publishedAt),
  };
}
