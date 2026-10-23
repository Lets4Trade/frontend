import Link from "next/link";
import { OrderStatusTracker } from "@/features/orders/OrderStatusTracker";
import {
  OrderGiftList,
  OrderLineBlock,
  ServiceDetailsBlock,
  purchaseGifts,
} from "@/features/orders/OrderSummaryPieces";
import { cn } from "@/lib/cn";
import type { ChatOrder } from "./types";

/**
 * O pedido da conversa, ao lado do chat do painel (2026-10-20, pedido do
 * usuário: "não é prático pra bater o olho e ver o pedido").
 *
 * A MESMA ordem e as mesmas peças da tela do pedido do cliente: trilha, brinde
 * logo abaixo, e os itens em uma linha cada ("4x Produto / Servidor" e o
 * preço). Quem atende vê o que o cliente vê — e mudar a situação continua sendo
 * em "Vendas e pedidos", pelo link do fim.
 */
export function ChatOrderSummary({
  order,
  className,
  hideHeading = false,
}: {
  order: ChatOrder;
  className?: string;
  /** Na faixa que abre e fecha, o resumo da própria faixa já diz pedido e situação. */
  hideHeading?: boolean;
}) {
  const { purchase, pill, note } = order;
  const gifts = purchaseGifts(purchase.items);

  return (
    <div className={className}>
      <div className={cn("flex flex-wrap items-center justify-between gap-[10px]", hideHeading && "hidden")}>
        <p className="font-poppins text-[15px] font-semibold text-white">
          Pedido {purchase.reference}
          <span className="font-normal text-white/55"> · {purchase.date}</span>
        </p>
        <span
          className={cn(
            "flex h-[24px] max-w-full min-w-[90px] items-center justify-center truncate rounded-[66px] border border-white/5 px-[12px] font-helvetica text-[13px]",
            pill.className,
          )}
        >
          {pill.label}
        </span>
      </div>

      <div className={cn("flex justify-center", hideHeading ? "mt-[4px]" : "mt-[18px]")}>
        <OrderStatusTracker track={purchase.track} dates={purchase.stepDates} note={note} size="compact" />
      </div>

      <OrderGiftList gifts={gifts} className="mt-[18px]" />

      <ul className={cn("divide-y divide-white/[0.07] border-y border-white/10", gifts.length > 0 ? "mt-[14px]" : "mt-[18px]")}>
        {purchase.items.map((item) => (
          <li key={item.id}>
            <OrderLineBlock
              line={{
                id: item.id,
                name: item.productName,
                platform: item.platform,
                quantity: item.quantity,
                path: item.path,
                price: item.price,
              }}
            />
            {item.details ? <ServiceDetailsBlock lines={item.details.lines} hours={item.details.hours} /> : null}
          </li>
        ))}
      </ul>

      <dl className="mt-[12px] flex flex-col gap-[4px]">
        {purchase.coupon ? (
          <div className="flex items-baseline justify-between gap-[10px]">
            <dt className="font-helvetica text-[13px] text-white/60">Cupom {purchase.coupon.code}</dt>
            <dd className="font-poppins text-[13px] text-[#4ade80]">− {purchase.coupon.amount}</dd>
          </div>
        ) : null}
        {purchase.discount ? (
          <div className="flex items-baseline justify-between gap-[10px]">
            <dt className="font-helvetica text-[13px] text-white/60">Desconto total</dt>
            <dd className="font-poppins text-[13px] text-white/80">− {purchase.discount}</dd>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between gap-[10px]">
          <dt className="font-helvetica text-[15px] font-bold text-white/85">Total pago</dt>
          <dd className="font-poppins text-[16px] font-semibold text-white">{purchase.paid}</dd>
        </div>
      </dl>

      <Link
        href={`/admin/pedidos?busca=${encodeURIComponent(purchase.reference)}`}
        className="mt-[14px] inline-block font-poppins text-[13px] text-brand-orange hover:underline"
      >
        Abrir em Vendas e pedidos
      </Link>
    </div>
  );
}
