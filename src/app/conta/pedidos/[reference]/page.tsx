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
import { statusPill, trackNote } from "@/features/orders/PurchaseCard";
import type { OrderItem } from "@/features/orders/types";
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

type PageProps = {
  params: Promise<{ reference: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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
 * O que é REAL: o PEDIDO da URL (desde 2026-10-16, a compra inteira: vários
 * itens, uma situação, uma trilha e o total), de `GET /orders/:reference/purchase`.
 * A URL pode ter o código de um item antigo (quando cada item era um pedido) —
 * o backend acha o pedido por ele. A trilha anda sozinha quando a situação
 * muda (`OrdersLiveRefresh`). Uma conversa por pedido.
 *
 * A CONVERSA é real e em tempo real por SOCKET (ver `OrderChat`): o histórico
 * vem pronto daqui, do servidor, e o socket cuida do que acontece dali em
 * diante. O que ainda não existe é o comprovante.
 */
export default async function PedidoPage({ params, searchParams }: PageProps) {
  const [{ reference }, query] = await Promise.all([params, searchParams]);
  // `?pago=1`: veio direto do pagamento aprovado (2026-10-16) — aviso no chat.
  const justPaid = query.pago === "1";

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
  const pill = purchase ? statusPill(purchase) : null;
  const note = purchase ? trackNote(purchase) : null;

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
                ? `Pedido ${purchase.reference} (${purchase.items.length} itens)`
                : undefined
            }
            initialConversationId={chat.conversation?.id ?? null}
            initialMessages={chat.messages}
            userAvatar={profile.ok ? profile.profile.avatar : undefined}
            justPaid={justPaid}
          />
        </div>

        {/* No celular o andamento e o resumo vêm antes do chat. */}
        <CheckoutSidePanel mobileFirst>
          <PanelReferencesRow />

          {purchase ? (
            <>
              {/* UMA trilha para o pedido inteiro (2026-10-16), grande no
                  topo como no arquivo; com o status personalizado no lugar do
                  nome da etapa atual, quando houver. */}
              <div className="mt-[49px] hidden justify-center lg:flex">
                <OrderStatusTracker track={purchase.track} dates={purchase.stepDates} note={note} size="page" />
              </div>
              {/* A trilha de 575px não cabe no celular: versão compacta. */}
              <div className="mt-[32px] flex justify-center lg:hidden">
                <OrderStatusTracker track={purchase.track} dates={purchase.stepDates} note={note} size="compact" />
              </div>

              <div className="mt-[50px] flex flex-wrap items-center justify-between gap-[12px]">
                <h2 className="font-poppins text-[22px] leading-[28px] font-semibold tracking-[-0.44px] text-white">
                  {single ? "Ordem" : `Ordem · ${purchase.items.length} itens`}
                </h2>
                {pill ? (
                  <span
                    className={cn(
                      "flex h-[24px] max-w-full min-w-[100px] items-center justify-center truncate rounded-[66px] border border-white/5 px-[12px] font-helvetica text-[14px] tracking-[0.14px]",
                      pill.className,
                    )}
                  >
                    {pill.label}
                  </span>
                ) : null}
              </div>
              <SummaryRow label="Pedido" value={purchase.reference} />
              <div aria-hidden className="mt-[15px] h-px w-full bg-white/25" />

              {purchase.items.map((item, index) => (
                <PurchaseItem key={item.id} item={item} date={purchase.date} divider={index > 0} />
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
 * Um item do pedido no painel "Ordem": produto, servidor, quantidade e preço;
 * a conta do serviço e o brinde quando houver. A situação e a trilha são do
 * pedido inteiro (topo), não do item (2026-10-16).
 */
function PurchaseItem({ item, date, divider }: { item: OrderItem; date: string; divider: boolean }) {
  return (
    <section aria-label={item.productName} className={cn(divider && "mt-[26px] border-t border-white/10")}>
      <OrderLineBlock
        line={{
          id: item.id,
          name: item.productName,
          platform: item.platform,
          quantity: item.quantity,
          price: item.price,
          date,
        }}
      />

      {item.details ? <ServiceDetailsBlock lines={item.details.lines} hours={item.details.hours} /> : null}

      {/* Brinde do jogo (2026-10-12): vai junto na entrega. */}
      {item.gift ? (
        <p className="mt-[22px] rounded-[15px] border border-[#22c55e]/35 bg-[#22c55e]/10 px-[18px] py-[12px] font-helvetica text-[15px] leading-[21px] text-white">
          <strong className="font-bold text-[#4ade80]">Brinde: {item.gift.text}</strong>
          {item.gift.server ? <span className="text-white/70"> · entregue em {item.gift.server}</span> : null}
        </p>
      ) : null}
    </section>
  );
}
