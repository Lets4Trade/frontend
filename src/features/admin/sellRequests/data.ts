import { apiGet } from "@/lib/serverApi";
import { toSellRequestPage, type SellRequestPage, type SellRequestStatus } from "./types";

/**
 * Leitura do painel de propostas, no SERVIDOR (cookie httpOnly; `no-store`).
 * Separado dos tipos porque importa `serverApi` → `next/headers`.
 */
export async function getSellRequests(query: {
  status: SellRequestStatus | null;
  search: string;
  page: number;
}): Promise<SellRequestPage | null> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.search) params.set("search", query.search.slice(0, 80));
  if (query.page > 1) params.set("page", String(query.page));
  params.set("limit", "25");
  const result = await apiGet<unknown>(`/admin/sell-requests?${params}`);
  return result.ok ? toSellRequestPage(result.data) : null;
}
