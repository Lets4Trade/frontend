import { apiGet } from "@/lib/serverApi";
import type { AuditPage } from "./types";

/**
 * Leitura da trilha de auditoria no SERVIDOR.
 *
 * Como as outras listagens do painel, os filtros moram na URL — a filtragem
 * acontece no banco, e esta é a tabela que mais cresce.
 */

export const PARAM = {
  category: "categoria",
  search: "busca",
  page: "pagina",
} as const;

export type LogsQuery = {
  category: string;
  search: string;
  page: number;
};

const CATEGORIES = new Set(["MUTATION", "ADMIN_VIEW", "NAVIGATION", "AUTH"]);

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseLogsQuery(params: RawParams): LogsQuery {
  const rawCategory = first(params[PARAM.category]) ?? "";
  const rawPage = Number.parseInt(first(params[PARAM.page]) ?? "1", 10);

  return {
    category: CATEGORIES.has(rawCategory) ? rawCategory : "",
    search: (first(params[PARAM.search]) ?? "").slice(0, 80),
    page: Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1,
  };
}

export function buildHref(query: LogsQuery, patch: Partial<LogsQuery>): string {
  const next = { ...query, ...patch };
  if (patch.page === undefined) next.page = 1;

  const search = new URLSearchParams();
  if (next.category) search.set(PARAM.category, next.category);
  if (next.search) search.set(PARAM.search, next.search);
  if (next.page > 1) search.set(PARAM.page, String(next.page));

  const qs = search.toString();
  return qs === "" ? "/admin/logs" : `/admin/logs?${qs}`;
}

const EMPTY_PAGE: AuditPage = {
  items: [],
  total: 0,
  page: 1,
  limit: 25,
  pageCount: 1,
};

export async function getAuditLogs(query: LogsQuery): Promise<AuditPage> {
  const search = new URLSearchParams();
  if (query.category) search.set("category", query.category);
  if (query.search) search.set("search", query.search);
  search.set("page", String(query.page));

  const response = await apiGet<AuditPage>(`/admin/logs?${search.toString()}`);
  return response.ok && Array.isArray(response.data?.items)
    ? response.data
    : EMPTY_PAGE;
}
