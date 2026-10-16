import type { Metadata } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { CheckoutShell } from "@/features/checkout/CheckoutShell";
import {
  CheckoutSidePanel,
  PanelReferencesRow,
} from "@/features/checkout/CheckoutPanel";
import { OrderChat } from "@/features/orders/OrderChat";
import { getAccountProfile } from "@/features/account/profile";
import { getOrderConversation, getPurchaseDetail } from "@/features/orders/orderDetail";
import { OrdersLiveRefresh } from "@/features/orders/OrdersLiveRefresh";
import { OrderStatusTracker } from "@/features/orders/OrderStatusTracker";
import { ORDER_STATUS_STYLES, type Order } from "@/features/orders/types";
import {
  OrderLineBlock,
  ServiceDetailsBlock,
  SummaryRow,
  TotalsBlock,
} from "@/features/orders/OrderSummaryPieces";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Pedido | Lets4Trade",
  description: "Acompanhe seu pedido na Lets4Trade.",
  // Conteúdo de conta: nada a indexar.
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ reference: string }> };

/**
 * Acompanhamento do pedido — Figma nó 2569:1682 ("VENDAS E PEDIDOS").
 *
 * COMO ELA SE ENCAIXA NO FLUXO: é a tela do pedido depois de fechado. Chega-se
 * a ela pelo botão "Chat" do cartão em "Meus Pedidos", e a rota é a referência
 * do pedido — o mesmo código que o cliente cita no suporte. Essa leitura vem do
 * próprio desenho: a mesma moldura do checkout, mas com a trilha de progresso
 * no lugar do formulário de pagamento, e uma conversa sobre a compra à
 * esquerda. Se o fluxo pretendido for outro, o que muda é de onde se linka.
 *
 * O que é REAL: a COMPRA inteira que contém o pedido da URL (2026-10-15) —
 * todos os itens do mesmo carrinho, cada um com a própria situação e trilha,
 * e o total da compra —, de `GET /orders/:reference/purchase`. A trilha anda
 * sozinha quando a situação muda (`OrdersLiveRefresh`). A conversa é UMA por
 * compra: qualquer item da compra abre a mesma.
 *
 * A CONVERSA é real e em tempo real por SOCKET (ver `OrderChat`): o histórico
 * vem pronto daqui, do servidor, e o socket cuida do que acontece dali em
 * diante. O que ainda não existe é o comprovante.
 */
