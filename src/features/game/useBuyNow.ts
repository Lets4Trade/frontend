"use client";

import { useRouter } from "next/navigation";
import { useCart } from "@/features/cart/store";
import type { Quote } from "@/features/pricing/quote";
import { cartSummary } from "./configurator";
import type { ProductContext } from "./ProductCard";
import type { GameProduct } from "./types";

/**
 * "COMPRAR AGORA" dos layouts COTADOS (SERVICE, QUANTITY, PACKAGES): põe a
 * linha no carrinho COM a escolha (`selection`) e vai direto ao checkout.
 *
 * Um lugar só porque é aqui que mora a regra de segurança do fluxo: o carrinho
 * leva `selection` e o checkout manda produto + escolha — o backend refaz o
 * `quote` com o produto do banco. `unitPriceCents` é só a PRÉVIA para desenhar
 * o carrinho; nunca é o que se cobra.
 */
export function useBuyNow(context: ProductContext) {
  const router = useRouter();
  const addToCart = useCart((state) => state.add);
  const closeCart = useCart((state) => state.close);

  // `units`: quantas vezes a mesma escolha (2026-11-11, só preço fixo).
  // `maxUnits`: até quanto o carrinho deixa mudar a quantidade depois.
  // `checkout` false (2026-11-26, o botão do carrinho ao lado do COMPRAR
  // AGORA): só põe no carrinho — a gaveta abre sozinha (`add`) e a pessoa
  // continua na página.
  return (product: GameProduct, result: Quote, units = 1, maxUnits = 1, checkout = true) => {
    if (!result.ok) return;
    addToCart(
      {
        productId: product.id,
        gameSlug: context.gameSlug,
        name: product.name,
        image: product.image?.src,
        gameLogo: context.gameLogo,
        platform: product.serverLabel ?? context.platform,
        // Brinde POR SERVIDOR (2026-11-23): o carrinho precisa saber qual.
        ...(product.serverSlug ?? context.serverSlug ? { serverSlug: product.serverSlug ?? context.serverSlug } : {}),
        unitPriceCents: result.totalCents,
        selection: result.selection,
        // Quantidade no texto da página ("1Mi Gold"), 2026-11-26.
        summary: product.pricing ? cartSummary(product.pricing, result) : result.summary,
        hours: result.hours,
        // Gold: o carrinho muda a quantidade e refaz a prévia (2026-11-26).
        ...(product.pricing?.mode === "QUANTITY"
          ? { pricing: product.pricing, basePriceCents: product.priceCents }
          : {}),
        ...(maxUnits > 1 ? { maxUnits } : {}),
      },
      units,
    );
    if (!checkout) return;
    // "Comprar agora" vai direto ao checkout; a gaveta aberta por cima dele
    // seria um passo a mais.
    closeCart();
    router.push("/checkout");
  };
}
