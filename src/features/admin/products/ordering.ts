import { apiGet } from "@/lib/serverApi";

/**
 * A aba inteira (jogo + tipo) na ordem da vitrine, para "Organizar ordem"
 * (2026-09-24). Espelha `ProductsService.listForOrdering` no backend.
 */
export type OrderableProduct = {
  id: string;
  name: string;
  priceCents: number;
  imageUrl?: string | null;
  serverLabel?: string | null;
  /** Já tem posição manual. Os outros estão, por enquanto, em ordem A–Z. */
  ordered: boolean;
};

export type ProductOrdering =
  | { ok: true; items: OrderableProduct[]; truncated: boolean }
  | { ok: false };

export async function getProductOrdering(gameId: string, type: string): Promise<ProductOrdering> {
  const params = new URLSearchParams({ gameId, type });
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
