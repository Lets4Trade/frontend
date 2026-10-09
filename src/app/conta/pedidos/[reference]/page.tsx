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
import { getOrderConversation, getOrderDetail } from "@/features/orders/orderDetail";
import { OrderStatusTracker } from "@/features/orders/OrderStatusTracker";
import {
  OrderLineBlock,
  ServiceDetailsBlock,
  TotalsBlock,
} from "@/features/orders/OrderSummaryPieces";

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
 * O que é REAL: produto, servidor, quantidade, preços e a etapa da trilha, tudo
 * de `GET /orders/:reference`.
 *
 * A CONVERSA é real e em tempo real por SOCKET (ver `OrderChat`): o histórico
 * vem pronto daqui, do servidor, e o socket cuida do que acontece dali em
 * diante. O que ainda não existe é o comprovante.
 */
export default async function PedidoPage({ params }: PageProps) {
  const { reference } = await params;

  const [result, chat, profile] = await Promise.all([
    getOrderDetail(reference),
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

  const order = result.ok ? result.order : null;

  return (
    <CheckoutShell>
      <div className="flex flex-col lg:min-h-[1080px] lg:flex-row">
        {/* Coluna do chat: 555px, começando em y=192 como no arquivo. */}
        <div className="flex flex-1 justify-center px-[16px] pt-[28px] pb-[40px] lg:px-[50px] lg:pt-[192px] lg:pb-[60px]">
          <OrderChat
            reference={reference}
            initialConversationId={chat.conversation?.id ?? null}
            initialMessages={chat.messages}
            userAvatar={profile.ok ? profile.profile.avatar : undefined}
          />
        </div>

        {/* No celular o andamento e o resumo vêm antes do chat. */}
        <CheckoutSidePanel mobileFirst>
          <PanelReferencesRow />

          {order ? (
            <>
              {/* A trilha fica CENTRADA na coluna de 641: ela tem 575 no
                  arquivo, e as sobras de 33 de cada lado são o que a centra. */}
              <div className="mt-[49px] hidden justify-center lg:flex">
                <OrderStatusTracker currentStep={order.currentStep} size="page" />
              </div>
              {/* A trilha de 575px não cabe no celular: versão compacta. */}
              <div className="mt-[32px] flex justify-center lg:hidden">
                <OrderStatusTracker currentStep={order.currentStep} size="compact" />
              </div>

              <h2 className="mt-[50px] font-poppins text-[22px] leading-[28px] font-semibold tracking-[-0.44px] text-white">
                Ordem
              </h2>
              <div aria-hidden className="mt-[15px] h-px w-full bg-white/25" />

              <OrderLineBlock
                line={{
                  id: order.id,
                  name: order.productName,
                  platform: order.platform,
                  quantity: order.quantity,
                  price: order.price,
                  date: order.date,
                }}
              />

              {order.details ? (
                <ServiceDetailsBlock lines={order.details.lines} hours={order.details.hours} />
              ) : null}

              <div aria-hidden className="mt-[26px] h-px w-full bg-white/25" />

              {/* Um pedido tem um produto, então o preço da linha É o subtotal.
                  O desconto é o que as Lets Coins abateram DESTA linha — gravado
                  no próprio pedido desde 2026-09-10 (`Order.discountCents`).
                  Antes disso era sempre "R$ 0,00" fixo, porque o resgate não
                  saía do navegador. */}
              <TotalsBlock
                price={order.price}
                discount={order.discount ?? "R$ 0,00"}
                total={order.paid}
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
              Não conseguimos carregar este pedido agora. Tente novamente em
              instantes.
            </p>
          )}
        </CheckoutSidePanel>
      </div>
    </CheckoutShell>
  );
}
