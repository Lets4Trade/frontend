"use client";

import Image from "next/image";
import { useState } from "react";
import { useCart } from "@/features/cart/store";
import { formatPrice } from "./content";
import { ProductCardShell } from "./ProductCardShell";
import type { GameProduct } from "./types";

/**
 * O que o carrinho precisa saber e o produto sozinho não diz: em que jogo ele
 * está e a arte desse jogo. Vem da página.
 *
 * `platform` é RESERVA, não a fonte: o produto já traz o rótulo do próprio
 * servidor, e é ele que vale. O do filtro só entra para o produto cadastrado
 * sem servidor — que existe, porque a coluna é opcional no banco.
 */
export type ProductContext = {
  gameSlug: string;
  /** Rótulo do servidor do filtro, para o produto que não tem um. */
  platform: string;
  gameLogo?: string;
};

/**
 * Card de produto (Figma 1374:1859) — 265×417.
 *
 * É client component por um motivo só: o contador de quantidade. O resto do
 * catálogo (filtro, ordenação, paginação) é servidor; só o que precisa de
 * estado por card vem para cá.
 *
 * A imagem é opcional de propósito. O arquivo desenha um retângulo #2f2f2f no
 * lugar dela — é espaço reservado, e é o que aparece enquanto o admin não sobe
 * a arte do produto.
 */
export function ProductCard({
  product,
  context,
}: {
  product: GameProduct;
  context: ProductContext;
}) {
  const [quantity, setQuantity] = useState(1);
  const addToCart = useCart((state) => state.add);

  return (
    <ProductCardShell
      name={product.name}
      price={formatPrice(product.priceCents)}
      image={product.image}
      actions={
        <div className="flex items-center gap-[15px] pl-[32px]">
        <StepButton
          label={`Diminuir a quantidade de ${product.name}`}
          onClick={() => setQuantity((value) => Math.max(1, value - 1))}
          disabled={quantity <= 1}
        >
          −
        </StepButton>

        <span
          aria-live="polite"
          className="w-[22px] text-center font-poppins text-[18px] leading-[27px] font-bold tracking-[0.36px] text-white"
        >
          {quantity}
        </span>

        <StepButton
          label={`Aumentar a quantidade de ${product.name}`}
          // Trava em 99: sem teto, um clique preso monta um pedido absurdo, e
          // o card não tem espaço para mostrar o número.
          onClick={() => setQuantity((value) => Math.min(99, value + 1))}
          disabled={quantity >= 99}
        >
          +
        </StepButton>

        <button
          type="button"
          onClick={() => {
            addToCart(
              {
                productId: product.id,
                gameSlug: context.gameSlug,
                name: product.name,
                image: product.image?.src,
                gameLogo: context.gameLogo,
                platform: product.serverLabel ?? context.platform,
                unitPriceCents: product.priceCents,
              },
              quantity,
            );
            // Volta para 1 depois de adicionar: o card não mostra o que já está
            // no carrinho, então manter "5" sugeriria que há cinco ali.
            setQuantity(1);
          }}
          className="flex size-[50px] items-center justify-center rounded-[8px] border border-white/15 bg-[image:var(--brand-orange-gradient)] transition-opacity hover:opacity-90"
        >
          <Image
            src="/icons/game/cart.svg"
            alt=""
            width={22}
            height={22}
            aria-hidden
            className="size-[22px]"
          />
          <span className="sr-only">
            Adicionar {quantity} × {product.name} ao carrinho
          </span>
        </button>
        </div>
      }
    />
  );
}

function StepButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-[50px] items-center justify-center rounded-[8px] border border-white/10 bg-[image:var(--brand-surface-fill)] font-poppins text-[18px] font-bold tracking-[0.18px] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