export default async function PedidoPage({ params }: PageProps) {
  const { reference } = await params;

  const [result, chat, profile] = await Promise.all([
    getPurchaseDetail(reference),
    getOrderConversation(reference),
    getAccountProfile(),
  ]);

  if (!result.ok) {
    if (result.reason === "unauthenticated") {
      redirect(`/login?redirect=/conta/pedidos/${encodeURIComponent(reference)}`);
    }
    // "Não existe" e "não é seu" caem no mesmo 404, de propósito — ver o
    // comentário de `getOrderDetail`.
    if (result.reason === "notfound") notFound();
  }

  const purchase = result.ok ? result.purchase : null;
  const single = purchase?.items.length === 1;
  const only = single ? purchase.items[0] : null;

  return (
    <CheckoutShell>
      <OrdersLiveRefresh />
      <div className="flex flex-col lg:min-h-[1080px] lg:flex-row">
        {/* Coluna do chat: 555px, começando em y=192 como no arquivo. */}
        <div className="flex flex-1 justify-center px-[16px] pt-[28px] pb-[40px] lg:px-[50px] lg:pt-[192px] lg:pb-[60px]">
          <OrderChat
            reference={purchase?.reference ?? reference}
            subject={
              purchase && !single
                ? `Compra ${purchase.reference} (${purchase.items.length} itens)`
                : undefined
            }
            initialConversationId={chat.conversation?.id ?? null}
            initialMessages={chat.messages}
            userAvatar={profile.ok ? profile.profile.avatar : undefined}
          />
        </div>

        {/* No celular o andamento e o resumo vêm antes do chat. */}
        <CheckoutSidePanel mobileFirst>
          <PanelReferencesRow />

          {purchase ? (
            <>
              {/* Compra de UM item: a trilha grande no topo, como no arquivo.
                  Com vários, cada item leva a sua (compacta) logo abaixo dele. */}
              {only ? (
                <>
                  <div className="mt-[49px] hidden justify-center lg:flex">
                    <OrderStatusTracker track={only.track} dates={only.stepDates} size="page" />
                  </div>
                  {/* A trilha de 575px não cabe no celular: versão compacta. */}
                  <div className="mt-[32px] flex justify-center lg:hidden">
                    <OrderStatusTracker track={only.track} dates={only.stepDates} size="compact" />
                  </div>
                </>
              ) : null}

              <h2 className="mt-[50px] font-poppins text-[22px] leading-[28px] font-semibold tracking-[-0.44px] text-white">
                {single ? "Ordem" : `Ordem · ${purchase.items.length} itens`}
              </h2>
              <div aria-hidden className="mt-[15px] h-px w-full bg-white/25" />

              {purchase.items.map((item, index) => (
                <PurchaseItem
                  key={item.id}
                  item={item}
                  withTracker={!single}
                  highlighted={!single && item.reference === reference}
                  divider={index > 0}
                />
              ))}

              {purchase.coupon ? (
                <p className="mt-[22px] font-helvetica text-[14px] text-brand-fg-muted">
                  Cupom <strong className="font-bold text-white">{purchase.coupon.code}</strong> · − {purchase.coupon.amount}
                </p>
              ) : null}

              <div aria-hidden className="mt-[26px] h-px w-full bg-white/25" />

              {/* Totais da COMPRA: soma dos itens, desconto (coins + cupom) de
                  todos eles e o que foi pago — o mesmo valor da cobrança. */}
              <TotalsBlock
                price={purchase.price}
                discount={purchase.discount ?? "R$ 0,00"}
                total={purchase.paid}
              />

              {/* O comprovante ainda não existe. O botão fica desabilitado em
                  vez de levar a uma página em branco. */}
              <button
                type="button"
                disabled
                className="brand-ring mt-[40px] flex h-[60px] w-full lg:mt-[60px] items-center gap-[25px] rounded-full bg-[image:var(--brand-surface-fill)] px-[25px] text-left transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Image
                  src="/icons/order/bill.svg"
                  alt=""
                  width={22}
                  height={22}
                  aria-hidden
                  className="size-[22px] shrink-0"
                />
                <span className="flex-1 font-poppins text-[16px] font-bold tracking-[0.16px] text-white">
                  VER COMPROVANTE
                </span>
                <Image
                  src="/icons/order/arrow.svg"
                  alt=""
                  width={18}
                  height={18}
                  aria-hidden
                  className="size-[18px] shrink-0 -rotate-90"
                />
              </button>
            </>
          ) : (
            <p className="mt-[60px] font-helvetica text-[16px] text-brand-fg-muted">
              Não conseguimos carregar esta compra agora. Tente novamente em
              instantes.
            </p>
          )}
        </CheckoutSidePanel>
      </div>
    </CheckoutShell>
  );
}

/**
 * Um item da compra no painel "Ordem": produto, servidor, quantidade e preço;
 * a conta do serviço e o brinde quando houver. Em compra com vários itens,
 * também a referência, a situação e a trilha do item — cada um é entregue no
 * seu tempo. O item da URL (o que a pessoa clicou) ganha um realce discreto.
 */
function PurchaseItem({
  item,
  withTracker,
  highlighted,
  divider,
}: {
  item: Order;
  withTracker: boolean;
  highlighted: boolean;
  divider: boolean;
}) {
  const status = ORDER_STATUS_STYLES[item.status];
  return (
    <section
      aria-label={`${item.productName} — ${status.label}`}
      className={cn(
        divider && "mt-[26px] border-t border-white/10",
        highlighted && "-mx-[16px] rounded-[20px] bg-white/[0.03] px-[16px] pb-[16px]",
      )}
    >
      <OrderLineBlock
        line={{
          id: item.id,
          name: item.productName,
          platform: item.platform,
          quantity: item.quantity,
          price: item.price,
          date: item.date,
        }}
      />

      {withTracker ? <SummaryRow label="Pedido" value={item.reference} /> : null}

      {item.details ? (
        <ServiceDetailsBlock lines={item.details.lines} hours={item.details.hours} />
      ) : null}

      {/* Brinde do jogo (2026-10-12): vai junto na entrega deste item. */}
      {item.gift ? (
        <p className="mt-[22px] rounded-[15px] border border-[#22c55e]/35 bg-[#22c55e]/10 px-[18px] py-[12px] font-helvetica text-[15px] leading-[21px] text-white">
          <strong className="font-bold text-[#4ade80]">Brinde: {item.gift.text}</strong>
          {item.gift.server ? <span className="text-white/70"> · entregue em {item.gift.server}</span> : null}
        </p>
      ) : null}

      {withTracker ? (
        <div className="mt-[22px] flex flex-col items-center gap-[16px]">
          <span
            className={cn(
              "flex h-[24px] min-w-[100px] items-center justify-center self-start rounded-[66px] border border-white/5 px-[12px] font-helvetica text-[14px] tracking-[0.14px]",
              status.className,
            )}
          >
            {status.label}
          </span>
          <OrderStatusTracker track={item.track} dates={item.stepDates} size="compact" />
        </div>
      ) : null}
    </section>
  );
}
