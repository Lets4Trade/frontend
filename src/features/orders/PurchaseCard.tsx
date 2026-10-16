import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { OrderStatusTracker } from "./OrderStatusTracker";
import { ORDER_STATUS_STYLES, type Order, type Purchase } from "./types";

/**
 * Card de uma COMPRA em "Meus Pedidos" (2026-10-15; base visual: Figma
 * 2073:1612 — 1000px, raio 30, fundo preto a 10%, borda branca a 10%).
 *
 * Antes era um card por PEDIDO, e o carrinho vira um pedido por item: quem
 * comprava três coisas via três cards soltos, sem nada dizendo que eram a
 * mesma compra, e a tela do pedido mostrava um item só. Agora o card é da
 * compra, e cada item tem a PRÓPRIA situação e trilha — o admin entrega um de
 * cada vez.
 *
 * Layout em FLUXO (não mais absoluto): a altura varia com o número de itens.
 * As colunas mantêm as medidas do arquivo — texto de x=50 a 525, trilha em
 * x=572.
 */
export function PurchaseCard({ purchase }: { purchase: Purchase }) {
  const single = purchase.items.length === 1;
  const href = `/conta/pedidos/${encodeURIComponent(purchase.reference)}`;
  const title = single ? purchase.items[0].productName : `Compra com ${purchase.items.length} itens`;

  return (
    <article className="w-[1000px] shrink-0 rounded-[30px] border border-white/10 bg-black/10 pt-[25px] pb-[22px]">
      <header className="flex h-[29px] items-center px-[50px]">
        <h3
          className="min-w-0 flex-1 truncate font-poppins text-[18px] leading-[27px] font-bold tracking-[0.36px] text-white"
          title={title}
        >
          {title}
        </h3>

        {/* Chat: a porta da tela da compra (2569:1682), com a conversa e as
            trilhas de todos os itens. Uma conversa por compra. */}
        <Link
          href={href}
          aria-label={`Abrir a compra ${purchase.reference}`}
          className="ml-[20px] flex h-[24px] w-[74px] shrink-0 items-center justify-center gap-[6px] rounded-[66px] border border-brand-orange bg-gradient-to-b from-[#222] to-[#1d1d1d] transition-opacity hover:opacity-80"
        >
          <Image src="/icons/order/chat.svg" alt="" width={16} height={16} aria-hidden />
          <span className="font-helvetica text-[14px] leading-[15px] text-white">Chat</span>
        </Link>

        <div aria-hidden className="mx-[11px] ml-[30px] h-[29px] w-px bg-white/20" />

        <time className="w-[66px] shrink-0 font-helvetica text-[16px] leading-[13px] tracking-[0.16px] text-brand-placeholder">
          {purchase.date}
        </time>
      </header>

      {purchase.items.map((item, index) => (
        <ItemRow key={item.id} item={item} showName={!single} divider={index > 0} />
      ))}

      {/* Compra com vários itens: o total vem DEPOIS dos itens, como no
          comprovante. Um item só já mostra o preço na própria linha. */}
      {single ? null : (
        <footer className="mx-[50px] mt-[18px] flex items-baseline justify-end gap-[30px] border-t border-white/10 pt-[16px]">
          {purchase.discount ? (
            <span className="font-helvetica text-[14px] text-white/60">
              Desconto <span className="font-poppins font-semibold text-white/80">− {purchase.discount}</span>
            </span>
          ) : null}
          <span className="font-helvetica text-[16px] font-bold text-white/80">
            Total pago{" "}
            <span className="ml-[8px] font-poppins text-[18px] font-semibold text-white">{purchase.paid}</span>
          </span>
        </footer>
      )}
    </article>
  );
}

function ItemRow({ item, showName, divider }: { item: Order; showName: boolean; divider: boolean }) {
  const status = ORDER_STATUS_STYLES[item.status];
  const rows = [
    { label: "Pedido", value: item.reference },
    { label: "Plataforma/Servidor", value: item.platform },
    { label: "Quantidade", value: item.quantity },
    { label: "Preço", value: item.price },
  ];

  return (
    <section
      aria-label={`${item.productName} — ${status.label}`}
      className={cn("mx-[50px] flex gap-[47px]", divider ? "mt-[18px] border-t border-white/10 pt-[18px]" : "mt-[16px]")}
    >
      <div className="w-[475px] shrink-0">
        {showName ? (
          <h4
            className="mb-[6px] truncate font-poppins text-[16px] leading-[24px] font-bold text-white"
            title={item.productName}
          >
            {item.productName}
          </h4>
        ) : null}
        {/* Rótulo à esquerda, valor alinhado à direita — resumo de serviço
            longo ("Nível 10 → 20 · Prioridade") vira reticências. */}
        {rows.map((row) => (
          <div key={row.label} className="flex h-[35px] items-center justify-between gap-[20px]">
            <span className="shrink-0 font-helvetica text-[14px] leading-[16px] font-bold tracking-[0.14px] text-white/80">
              {row.label}
            </span>
            <span
              className="min-w-0 truncate text-right font-poppins text-[14px] leading-[23px] font-semibold tracking-[0.07px] text-white"
              title={row.value}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-start gap-[16px] pt-[4px]">
        <span
          className={cn(
            "flex h-[24px] min-w-[100px] items-center justify-center rounded-[66px] border border-white/5 px-[12px] font-helvetica text-[14px] tracking-[0.14px]",
            status.className,
          )}
        >
          {status.label}
        </span>
        <OrderStatusTracker track={item.track} dates={item.stepDates} />
      </div>
    </section>
  );
}
