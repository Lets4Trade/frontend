import Link from "next/link";
import { DeliveryProofsSection } from "@/features/admin/orders/DeliveryProofsSection";
import type { AdminDeliveryStatus } from "@/features/admin/orders/types";
import { OrderStatusTracker } from "@/features/orders/OrderStatusTracker";
import {
  OrderGiftList,
  OrderLineBlock,
  ServiceDetailsBlock,
  purchaseGifts,
} from "@/features/orders/OrderSummaryPieces";
import { cn } from "@/lib/cn";
import { ChatOrderStatus } from "./ChatOrderStatus";
import type { ChatOrder } from "./types";

/** O que o quadro precisa para EDITAR o pedido — lido uma vez pela página. */
export type ChatOrderControls = {
  /** Status de entrega personalizados, para o select de situação. */
  statuses: AdminDeliveryStatus[];
  /** Origem do backend — as imagens dos comprovantes saem de lá, com login. */
  apiOrigin: string;
};

/**
 * O pedido da conversa, ao lado do chat do painel (2026-10-20, pedido do
 * usuário: "não é prático pra bater o olho e ver o pedido").
 *
 * A MESMA ordem e as mesmas peças da tela do pedido do cliente: trilha, brinde
 * logo abaixo, e os itens em uma linha cada ("4x Produto / Servidor" e o
 * preço). Quem atende vê o que o cliente vê.
 *
 * Desde 2026-10-28 (pedido do usuário) dá para AGIR daqui também: mudar a
 * situação (a esteira) e enviar os comprovantes de entrega, com as mesmas
 * ações de "Vendas e pedidos". O resto do pedido continua só leitura.
 */
export function ChatOrderSummary({
  order,
  className,
  hideHeading = false,
  controls,
}: {
  order: ChatOrder;
  controls: ChatOrderControls;
  className?: string;
  /** Na faixa que abre e fecha, o resumo da própria faixa já diz pedido e situação. */
  hideHeading?: boolean;
}) {
  const { purchase, note } = order;
  const gifts = purchaseGifts(purchase.items);

  return (
    <div className={className}>
      {/* A pílula de situação saiu daqui (2026-10-28): é o select abaixo da trilha. */}
      <p className={cn("font-poppins text-[15px] font-semibold text-white", hideHeading && "hidden")}>
        Pedido {purchase.reference}
        <span className="font-normal text-white/55"> · {purchase.date}</span>
      </p>

      <div className={cn("flex justify-center", hideHeading ? "mt-[4px]" : "mt-[18px]")}>
        <OrderStatusTracker track={purchase.track} dates={purchase.stepDates} note={note} size="compact" />
      </div>

      {/* Mudar a esteira: logo abaixo dela, nas duas versões do quadro. */}
      <div className="mt-[14px] flex items-center justify-between gap-[12px]">
        <span className="font-poppins text-[13px] text-white/60">Alterar situação</span>
        <ChatOrderStatus order={order} statuses={controls.statuses} />
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

      <DeliveryProofsSection
        reference={purchase.reference}
        apiOrigin={controls.apiOrigin}
        className="mt-[22px]"
      />

      <Link
        href={`/admin/pedidos?busca=${encodeURIComponent(purchase.reference)}`}
        className="mt-[14px] inline-block font-poppins text-[13px] text-brand-orange hover:underline"
      >
        Abrir em Vendas e pedidos
      </Link>
    </div>
  );
}
