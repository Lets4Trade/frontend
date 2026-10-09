import type { CartItem } from "./store";

/**
 * Quanto de cashback o carrinho rende (2026-10-09, pedido do usuário).
 *
 * MESMA conta do backend (`cashbackCoinsFor` em `loyalty.rules.ts`): por
 * PEDIDO — e cada linha do carrinho vira um pedido —, `floor(pago × bps /
 * 10.000)` em centavos, depois em coins pela cotação. Somar as linhas já
 * arredondadas é o que bate com o que vai ser creditado; arredondar o total
 * daria até 1 coin a mais por linha.
 *
 * É ESTIMATIVA: o crédito acontece na ENTREGA, com o nível que a conta tiver
 * naquele dia, e sobre o valor pago (Lets Coins usadas no checkout abatem).
 */
export function estimateCashback(
  items: readonly Pick<CartItem, "unitPriceCents" | "quantity">[],
  cashbackBps: number,
  coinCents = 1,
): { coins: number; cents: number } {
  if (cashbackBps <= 0 || coinCents <= 0) return { coins: 0, cents: 0 };
  let coins = 0;
  for (const item of items) {
    const line = item.unitPriceCents * item.quantity;
    if (line <= 0) continue;
    coins += Math.floor(Math.floor((line * cashbackBps) / 10_000) / coinCents);
  }
  return { coins, cents: coins * coinCents };
}

/** "1%", "1,5%" — o percentual de um nível em pontos-base. */
export function formatBps(bps: number): string {
  return `${(bps / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}
