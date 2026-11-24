"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/Button";
import { MAX_CART_QUANTITY, useCart } from "@/features/cart/store";
import { QuantityField } from "@/features/cart/QuantityField";
import { cn } from "@/lib/cn";
import { formatPrice } from "./content";
import { DiscountBadge, LabelBadge } from "./DiscountBadge";
import { DiscountedPrice, PriceHighlight } from "./DiscountedPrice";
import { ConsultButton, consultHref, consultMessage, ConsultPrice } from "./consult";
import { ProductCardShell } from "./ProductCardShell";
import type { GameProduct } from "./types";
import { lineTotalCents } from "@/features/pricing/quote";

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
  /** Slug do servidor do filtro — mesma reserva (brinde por servidor, 2026-11-23). */
  serverSlug?: string;
  gameLogo?: string;
  /**
   * "Consulte aqui" (2026-11-17): o que a mensagem do WhatsApp cita e o link
   * da loja (já montado por `getContacts`). Só o catálogo passa.
   */
  gameName?: string;
  /** Servidor do FILTRO — reserva para o produto sem servidor próprio. */
  serverLabel?: string;
  whatsappHref?: string;
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
  // Quantidade mínima (2026-11-17): o contador já começa nela e não desce dela.
  const min = Math.max(1, product.minUnits ?? 1);
  const [quantity, setQuantity] = useState(min);
  const addToCart = useCart((state) => state.add);
  const closeCart = useCart((state) => state.close);
  const router = useRouter();

  function add() {
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
        unitPriceCents: product.priceCents,
        ...(min > 1 ? { minUnits: min } : {}),
      },
      quantity,
    );
    // Volta para 1 depois de adicionar: o card não mostra o que já está
    // no carrinho, então manter "5" sugeriria que há cinco ali.
    setQuantity(min);
  }

  // "COMPRE AQUI" (2026-10-08): o mesmo que o carrinho, mas direto ao
  // checkout, como o "COMPRAR AGORA" dos outros layouts. A gaveta aberta por
  // cima do checkout seria um passo a mais.
  function buyNow() {
    add();
    closeCart();
    router.push("/checkout");
  }

  // Só risca quando o cheio é MAIOR que o cobrado: preço antigo sem
  // `listPriceCents` (ou igual) mostra só o selo, como antes.
  const hasDiscount =
    !!product.discountPercent && !!product.listPriceCents && product.listPriceCents > product.priceCents;

  // "Consulte aqui" (2026-11-17): sem preço, sem contador, sem carrinho — um
  // botão do WhatsApp com a mensagem pronta. Selo e descrição continuam.
  if (product.consultOnly) {
    const href = consultHref(
      context.whatsappHref,
      consultMessage({
        productName: product.name,
        gameName: context.gameName ?? context.platform,
        serverLabel: product.serverLabel ?? context.serverLabel,
      }),
    );
    return (
      <ProductCardShell
        name={product.name}
        nameBreak={product.nameBreak}
        nameEn={product.nameEn}
        price={<ConsultPrice />}
        image={product.image}
        badge={product.badgeText ? <LabelBadge text={product.badgeText} /> : undefined}
        hoverDescription={
          product.content && product.content.sections.length > 0
            ? { title: product.name, content: product.content }
            : undefined
        }
        // O botão do WhatsApp vai no LUGAR do COMPRE AQUI, no pé do card
        // (2026-11-22, pedido do usuário: ficava colado no preço e os dois
        // tipos de card saíam desalinhados). A fileira do contador fica vazia,
        // com a altura dela, para o card ter a mesma altura dos vizinhos.
        actions={<span aria-hidden className="block h-[36px] desk:h-[50px]" />}
        cta={
          // Mesma largura e altura do COMPRE AQUI (217 × 40), CENTRADO no card.
          <ConsultButton
            href={href}
            productName={product.name}
            className="h-[38px] desk:mx-auto desk:h-[40px] desk:w-[217px]"
          />
        }
      />
    );
  }

  return (
    <ProductCardShell
      name={product.name}
      nameBreak={product.nameBreak}
      nameEn={product.nameEn}
      // O preço acompanha o contador (2026-09-28, relato do usuário: "escolho 5
      // e o preço continua como se fosse 1"). Com mais de uma unidade, o total
      // vira o destaque e o unitário fica como referência — o mesmo número que
      // a linha do carrinho vai mostrar depois de adicionar.
      // O unitário completo cabe no leitor de tela (`title`/aria), não nos
      // 265px do card — "R$ 79.680,00 (5 × R$ 15.936,00)" estouraria a linha.
      price={
        // Com desconto (2026-11-02): o cheio riscado ao lado do novo, também no
        // total de várias unidades. Aí o "· N un." sai — o contador logo abaixo
        // já diz quantas, e a linha não comporta os três.
        hasDiscount ? (
          <DiscountedPrice
            listLabel={formatPrice(shownCents(product.listPriceCents!, quantity))}
            priceLabel={formatPrice(shownCents(product.priceCents, quantity))}
          />
        ) : quantity > 1 ? (
          <span title={`${quantity.toLocaleString("pt-BR")} × ${formatPrice(product.priceCents)}`}>
            <PriceHighlight>{formatPrice(shownCents(product.priceCents, quantity))}</PriceHighlight>
            {/* Número grande (digitado, 2026-11-18) não cabe ao lado do preço;
                o campo logo abaixo já mostra a quantidade. */}
            {quantity < 1000 ? (
              <span className="ml-[6px] text-[13px] font-medium text-white/60">· {quantity} un.</span>
            ) : null}
          </span>
        ) : (
          // Laranja também sem desconto (2026-11-04), no padrão do desconto.
          <PriceHighlight>{formatPrice(product.priceCents)}</PriceHighlight>
        )
      }
      image={product.image}
      // Desconto do pacote (2026-10-27): o selo; o preço acima já vem com ele
      // (e, desde 2026-11-02, com o cheio riscado ao lado).
      badge={
        product.discountPercent || product.badgeText ? (
          <>
            {/* Selo livre ("Novo", "Em alta"…) à esquerda, 2026-11-04. */}
            {product.badgeText ? <LabelBadge text={product.badgeText} /> : null}
            {product.discountPercent ? (
              <DiscountBadge
                percent={product.discountPercent}
                title={
                  product.listPriceCents
                    ? `De ${formatPrice(product.listPriceCents)} por ${formatPrice(product.priceCents)}`
                    : undefined
                }
              />
            ) : null}
          </>
        ) : undefined
      }
      // Só com descrição escrita no painel (2026-10-20); sem ela, nada no hover.
      hoverDescription={
        product.content && product.content.sections.length > 0
          ? { title: product.name, content: product.content }
          : undefined
      }
      actions={
        // Quantidade DIGITÁVEL (2026-11-18, pedido do usuário: "10000000" no
        // card): − campo + numa caixa só, e o carrinho ao lado. A caixa ocupa
        // o que sobra da fileira — no desktop a mesma largura do botão de
        // baixo (32px → 249px) — e a letra encolhe só com número grande.
        <div className="flex items-center gap-[6px] desk:mx-auto desk:w-[217px] desk:gap-[10px]">
        <div className="flex h-[36px] min-w-0 flex-1 items-center rounded-[8px] border border-white/10 bg-[image:var(--brand-surface-fill)] desk:h-[50px]">
          <StepButton
            label={`Diminuir a quantidade de ${product.name}`}
            onClick={() => setQuantity((value) => Math.max(min, value - 1))}
            disabled={quantity <= min}
          >
            −
          </StepButton>
          <div className="relative h-full min-w-0 flex-1 overflow-hidden">
            <QuantityField
              fit
              value={quantity}
              min={min}
              // Sem limite de negócio (2026-10-12: era 99); só o teto técnico.
              max={MAX_CART_QUANTITY}
              onChange={setQuantity}
              label={`Quantidade de ${product.name}`}
              className="leading-none tracking-[0.2px] text-[16px] desk:text-[18px]"
            />
          </div>
          <StepButton
            label={`Aumentar a quantidade de ${product.name}`}
            onClick={() => setQuantity((value) => Math.min(MAX_CART_QUANTITY, value + 1))}
            disabled={quantity >= MAX_CART_QUANTITY}
          >
            +
          </StepButton>
        </div>

        <button
          type="button"
          onClick={add}
          className="flex size-[36px] shrink-0 items-center justify-center rounded-[8px] border border-white/15 bg-[image:var(--brand-orange-gradient)] transition-opacity hover:opacity-90 desk:size-[50px]"
        >
          <Image
            src="/icons/game/cart.svg"
            alt=""
            width={22}
            height={22}
            aria-hidden
            className="size-[18px] desk:size-[22px]"
          />
          <span className="sr-only">
            Adicionar {quantity} × {product.name} ao carrinho
          </span>
        </button>
        </div>
      }
      cta={
        // Mesma largura da fileira de cima, CENTRADO (2026-11-23, pedido do
        // usuário: com 32px à esquerda e 16px à direita tudo pendia para a direita).
        <button
          type="button"
          onClick={buyNow}
          aria-label={`Comprar ${quantity} × ${product.name} agora`}
          className={cn(buttonVariants({ variant: "primary" }), "h-[38px] w-full px-0 text-[13px] desk:mx-auto desk:flex desk:h-[40px] desk:w-[217px] desk:text-[16px]")}
        >
          COMPRE AQUI
        </button>
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
      className="flex h-full w-[30px] shrink-0 items-center justify-center rounded-[7px] font-poppins text-[16px] font-bold tracking-[0.18px] text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent desk:w-[36px] desk:text-[18px]"
    >
      {children}
    </button>
  );
}

/**
 * O preço que o card mostra: 1 unidade = o unitário como está (pode ter fração
 * de centavo, "R$ 0,035"); várias = o total que será cobrado, arredondado para
 * baixo no centavo (2026-11-09, `lineTotalCents`).
 */
function shownCents(unitCents: number, quantity: number): number {
  return quantity > 1 ? lineTotalCents(unitCents, quantity) : unitCents;
}
