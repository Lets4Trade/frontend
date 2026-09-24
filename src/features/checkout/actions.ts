"use server";

import { apiPost } from "@/lib/serverApi";

/**
 * Fechamento do carrinho.
 *
 * ── Onde o preço é decidido ────────────────────────────────────────────────
 * NO BANCO, desde 2026-09-10. O navegador manda o que escolheu — produto e
 * quantas unidades — e o backend lê nome, arte, servidor e valor do catálogo
 * (`ProductsService.findForCheckout`).
 *
 * Antes disso, esta função lia o preço do conteúdo semente do frontend e o
 * enviava junto do pedido. Era a única defesa possível enquanto o catálogo não
 * existia no banco, e fechava só o caminho normal: quem tivesse o cookie de
 * sessão e chamasse `POST /orders` direto ainda escolhia o valor. Agora não há
 * campo de preço no corpo para mentir.
 *
 * O que sobrou aqui é o que ainda cabe ao servidor do Next: recusar cedo o que
 * o backend recusaria de qualquer forma (carrinho vazio, grande demais,
 * quantidade fora da faixa) e traduzir o desfecho para a tela. Não é validação
 * duplicada por desconfiança — é não gastar uma ida ao backend para descobrir
 * que o carrinho está vazio.
 *
 * ── E a cobrança? ─────────────────────────────────────────────────────────
 * NÃO acontece aqui (2026-09-24). Este passo cria os pedidos e o `Payment` com o
 * valor a cobrar e o prazo de 30 minutos. A cobrança é o passo seguinte, do
 * NAVEGADOR direto à API (`features/payment/api.ts`), para o cartão não passar
 * por este servidor.
 */

export type CheckoutLine = {
  productId: string;
  units: number;
};

export type CheckoutResult =
  | {
      ok: true;
      /** O pagamento que cobre os pedidos. `PAID` = coberto inteiro por coins. */
      payment: { id: string; amountCents: number; status: string; expiresAt: string };
      count: number;
      references: string[];
      /** O que o servidor de fato aceitou debitar — pode ser menos do que o
       *  escolhido, se o carrinho mudou entre a escolha e o envio. */
      coinsSpent: number;
      discountCents: number;
    }
  | {
      ok: false;
      reason: "unauthenticated" | "empty" | "invalid" | "error" | "coins";
    };

/** O mesmo teto do `CreateOrdersDto`: mais de 50 linhas não é compra, é script. */
const MAX_LINES = 50;

/** O mesmo teto do carrinho e do DTO. */
const MAX_UNITS = 99;

/**
 * O mesmo teto do `CreateOrderItemDto`. Não descreve o formato do id — só
 * separa identificador de payload absurdo. Ver o comentário no DTO.
 */
const MAX_ID_LENGTH = 100;

export async function checkoutAction(
  lines: CheckoutLine[],
  coins = 0,
): Promise<CheckoutResult> {
  if (!Array.isArray(lines) || lines.length === 0) {
    return { ok: false, reason: "empty" };
  }
  if (lines.length > MAX_LINES) return { ok: false, reason: "invalid" };

  const items: { productId: string; units: number }[] = [];

  for (const line of lines) {
    const units = Math.floor(Number(line.units));
    if (!Number.isFinite(units) || units < 1 || units > MAX_UNITS) {
      return { ok: false, reason: "invalid" };
    }

    // O id é opaco para nós — quem o valida é o banco, na leitura do catálogo.
    // O que se confere aqui é só que ele é um texto plausível, para não mandar
    // um objeto ou uma string de 10KB pela rede.
    if (typeof line.productId !== "string") {
      return { ok: false, reason: "invalid" };
    }
    const productId = line.productId.trim();
    if (productId === "" || productId.length > MAX_ID_LENGTH) {
      return { ok: false, reason: "invalid" };
    }

    items.push({ productId, units });
  }

  /**
   * As coins são um PEDIDO, não um valor.
   *
   * O que sai daqui limita para cima; quem decide é o backend, que lê o saldo
   * real, aplica o teto do carrinho e debita numa comparação-e-troca atômica.
   * Este `Math.max` só evita mandar lixo pela rede.
   */
  const requestedCoins = Math.max(0, Math.floor(Number(coins)) || 0);

  const result = await apiPost<{
    payment: { id: string; amountCents: number; status: string; expiresAt: string };
    references: string[];
    count: number;
    coinsSpent?: number;
    discountCents?: number;
  }>("/orders", { items, coins: requestedCoins });

  if (!result.ok) {
    if (result.reason === "unauthenticated") {
      return { ok: false, reason: "unauthenticated" };
    }
    // O saldo pode ter mudado entre a tela e o envio (outra aba, outro
    // dispositivo). É o único erro deste fluxo que a pessoa consegue resolver
    // sozinha, então merece mensagem própria em vez do "erro" genérico.
    if (result.message?.includes("Lets Coins")) {
      return { ok: false, reason: "coins" };
    }
    return { ok: false, reason: "error" };
  }

  return {
    ok: true,
    payment: result.data.payment,
    count: result.data.count,
    references: result.data.references,
    coinsSpent: result.data.coinsSpent ?? 0,
    discountCents: result.data.discountCents ?? 0,
  };
}
