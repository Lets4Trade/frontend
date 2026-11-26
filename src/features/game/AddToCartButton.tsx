"use client";

import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * O carrinho ao lado do "COMPRAR AGORA" (2026-11-26, pedido do usuário) nos
 * layouts cotados (Gold e serviço): o mesmo ícone do card do catálogo, na
 * altura do botão de compra (50px, redondo como ele). Põe a escolha no
 * carrinho e abre a gaveta, em vez de ir direto ao checkout.
 */
export function AddToCartButton({
  label,
  disabled,
  onClick,
  className,
}: {
  /** Texto para leitor de tela ("Adicionar Gold PoE 2 ao carrinho"). */
  label: string;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title="Adicionar ao carrinho"
      className={cn(
        "flex size-[50px] shrink-0 items-center justify-center rounded-full border border-[var(--brand-stroke-soft)] bg-[image:var(--brand-orange-gradient)] transition-opacity outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      <Image src="/icons/game/cart.svg" alt="" width={22} height={22} aria-hidden className="size-[22px]" />
    </button>
  );
}
