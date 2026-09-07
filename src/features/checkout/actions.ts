"use server";

import { getGamePage } from "@/features/game/content";
import { apiPost } from "@/lib/serverApi";

/**
 * Fechamento do carrinho.
 *
 * O NAVEGADOR NÃO MANDA PREÇO. Ele manda o que escolheu — jogo, produto,
 * servidor e quantidade — e o preço é lido AQUI, no servidor, da mesma fonte que
 * renderiza a vitrine (`getGamePage`). É a única defesa possível hoje contra
 * fechar um carrinho de R$ 500,00 por um centavo: o catálogo ainda não existe no
 * banco, então o backend não tem contra o que conferir.
 *
 * Quando houver `Product` no backend, esta função encolhe: manda os ids e o
 * preço é lido lá. O contrato com o cliente não muda.
 *
 * ⚠️ NÃO EXISTE COBRANÇA neste caminho. Nenhum dado de cartão passa por aqui —
 * nem por este servidor, nem pelo backend (ver `CheckoutForm`). O pedido nasce
 * PENDENTE e é fechado no WhatsApp, que é como a loja opera hoje.
 */

export type CheckoutLine = {
  gameSlug: string;
  productId: string;
  /** Rótulo do servidor escolhido, para congelar no pedido. */
  platform: string;
  units: number;
};

export type CheckoutResult =
  | { ok: true; count: number; references: string[] }
  | { ok: false; reason: "unauthenticated" | "empty" | "invalid" | "error" };

export async function checkoutAction(
  lines: CheckoutLine[],
): Promise<CheckoutResult> {
  if (!Array.isArray(lines) || lines.length === 0) {
    return { ok: false, reason: "empty" };
  }
  if (lines.length > 50) return { ok: false, reason: "invalid" };

  const items: {
    productName: string;
    productImageUrl?: string;
    platform: string;
    quantity: string;
    unitPriceCents: number;
    units: number;
  }[] = [];

  // O conteúdo de cada jogo é lido UMA vez, não uma por linha: um carrinho com
  // dez itens do mesmo jogo faria dez leituras idênticas.
  const pages = new Map<string, Awaited<ReturnType<typeof getGamePage>>>();

  for (const line of lines) {
    const units = Math.floor(Number(line.units));
    if (!Number.isFinite(units) || units < 1 || units > 99) {
      return { ok: false, reason: "invalid" };
    }

    if (!pages.has(line.gameSlug)) {
      pages.set(line.gameSlug, await getGamePage(line.gameSlug));
    }
    const page = pages.get(line.gameSlug);
    if (!page) return { ok: false, reason: "invalid" };

    const product = page.catalog.products.find((item) => item.id === line.productId);
    if (!product) return { ok: false, reason: "invalid" };

    // O rótulo do servidor também é conferido contra o conteúdo: aceitar o
    // texto do cliente deixaria escrever qualquer coisa no histórico do pedido.
    const server = page.servers.items.find(
      (item) => item.id === product.serverId && item.label === line.platform,
    );
    if (!server) return { ok: false, reason: "invalid" };

    items.push({
      productName: product.name,
      productImageUrl: product.image?.src,
      platform: server.label,
      // O catálogo semente não tem unidade por produto; o que a tela mostra
      // como "Quantidade" é o número de unidades compradas.
      quantity: `${units}x`,
      unitPriceCents: product.priceCents,
      units,
    });
  }

  const result = await apiPost<{ references: string[]; count: number }>(
    "/orders",
    { items },
  );

  if (!result.ok) {
    return {
      ok: false,
      reason: result.reason === "unauthenticated" ? "unauthenticated" : "error",
    };
  }

  return {
    ok: true,
    count: result.data.count,
    references: result.data.references,
  };
}
