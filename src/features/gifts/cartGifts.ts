import { formatQuantity } from "@/features/game/configurator";
import { giftFor, MAX_GIFT_LABEL, MAX_GIFT_TOTAL, type GiftResult, type GiftRule } from "@/features/pricing/gift";

/**
 * Brinde por jogo (2026-10-12) — a parte PURA do lado da loja: a regra como a
 * API pública a entrega, e o que um carrinho rende dela. Sem `serverApi` nem
 * React: o carrinho (cliente), o checkout (cliente) e a leitura (servidor)
 * importam daqui.
 *
 * O que aparece aqui é PRÉVIA. Quem concede o brinde é o backend no fechamento
 * do carrinho, com a mesma `giftFor` (arquivo espelhado) sobre o valor que ELE
 * calculou e a regra que estiver no banco naquele instante.
 */

/** Regra ligada de um jogo, como `GET /gifts` a devolve. */
export type PublicGift = GiftRule & { gameSlug: string; gameName: string };

/** Uma linha do carrinho, do ponto de vista do brinde. */
type GiftCartLine = {
  productId: string;
  gameSlug: string;
  platform: string;
  unitPriceCents: number;
  quantity: number;
};

/** O brinde de UM jogo do carrinho. */
export type CartGift = {
  gameSlug: string;
  gameName: string;
  rule: GiftRule;
  /** O que o carrinho paga neste jogo (cheio − coins, quando houver). */
  paidCents: number;
  result: GiftResult;
  /**
   * Servidores do jogo no carrinho, na ordem em que aparecem — um por rótulo,
   * com o id do 1º produto dele (é o que o checkout manda como escolha). Mais
   * de um = o checkout pergunta onde entregar.
   */
  servers: { productId: string; label: string }[];
};

function int(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

/**
 * Resposta da API → regras. Item malformado é DESCARTADO, não consertado: um
 * brinde mostrado errado é promessa que a loja não vai cumprir.
 */
export function parseGifts(raw: unknown): PublicGift[] {
  if (!Array.isArray(raw)) return [];
  const gifts: PublicGift[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const everyCents = int(row.everyCents);
    const amount = int(row.amount);
    // O backend apaga campo nulo da resposta: teto ausente = sem teto.
    const maxAmount = row.maxAmount === undefined || row.maxAmount === null ? null : int(row.maxAmount);
    const label = typeof row.label === "string" ? row.label.trim() : "";
    if (
      typeof row.gameSlug !== "string" ||
      everyCents === null ||
      everyCents <= 0 ||
      amount === null ||
      amount <= 0 ||
      (maxAmount !== null && (maxAmount < amount || maxAmount > MAX_GIFT_TOTAL)) ||
      (row.maxAmount !== undefined && row.maxAmount !== null && maxAmount === null) ||
      label === "" ||
      label.length > MAX_GIFT_LABEL
    ) {
      continue;
    }
    gifts.push({
      gameSlug: row.gameSlug,
      gameName: typeof row.gameName === "string" ? row.gameName : row.gameSlug,
      everyCents,
      amount,
      label,
      maxAmount,
    });
  }
  return gifts;
}

/** "150Mi de Ouro" — quantidade abreviada como na aba Gold + o rótulo do admin. */
export function formatGift(amount: number, label: string): string {
  return `${formatQuantity(amount)} ${label}`.trim();
}

/**
 * O brinde de cada jogo do carrinho que tem regra, na ordem em que os jogos
 * aparecem.
 *
 * `discountCents[i]` = o desconto em coins da linha `i` (o checkout reparte com
 * `allocateCoins`, a mesma divisão do backend). Ausente = sem coins (carrinho).
 */
export function cartGifts(
  items: readonly GiftCartLine[],
  rules: readonly PublicGift[],
  discountCents: readonly number[] = [],
): CartGift[] {
  if (rules.length === 0 || items.length === 0) return [];
  const bySlug = new Map(rules.map((rule) => [rule.gameSlug, rule]));
  const groups = new Map<string, { rule: PublicGift; paid: number; servers: CartGift["servers"] }>();

  items.forEach((item, index) => {
    const rule = bySlug.get(item.gameSlug);
    if (!rule) return;
    const line = Math.max(0, item.unitPriceCents * item.quantity - (discountCents[index] ?? 0));
    const group = groups.get(item.gameSlug) ?? { rule, paid: 0, servers: [] };
    group.paid += line;
    if (!group.servers.some((server) => server.label === item.platform)) {
      group.servers.push({ productId: item.productId, label: item.platform });
    }
    groups.set(item.gameSlug, group);
  });

  return [...groups.values()].map(({ rule, paid, servers }) => ({
    gameSlug: rule.gameSlug,
    gameName: rule.gameName,
    rule,
    paidCents: paid,
    result: giftFor(rule, paid),
    servers,
  }));
}
