/**
 * BRINDE POR JOGO (2026-10-12, pedido do usuário): "ganhe 50Mi de Ouro a cada
 * R$ 50,00 em compras". O admin configura por jogo; o carrinho e o checkout
 * mostram; o pedido congela o que foi ganho para o atendente entregar.
 *
 * ⚠️ ARQUIVO ESPELHADO: `backend/src/common/pricing/gift.ts` e
 * `frontend/src/features/pricing/gift.ts` têm que ser IDÊNTICOS. No front ele
 * faz a PRÉVIA (carrinho e checkout); quem decide o brinde é o backend, com a
 * mesma função, sobre o valor que ELE calculou. Sem imports para a cópia
 * funcionar dos dois lados sem ajuste.
 *
 * ── A regra ────────────────────────────────────────────────────────────────
 *  - ACUMULA: a cada `everyCents` pagos no jogo, `amount` do brinde. R$ 160 com
 *    "50Mi a cada R$ 50" = 3 × 50Mi = 150Mi.
 *  - Base = o VALOR PAGO nos itens daquele jogo: preço cheio menos as Lets Coins
 *    que cada linha carregou (mesma base do cashback). Não há brinde sobre
 *    dinheiro que não entrou.
 *  - `maxAmount` opcional: teto POR COMPRA (por jogo, por carrinho).
 *
 * Dinheiro em CENTAVOS inteiros. Quantidade do brinde em unidades inteiras do
 * jogo (50.000.000 = 50Mi de ouro) — o rótulo diz o que é ("de Ouro").
 */

/** "A cada" mínimo: R$ 1,00. Abaixo disso a regra vira brinde por centavo. */
export const MIN_GIFT_EVERY_CENTS = 100;
/** "A cada" máximo: R$ 100.000,00 — o teto de um serviço. */
export const MAX_GIFT_EVERY_CENTS = 10_000_000;
/** Quantidade por passo: até 1 trilhão (gold de jogo chega a bilhões). */
export const MAX_GIFT_AMOUNT = 1_000_000_000_000;
/**
 * Teto absoluto do brinde de UMA compra: 1 quatrilhão. Existe para a conta
 * nunca sair dos inteiros exatos do `number` (9 quatrilhões), qualquer que
 * seja o carrinho.
 */
export const MAX_GIFT_TOTAL = 1_000_000_000_000_000;
/** Rótulo do brinde ("de Ouro", "Divine Orbs"). */
export const MAX_GIFT_LABEL = 40;

export type GiftRule = {
  everyCents: number;
  amount: number;
  label: string;
  /** Teto por compra. `null` = sem teto (só o `MAX_GIFT_TOTAL`). */
  maxAmount: number | null;
};

export type GiftResult = {
  /** Quanto do brinde a compra rende. 0 = ainda não chegou no primeiro passo. */
  amount: number;
  /** Quantos “a cada” couberam no valor pago. */
  steps: number;
  /** Bateu no teto: comprar mais não rende mais. */
  capped: boolean;
  /** Quanto falta pagar para o próximo passo (0 se `capped`). */
  missingCents: number;
};

function isInt(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

/**
 * O que está errado na regra, em português, ou `null`. Usada pelo painel (antes
 * de salvar) e pelo backend (antes de gravar) — a mesma régua dos dois lados.
 */
export function giftRuleProblem(rule: GiftRule): string | null {
  if (!isInt(rule.everyCents) || rule.everyCents < MIN_GIFT_EVERY_CENTS || rule.everyCents > MAX_GIFT_EVERY_CENTS) {
    return "O valor “a cada” precisa ficar entre R$ 1,00 e R$ 100.000,00.";
  }
  if (!isInt(rule.amount) || rule.amount < 1 || rule.amount > MAX_GIFT_AMOUNT) {
    return "A quantidade do brinde precisa ser um número inteiro entre 1 e 1 trilhão.";
  }
  const label = typeof rule.label === "string" ? rule.label.trim() : "";
  if (label.length === 0 || label.length > MAX_GIFT_LABEL) {
    return `Diga o que é o brinde (até ${MAX_GIFT_LABEL} caracteres), ex.: “de Ouro”.`;
  }
  if (rule.maxAmount !== null) {
    if (!isInt(rule.maxAmount) || rule.maxAmount < rule.amount || rule.maxAmount > MAX_GIFT_TOTAL) {
      return "O teto precisa ser pelo menos a quantidade de um brinde.";
    }
  }
  return null;
}

/** O brinde que `paidCents` pagos no jogo rendem pela regra. */
export function giftFor(rule: GiftRule, paidCents: number): GiftResult {
  const paid = Math.max(0, Math.floor(paidCents) || 0);
  const steps = Math.floor(paid / rule.everyCents);
  const ceiling = Math.min(rule.maxAmount ?? MAX_GIFT_TOTAL, MAX_GIFT_TOTAL);
  // Compara ANTES de multiplicar: `steps × amount` de um carrinho enorme
  // passaria dos inteiros exatos antes de o teto cortar.
  const amount = steps > Math.floor(ceiling / rule.amount) ? ceiling : Math.min(steps * rule.amount, ceiling);
  const capped = amount >= ceiling;
  return {
    amount,
    steps,
    capped,
    missingCents: capped ? 0 : rule.everyCents - (paid % rule.everyCents),
  };
}

/**
 * Reparte as Lets Coins do carrinho entre as linhas — a conta que define quanto
 * cada linha (e portanto cada jogo) PAGOU.
 *
 * Em ordem, enchendo cada linha até o valor dela antes de passar para a
 * seguinte. Não é proporcional de propósito: proporcional em inteiros sempre
 * sobra ou falta um centavo, e o resto teria que ser empurrado para alguma
 * linha por um critério que ninguém consegue conferir olhando o comprovante.
 *
 * Mora aqui (antes era privada do `orders.service`) porque o checkout precisa
 * da MESMA divisão para mostrar o brinde de cada jogo depois das coins.
 */
export function allocateCoins(lineCents: readonly number[], coins: number, coinCents: number) {
  let remaining = Math.max(0, Math.floor(coins) || 0);
  const unit = Math.max(1, Math.floor(coinCents) || 1);

  return lineCents.map((cents) => {
    if (remaining <= 0) return { coins: 0, cents: 0 };
    const fits = Math.min(remaining, Math.floor(Math.max(0, cents) / unit));
    remaining -= fits;
    return { coins: fits, cents: fits * unit };
  });
}
