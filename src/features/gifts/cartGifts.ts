import { formatQuantity } from "@/features/game/configurator";
import { giftFor, MAX_GIFT_LABEL, MAX_GIFT_TOTAL, type GiftResult, type GiftRule } from "@/features/pricing/gift";
import { lineTotalCents } from "@/features/pricing/quote";

/**
 * Brinde POR SERVIDOR (2026-11-23; era por jogo desde 2026-10-12) — a parte
 * PURA do lado da loja: a regra como a API pública a entrega, e o que um
 * carrinho rende dela. Sem `serverApi` nem React: o carrinho (cliente), o
 * checkout (cliente) e a leitura (servidor) importam daqui.
 *
 * Cada servidor conta SEPARADO (pedido do usuário): o que foi comprado no
 * Softcore rende o brinde do Softcore, no Softcore. Servidor sem regra ligada
 * não rende nada — a loja só dá brinde nos servidores principais.
 *
 * O que aparece aqui é PRÉVIA. Quem concede o brinde é o backend no fechamento
 * do carrinho, com a mesma `giftFor` (arquivo espelhado) sobre o valor que ELE
 * calculou e a regra que estiver no banco naquele instante.
 */

/** Regra ligada de um servidor, como `GET /gifts` a devolve. */
export type PublicGift = GiftRule & {
  gameSlug: string;
  gameName: string;
  serverSlug: string;
  serverLabel: string;
};

/** Uma linha do carrinho, do ponto de vista do brinde. */
type GiftCartLine = {
  gameSlug: string;
  /** Rótulo do servidor (o carrinho sempre teve). */
  platform: string;
  /**
   * Slug do servidor (2026-11-23). Ausente em carrinho salvo antes dele: aí
   * casa pelo RÓTULO — que só falha se o jogo tiver dois servidores com o mesmo
   * nome (plataformas diferentes); nesse caso a linha fica sem prévia de brinde
   * e o backend, que sabe o servidor de cada produto, decide no fechamento.
   */
  serverSlug?: string;
  unitPriceCents: number;
  quantity: number;
};

/** O brinde de UM servidor do carrinho. */
export type CartGift = {
  /** Chave estável da linha do resumo: `jogo/servidor`. */
  key: string;
  gameSlug: string;
  gameName: string;
  serverLabel: string;
  rule: GiftRule;
  /** O que o carrinho paga neste servidor (cheio − coins, quando houver). */
  paidCents: number;
  result: GiftResult;
};

function int(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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
    const label = text(row.label);
    const serverSlug = text(row.serverSlug);
    if (
      typeof row.gameSlug !== "string" ||
      serverSlug === "" ||
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
      gameName: text(row.gameName) || row.gameSlug,
      serverSlug,
      serverLabel: text(row.serverLabel) || serverSlug,
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

/** A regra do servidor de uma linha: pelo slug; sem slug (carrinho antigo), pelo rótulo se for único. */
function ruleFor(item: GiftCartLine, rules: readonly PublicGift[]): PublicGift | undefined {
  const ofGame = rules.filter((rule) => rule.gameSlug === item.gameSlug);
  if (item.serverSlug) return ofGame.find((rule) => rule.serverSlug === item.serverSlug);
  const byLabel = ofGame.filter((rule) => rule.serverLabel === item.platform);
  return byLabel.length === 1 ? byLabel[0] : undefined;
}

/**
 * O brinde de cada servidor do carrinho que tem regra, na ordem em que os
 * servidores aparecem.
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
  const groups = new Map<string, { rule: PublicGift; paid: number }>();

  items.forEach((item, index) => {
    const rule = ruleFor(item, rules);
    if (!rule) return;
    const key = `${rule.gameSlug}/${rule.serverSlug}`;
    const line = Math.max(0, lineTotalCents(item.unitPriceCents, item.quantity) - (discountCents[index] ?? 0));
    const group = groups.get(key) ?? { rule, paid: 0 };
    group.paid += line;
    groups.set(key, group);
  });

  return [...groups.entries()].map(([key, { rule, paid }]) => ({
    key,
    gameSlug: rule.gameSlug,
    gameName: rule.gameName,
    serverLabel: rule.serverLabel,
    rule,
    paidCents: paid,
    result: giftFor(rule, paid),
  }));
}
