import { createUnreadCounter } from "@/features/admin/unreadCounter";
import { fetchWithSession } from "@/lib/browserSession";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

/**
 * Quantas propostas de "Venda pra nós" estão NOVAS (2026-10-28) — o ponto de
 * "Propostas" no menu do painel. Pelo navegador direto ao backend, como as
 * leituras do chat do painel; quem autoriza é o `RolesGuard` (ADMIN e ATENDENTE).
 */
async function getNewSellRequestsCount(): Promise<number> {
  const response = await fetchWithSession(`${API_URL}/admin/sell-requests/new-count`, {
    headers: { accept: "application/json", "x-pt-surface": "client" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = (await response.json().catch(() => null)) as { data?: { count?: unknown } } | null;
  const count = body?.data?.count;
  return typeof count === "number" && count > 0 ? count : 0;
}

export const newSellRequestsCounter = createUnreadCounter(getNewSellRequestsCount);
