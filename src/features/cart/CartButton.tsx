"use client";

import Image from "next/image";
import type { LoyaltyTierRule } from "@/features/loyalty/data";
import { CartDrawer } from "./CartDrawer";
import { itemCount, useCart, useCartHydrated } from "./store";

/**
 * Botão do carrinho no cabeçalho (Figma 1946:1074) — abre a gaveta.
 *
 * A gaveta é montada AQUI, e não no layout, porque ela e o botão compartilham o
 * mesmo estado e nada mais na página precisa dele. O `vaul` renderiza em portal,
 * então a posição no DOM não afeta o desenho.
 *
 * O contador só aparece depois da hidratação: o servidor não sabe o que há no
 * `localStorage` do visitante, e pintar o número na primeira renderização do
 * cliente acusaria divergência. Ver `useCartHydrated`.
 */
export function CartButton({ tiers }: { tiers: LoyaltyTierRule[] }) {
  const items = useCart((state) => state.items);
  const open = useCart((state) => state.open);
  const hydrated = useCartHydrated();

  const count = hydrated ? itemCount(items) : 0;

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={
          count > 0 ? `Carrinho com ${count} ${count === 1 ? "item" : "itens"}` : "Carrinho"
        }
        className="relative shrink-0 rounded-full transition-opacity hover:opacity-80"
      >
        {/* O asset exportado (nó 1946:1074) já É o botão inteiro: 50×50 com o
            círculo de borda e gradiente embutidos no SVG. Envolver numa borda
            própria duplicaria o contorno e encolheria o glifo. */}
        <Image
          src="/icons/cart.svg"
          alt=""
          width={50}
          height={50}
          aria-hidden
          className="size-[42px] md:size-[50px]"
        />

        {count > 0 ? (
          <span
            aria-hidden
            className="absolute -top-[2px] -right-[2px] flex min-w-[20px] items-center justify-center rounded-full border border-brand-bg bg-[image:var(--brand-orange-gradient)] px-[5px] font-poppins text-[11px] leading-[18px] font-bold text-black"
          >
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>

      <CartDrawer tiers={tiers} />
    </>
  );
}
