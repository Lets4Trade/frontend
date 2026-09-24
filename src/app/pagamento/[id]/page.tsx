import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { formatBrl as formatCents } from "@/features/payment/types";
import { CheckoutShell } from "@/features/checkout/CheckoutShell";
import {
  CheckoutSidePanel,
  ReferencesBadge,
  ReferencesButton,
} from "@/features/checkout/CheckoutPanel";
import { OrderLineBlock, TotalsBlock } from "@/features/orders/OrderSummaryPieces";
import { PaymentStatusClient } from "@/features/payment/PaymentStatusClient";
import { getPayment } from "@/features/payment/data";

export const metadata: Metadata = {
  title: "Pagamento | Lets4Trade",
  description: "Acompanhe o pagamento do seu pedido na Lets4Trade.",
  // Página de conta: nada a indexar.
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ id: string }> };

/**
 * Pagamento de um carrinho (2026-09-24) — fora do Figma.
 *
 * É para onde o checkout manda depois de cobrar: o QR do PIX esperando, o
 * cartão em análise, a confirmação — e o destino da volta do banco no débito
 * (`/payments/3ds-retorno` no backend redireciona para cá). A moldura é a do
 * checkout e a da tela do pedido: formulário à esquerda, a ordem à direita.
 *
 * Exige o DONO: sem sessão vai para o login com retorno; de outra pessoa ou
 * inexistente é 404.
 */
export default async function PaymentPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getPayment(id);

  if (!result.ok) {
    if (result.reason === "unauthenticated") {
      redirect(`/login?redirect=/pagamento/${encodeURIComponent(id)}`);
    }
    if (result.reason === "notfound") notFound();
    throw new Error("Pagamento indisponível");
  }

  const { payment } = result;
  const subtotal = payment.orders.reduce(
    (sum, order) => sum + Math.round(Number(order.totalPrice) * 100),
    0,
  );
  const discount = payment.orders.reduce((sum, order) => sum + (order.discountCents ?? 0), 0);

  return (
    <CheckoutShell>
      <div className="flex min-h-[1080px]">
        <div className="flex flex-1 justify-center px-[50px] pt-[97px] pb-[60px]">
          <PaymentStatusClient initial={payment} />
        </div>

        <CheckoutSidePanel>
          <div className="flex items-center justify-between gap-[25px]">
            <ReferencesButton />
            <ReferencesBadge />
          </div>

          <h2 className="mt-[38px] font-poppins text-[22px] leading-[28px] font-semibold tracking-[-0.44px] text-white">
            Ordem
          </h2>
          <div aria-hidden className="mt-[15px] h-px w-full bg-white/25" />

          {payment.orders.map((order) => (
            <OrderLineBlock
              key={order.reference}
              line={{
                id: order.reference,
                name: order.productName,
                platform: order.platform,
                quantity: order.quantity,
                price: formatCents(Math.round(Number(order.totalPrice) * 100)),
                date: order.reference,
              }}
            />
          ))}

          <div aria-hidden className="mt-[26px] h-px w-full bg-white/25" />

          <TotalsBlock
            price={formatCents(subtotal)}
            discount={formatCents(discount)}
            total={formatCents(payment.amountCents)}
          />
        </CheckoutSidePanel>
      </div>
    </CheckoutShell>
  );
}
