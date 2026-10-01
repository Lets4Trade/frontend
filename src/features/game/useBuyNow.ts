"use client";

import { useRouter } from "next/navigation";
import { useCart } from "@/features/cart/store";
import type { Quote } from "@/features/pricing/quote";
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

  return (product: GameProduct, result: Quote) => {
    if (!result.ok) return;
    addToCart(
      {
        productId: product.id,
        gameSlug: context.gameSlug,
        name: product.name,
        image: product.image?.src,
        gameLogo: context.gameLogo,
        platform: product.serverLabel ?? context.platform,
        unitPriceCents: result.totalCents,
        selection: result.selection,
        summary: result.summary,
        hours: result.hours,
      },
      1,
    );
    // "Comprar agora" vai direto ao checkout; a gaveta aberta por cima dele
    // seria um passo a mais.
    closeCart();
    router.push("/checkout");
  };
}
