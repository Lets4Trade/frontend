import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CheckoutShell } from "@/features/checkout/CheckoutShell";
import {
  CheckoutSidePanel,
  PanelReferencesRow,
} from "@/features/checkout/CheckoutPanel";
import { OrderChat } from "@/features/orders/OrderChat";
import { OrderProofs } from "@/features/orders/OrderProofs";
import { getAccountProfile } from "@/features/account/profile";
import { getReferencesVideoHref } from "@/features/site/content";
import { getOrderConversation, getPurchaseDetail } from "@/features/orders/orderDetail";
import { OrdersLiveRefresh } from "@/features/orders/OrdersLiveRefresh";
import { OrderStatusTracker } from "@/features/orders/OrderStatusTracker";
import { statusPill, trackNote } from "@/features/orders/PurchaseCard";
import type { OrderItem } from "@/features/orders/types";
import {
  OrderGiftList,
  OrderLineBlock,
  ServiceDetailsBlock,
  purchaseGifts,
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

  const [result, chat, profile, referencesHref] = await Promise.all([
    getPurchaseDetail(reference),
    getOrderConversation(reference),
    getAccountProfile(),
    getReferencesVideoHref(),
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
  const gifts = purchaseGifts(purchase?.items ?? []);

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
            initialStatus={chat.conversation?.status}
            userAvatar={profile.ok ? profile.profile.avatar : undefined}
            justPaid={justPaid}
          />
        </div>

        {/* No celular o andamento e o resumo vêm antes do chat. */}
        <CheckoutSidePanel mobileFirst>
          <PanelReferencesRow referencesHref={referencesHref} />

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

              {/* Brinde logo abaixo da trilha (2026-10-20, pedido do usuário):
                  é o que vai junto na entrega, e no meio dos itens se perdia. */}
              <OrderGiftList gifts={gifts} className="mt-[32px] lg:mt-[40px]" />

              <div className={cn("flex flex-wrap items-center justify-between gap-[12px]", gifts.length > 0 ? "mt-[32px]" : "mt-[40px]")}>
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
              <SummaryRow
                label="Pedido"
                value={`${purchase.reference} · ${purchase.date}`}
                href="#chat"
                linkText={purchase.reference}
                className="mt-[14px]"
              />
              <div aria-hidden className="mt-[12px] h-px w-full bg-white/25" />

              <ul className="divide-y divide-white/[0.07]">
                {purchase.items.map((item) => (
                  <PurchaseItem key={item.id} item={item} />
                ))}
              </ul>

              {purchase.coupon ? (
                <p className="mt-[14px] font-helvetica text-[14px] text-brand-fg-muted">
                  Cupom <strong className="font-bold text-white">{purchase.coupon.code}</strong> · − {purchase.coupon.amount}
                </p>
              ) : null}

              <div aria-hidden className="mt-[14px] h-px w-full bg-white/25" />

              {/* Totais da COMPRA: soma dos itens, desconto (coins + cupom) de
                  todos eles e o que foi pago — o mesmo valor da cobrança. */}
              <TotalsBlock
                price={purchase.price}
                discount={purchase.discount ?? "R$ 0,00"}
                total={purchase.paid}
              />

              {/* Comprovantes de pagamento e de entrega (2026-10-23). */}
              <OrderProofs purchase={purchase} />
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
 * Um item do pedido no painel "Ordem", em UMA linha: "4x Produto / Servidor" e
 * o preço (2026-10-20); a conta do serviço em letra pequena logo abaixo. O
 * brinde subiu para baixo da trilha, e a situação e a trilha são do pedido
 * inteiro (topo), não do item (2026-10-16).
 */
function PurchaseItem({ item }: { item: OrderItem }) {
  return (
    <li aria-label={item.productName}>
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
  );
}
