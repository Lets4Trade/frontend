"use server";

import { COUPON_CODE_PATTERN, normalizeCouponCode, type CouponKind } from "@/features/pricing/coupon";
import { selectionSchema, type Selection } from "@/features/pricing/quote";
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
  /**
   * Só SERVIÇO: a escolha do configurador. O backend recalcula o preço com ela
   * (`quote`) — nenhum valor viaja daqui. Presente = `units` tem que ser 1.
   */
  selection?: Selection;
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
      reason: "unauthenticated" | "empty" | "invalid" | "error" | "coins" | "coupon";
      /** Só em `coupon`: o motivo que o backend escreveu ("Cupom inválido ou expirado."). */
      message?: string;
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

type CleanLine = { productId: string; units: number; selection?: Selection };

/**
 * As linhas que podem ir ao backend, ou o motivo de não irem. Server action é
 * endpoint público: nada do que chega é confiável.
 */
function cleanLines(lines: CheckoutLine[]): { ok: true; items: CleanLine[] } | { ok: false; reason: "empty" | "invalid" } {
  if (!Array.isArray(lines) || lines.length === 0) {
    return { ok: false, reason: "empty" };
  }
  if (lines.length > MAX_LINES) return { ok: false, reason: "invalid" };

  const items: CleanLine[] = [];

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

    // Escolha de serviço: validada no mesmo schema que o backend usa, e só o
    // que ele define segue (zod descarta chave desconhecida). Serviço é
    // sempre 1 unidade — o backend recusaria outra quantidade.
    if (line.selection !== undefined && line.selection !== null) {
      const parsed = selectionSchema.safeParse(line.selection);
      if (!parsed.success || units !== 1) return { ok: false, reason: "invalid" };
      items.push({ productId, units, selection: parsed.data });
      continue;
    }

    items.push({ productId, units });
  }
  return { ok: true, items };
}

export async function checkoutAction(
  lines: CheckoutLine[],
  coins = 0,
  giftProductIds: string[] = [],
  couponCode = "",
): Promise<CheckoutResult> {
  const cleaned = cleanLines(lines);
  if (!cleaned.ok) return { ok: false, reason: cleaned.reason };
  const { items } = cleaned;

  /**
   * As coins são um PEDIDO, não um valor.
   *
   * O que sai daqui limita para cima; quem decide é o backend, que lê o saldo
   * real, aplica o teto do carrinho e debita numa comparação-e-troca atômica.
   * Este `Math.max` só evita mandar lixo pela rede.
   */
  const requestedCoins = Math.max(0, Math.floor(Number(coins)) || 0);

  /**
   * Brinde do jogo (2026-10-12): onde entregar, quando o mesmo jogo vem de
   * dois servidores — o id de um produto DESTE carrinho por jogo. O backend
   * recusa id fora do carrinho; aqui só o formato e o teto, como nas linhas.
   */
  const cartIds = new Set(items.map((item) => item.productId));
  const giftChoices = Array.isArray(giftProductIds)
    ? giftProductIds.filter((id): id is string => typeof id === "string" && cartIds.has(id)).slice(0, MAX_LINES)
    : [];

  const result = await apiPost<{
    payment: { id: string; amountCents: number; status: string; expiresAt: string };
    references: string[];
    count: number;
    coinsSpent?: number;
    discountCents?: number;
  }>("/orders", {
    items,
    coins: requestedCoins,
    ...(giftChoices.length > 0 ? { giftProductIds: giftChoices } : {}),
    // Cupom (2026-10-12): só o código; valor e alcance são do backend.
    ...(COUPON_CODE_PATTERN.test(normalizeCouponCode(couponCode)) ? { couponCode: normalizeCouponCode(couponCode) } : {}),
  });

  if (!result.ok) {
    if (result.reason === "unauthenticated") {
      return { ok: false, reason: "unauthenticated" };
    }
    // O saldo pode ter mudado entre a tela e o envio (outra aba, outro
    // dispositivo). É o único erro deste fluxo que a pessoa consegue resolver
    // sozinha, então merece mensagem própria em vez do "erro" genérico.
    // Cupom recusado no fechamento (esgotou, venceu, mudou o carrinho): a
    // mensagem do backend é o que a pessoa precisa ler.
    if (result.status === 400 && result.message && /cupom/i.test(result.message)) {
      return { ok: false, reason: "coupon", message: result.message };
    }
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

// ─────────────────────────────── cupom ──────────────────────────────────────

/** A regra do cupom como o checkout precisa para refazer a conta localmente. */
export type AppliedCoupon = {
  code: string;
  kind: CouponKind;
  value: number;
  maxDiscountCents: number | null;
  minSubtotalCents: number | null;
  allowCoins: boolean;
  rewardsOnDiscounted: boolean;
  /** Produtos do carrinho que entram no desconto. */
  eligibleProductIds: string[];
};

export type CouponPreviewResult =
  | { ok: true; coupon: AppliedCoupon }
  | { ok: false; reason: "unauthenticated" | "invalid" | "error"; message?: string };

const COUPON_FAILED = "Não foi possível validar o cupom agora. Tente de novo.";

/**
 * Prévia do cupom (2026-10-12): `POST /orders/coupon-preview`. Nada é reservado
 * aqui — o uso é preso à cobrança no `checkoutAction`. A rota do backend tem
 * teto apertado por IP (10/min) contra adivinhação de código.
 */
export async function previewCouponAction(code: string, lines: CheckoutLine[]): Promise<CouponPreviewResult> {
  const normalized = normalizeCouponCode(code);
  if (!COUPON_CODE_PATTERN.test(normalized)) {
    return { ok: false, reason: "invalid", message: "Cupom inválido ou expirado." };
  }
  const cleaned = cleanLines(lines);
  if (!cleaned.ok) return { ok: false, reason: "invalid", message: "Seu carrinho está vazio." };

  const result = await apiPost<{
    code?: string;
    kind?: string;
    value?: number;
    maxDiscountCents?: number | null;
    minSubtotalCents?: number | null;
    allowCoins?: boolean;
    rewardsOnDiscounted?: boolean;
    eligibleProductIds?: string[];
  }>("/orders/coupon-preview", { code: normalized, items: cleaned.items });

  if (!result.ok) {
    if (result.reason === "unauthenticated") return { ok: false, reason: "unauthenticated" };
    if (result.status === 429) {
      return { ok: false, reason: "invalid", message: "Muitas tentativas. Espere um minuto e tente de novo." };
    }
    if (result.status === 400 && result.message) return { ok: false, reason: "invalid", message: result.message };
    return { ok: false, reason: "error", message: COUPON_FAILED };
  }

  const data = result.data;
  const kind = data.kind === "PERCENT" || data.kind === "FIXED" ? data.kind : null;
  if (!kind || !Number.isSafeInteger(data.value) || typeof data.code !== "string") {
    return { ok: false, reason: "error", message: COUPON_FAILED };
  }
  const int = (value: unknown) => (typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null);
  return {
    ok: true,
    coupon: {
      code: data.code,
      kind,
      value: data.value as number,
      maxDiscountCents: int(data.maxDiscountCents),
      minSubtotalCents: int(data.minSubtotalCents),
      // O backend apaga `false` da resposta: ausente = falso.
      allowCoins: data.allowCoins === true,
      rewardsOnDiscounted: data.rewardsOnDiscounted === true,
      eligibleProductIds: Array.isArray(data.eligibleProductIds)
        ? data.eligibleProductIds.filter((id): id is string => typeof id === "string")
        : [],
    },
  };
}
