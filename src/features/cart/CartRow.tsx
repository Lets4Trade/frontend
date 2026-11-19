"use client";

import Image from "next/image";
import { formatCents, formatHours, isServiceItem, maxQuantityOf, minQuantityOf, useCart, type CartItem } from "./store";
import { lineTotalCents } from "@/features/pricing/quote";
import { QuantityField } from "./QuantityField";

/**
 * Uma linha COMPACTA: miniatura 72px, nome (até 2 linhas), servidor e — no
 * serviço — o resumo da escolha; embaixo, contador e preço da linha.
 *
 * A mesma na gaveta do carrinho e no resumo do checkout (2026-10-12): mexer na
 * quantidade em qualquer um dos dois mexe no mesmo carrinho.
 */
export function CartRow({ item }: { item: CartItem }) {
  const setQuantity = useCart((state) => state.setQuantity);
  const remove = useCart((state) => state.remove);
  const service = isServiceItem(item);
  const max = maxQuantityOf(item);
  // Quantidade mínima (2026-11-17): com mínimo, o "−" trava nele (tirar a
  // linha é na lixeira); sem mínimo, segue o gesto antigo de zerar.
  const min = minQuantityOf(item);
  // Serviço com "Máximo de unidades por compra" também ganha contador (2026-11-11).
  const editable = !service || max > 1;

  return (
    <li className="flex gap-[14px] border-b border-white/[0.07] py-[14px] last:border-b-0">
      <div className="relative size-[72px] shrink-0 overflow-hidden rounded-[12px] border border-white/10 bg-[#161616]">
        {/* `eager`: a gaveta abre JÁ com as linhas na tela; o `lazy` padrão só
            pedia a arte depois da animação (relato de 2026-09-28). Sem arte, a
            logo do jogo. */}
        {item.image ? (
          <Image src={item.image} alt="" fill sizes="72px" loading="eager" className="object-contain p-[6px]" />
        ) : item.gameLogo ? (
          <Image src={item.gameLogo} alt="" fill sizes="72px" loading="eager" className="object-contain p-[10px] opacity-80" />
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-[8px]">
          <h3 className="line-clamp-2 min-w-0 flex-1 font-poppins text-[15px] leading-[20px] font-semibold text-white">
            {item.name}
          </h3>
          <button
            type="button"
            onClick={() => remove(item.id)}
            aria-label={`Remover ${item.name} do carrinho`}
            className="-mt-[2px] -mr-[6px] flex size-[28px] shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none"
          >
            <Image src="/icons/cart/trash.svg" alt="" width={16} height={16} aria-hidden className="size-[16px] opacity-80" />
          </button>
        </div>

        <p className="mt-[2px] truncate font-helvetica text-[12px] text-brand-fg-subtle">{item.platform}</p>
        {item.summary ? (
          <p className="truncate font-helvetica text-[12px] text-brand-fg-muted" title={item.summary}>
            {item.summary}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-[10px] pt-[8px]">
          {/* Serviço sem máximo de unidades: a quantidade é a da página. */}
          {!editable ? (
            <span className="font-helvetica text-[12px] text-white/60">
              {item.quantity > 1 ? `${item.quantity}× · ` : ""}
              {item.hours ? `~${formatHours(item.hours * item.quantity)} h` : "Serviço"}
            </span>
          ) : (
            <div className="flex items-center rounded-full border border-white/10 bg-white/[0.03]">
              <StepButton
                label={`Diminuir a quantidade de ${item.name}`}
                disabled={min > 1 && item.quantity <= min}
                title={min > 1 ? `Compra mínima: ${min.toLocaleString("pt-BR")} unidades` : undefined}
                onClick={() => setQuantity(item.id, item.quantity - 1)}
              >
                −
              </StepButton>
              {/* Digitável (2026-11-18): "10000000" sem clicar no + milhões de vezes. */}
              <QuantityField
                value={item.quantity}
                min={min}
                max={max}
                onChange={(quantity) => setQuantity(item.id, quantity)}
                label={`Quantidade de ${item.name}`}
                className="h-[32px] min-w-[26px] px-[2px] text-[14px]"
              />
              <StepButton
                label={`Aumentar a quantidade de ${item.name}`}
                disabled={item.quantity >= max}
                onClick={() => setQuantity(item.id, item.quantity + 1)}
              >
                +
              </StepButton>
              {service && item.hours ? (
                <span className="pr-[10px] pl-[2px] font-helvetica text-[12px] text-white/60">
                  ~{formatHours(item.hours * item.quantity)} h
                </span>
              ) : null}
            </div>
          )}

          {/* O preço da linha é o único texto em degradê — é o que a pessoa procura. */}
          <span
            className="bg-clip-text font-poppins text-[15px] font-semibold text-transparent"
            style={{ backgroundImage: "var(--brand-orange-gradient)" }}
          >
            {formatCents(lineTotalCents(item.unitPriceCents, item.quantity))}
          </span>
        </div>
      </div>
    </li>
  );
}

/**
 * O `-` some a linha quando chega a zero em vez de travar em 1: é o gesto que
 * a pessoa já está fazendo para se livrar do item.
 */
function StepButton({
  label,
  onClick,
  disabled,
  title,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={label}
      className="flex size-[32px] items-center justify-center rounded-full font-poppins text-[16px] font-bold text-white transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
