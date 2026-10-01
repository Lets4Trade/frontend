import { apiGet } from "@/lib/serverApi";

/**
 * A aba inteira (jogo + aba) na ordem da vitrine, para "Organizar ordem"
 * (2026-09-24). Espelha `ProductsService.listForOrdering` no backend.
 */
export type OrderableProduct = {
  id: string;
  name: string;
  priceCents: number;
  imageUrl?: string | null;
  /** Ausente em API antiga — a grade da Central (`productGrid`) cai no rótulo. */
  serverId?: string | null;
  serverLabel?: string | null;
  /** Já tem posição manual. Os outros estão, por enquanto, em ordem A–Z. */
  ordered: boolean;
};

export type ProductOrdering =
  | { ok: true; items: OrderableProduct[]; truncated: boolean }
  | { ok: false };

export async function getProductOrdering(
  gameId: string,
  /** Aba do jogo (contrato `game-tabs.md`). */
  tabId: string,
): Promise<ProductOrdering> {
  const params = new URLSearchParams({ gameId, tabId });
  const result = await apiGet<{ items: OrderableProduct[]; truncated?: boolean }>(
    `/admin/products/order?${params.toString()}`,
  );
  if (!result.ok) return { ok: false };
  return {
    ok: true,
    items: result.data.items ?? [],
    truncated: Boolean(result.data.truncated),
  };
}

/** Produto desativado (lixeira) de uma aba. Espelha `ProductsService.listInactive`. */
export type InactiveProduct = {
  id: string;
  name: string;
  priceCents: number;
  serverId: string | null;
  serverLabel: string | null;
};

/** `null` = a leitura falhou (não é "nenhum desativado"). */
export async function getInactiveProducts(
  gameId: string,
  tabId: string,
): Promise<{ items: InactiveProduct[]; truncated: boolean } | null> {
  const params = new URLSearchParams({ gameId, tabId });
  const result = await apiGet<{ items: InactiveProduct[]; truncated?: boolean }>(
    `/admin/products/inactive?${params.toString()}`,
  );
  if (!result.ok) return null;
  return { items: result.data.items ?? [], truncated: Boolean(result.data.truncated) };
}
