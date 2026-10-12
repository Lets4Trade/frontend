import { MAX_GIFT_LABEL, MAX_GIFT_TOTAL } from "@/features/pricing/gift";
import { formatGift } from "./cartGifts";

/**
 * O brinde CONGELADO num pedido (`Order.gift`, 2026-10-12) → o que a tela do
 * pedido e o painel de vendas mostram. JSON do banco: conferido campo a campo,
 * e formato inesperado vira "sem brinde" (nunca erro na página).
 */
export type OrderGift = {
  /** "150Mi de Ouro". */
  text: string;
  /** Servidor onde entregar. */
  server: string;
};

export function toOrderGift(raw: unknown): OrderGift | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as { amount?: unknown; label?: unknown; server?: unknown };
  const amount = value.amount;
  if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount <= 0 || amount > MAX_GIFT_TOTAL) {
    return null;
  }
  const label = typeof value.label === "string" ? value.label.trim().slice(0, MAX_GIFT_LABEL) : "";
  if (label === "") return null;
  const server = typeof value.server === "string" ? value.server.slice(0, 120) : "";
  return { text: formatGift(amount, label), server };
}
