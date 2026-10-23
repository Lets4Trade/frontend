import Image from "next/image";
import Link from "next/link";
import { customerOrderChatHref } from "@/features/orders/orderChatHref";
import { cn } from "@/lib/cn";
import { backendAsset } from "@/lib/publicApi";
import { DELIVERY_COLOR_STYLES } from "./deliveryStatus";
import { OrderStatusTracker } from "./OrderStatusTracker";
import { ORDER_STATUS_STYLES, type OrderItem, type Purchase } from "./types";

/**
 * Card de um PEDIDO em "Meus Pedidos".
 *
 * ── Reformulado em 2026-10-16 (pedido do usuário) ──────────────────────────
 * "Tem que vir o nome do jogo no lugar [do item] … se der pra fazer algo como
 * o carrinho é hoje seria uma boa." O card segue a linguagem do carrinho
 * (`cart/CartRow`):
 *
 *   topo     logo e nome do JOGO (o título), código · data · itens embaixo;
 *            à direita a pílula da situação e o botão do chat
 *   itens    linhas compactas: miniatura, produto, servidor · quantidade e o
 *            preço em degradê (o único texto em degradê, como no carrinho)
 *   rodapé   a trilha da entrega e o total pago
 *
 * Um pedido tem uma situação e uma trilha (2026-10-16); os itens não repetem.
 */
export function PurchaseCard({ purchase }: { purchase: Purchase }) {
  const href = `/conta/pedidos/${encodeURIComponent(purchase.reference)}`;
  const games = purchaseGames(purchase);
  const title = games.map((game) => game.name).join(" + ") || purchase.items[0]?.productName || "Pedido";
  const logo = backendAsset(games[0]?.imageUrl);
  const pill = statusPill(purchase);
  const count = purchase.items.length;

  return (
    <article className="w-[1000px] shrink-0 overflow-hidden rounded-[24px] border border-white/10 bg-[#0b0b0b]">
      <header className="flex items-center gap-[16px] border-b border-white/[0.07] px-[28px] py-[18px]">
        <span className="relative size-[52px] shrink-0 overflow-hidden rounded-[14px] border border-white/10 bg-[#161616]">
          {logo ? <Image src={logo} alt="" fill sizes="52px" className="object-contain p-[6px]" /> : null}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-poppins text-[20px] leading-[26px] font-semibold tracking-[-0.2px] text-white" title={title}>
            {title}
          </h3>
          <p className="mt-[2px] font-helvetica text-[13px] text-brand-fg-subtle">
            Pedido{" "}
            {/* O número leva direto ao chat do pedido (2026-10-23). */}
            <Link
              href={customerOrderChatHref(purchase.reference)}
              title="Abrir o chat do pedido"
              className="font-bold text-white/80 underline decoration-white/30 underline-offset-[3px] transition-colors hover:text-brand-orange hover:decoration-brand-orange"
            >
              {purchase.reference}
            </Link>
            <span aria-hidden> · </span>
            {purchase.date}
            <span aria-hidden> · </span>
            {count} {count === 1 ? "item" : "itens"}
          </p>
        </div>

        <span
          className={cn(
            "flex h-[28px] max-w-[260px] shrink-0 items-center justify-center truncate rounded-full border border-white/5 px-[14px] font-helvetica text-[14px] tracking-[0.14px]",
            pill.className,
          )}
        >
          {pill.label}
        </span>

        {/* A porta da tela do pedido: conversa com a equipe e o detalhe. */}
        <Link
          href={href}
          aria-label={`Abrir o pedido ${purchase.reference}`}
          className="flex h-[36px] shrink-0 items-center gap-[8px] rounded-full border border-brand-orange bg-[image:var(--brand-surface-fill)] px-[16px] font-poppins text-[13px] font-bold text-white transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none"
        >
          <Image src="/icons/order/chat.svg" alt="" width={16} height={16} aria-hidden />
          Ver pedido
        </Link>
      </header>

      {/* Dois itens por linha a partir de dois: o card não cresce tanto e cada
          linha continua do tamanho da do carrinho. */}
      <ul className={cn("grid px-[28px] py-[6px]", count > 1 && "grid-cols-2 gap-x-[32px]")}>
        {purchase.items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </ul>

      <footer className="flex items-end justify-between gap-[24px] border-t border-white/[0.07] bg-white/[0.015] px-[28px] pt-[18px] pb-[16px]">
        <OrderStatusTracker track={purchase.track} dates={purchase.stepDates} note={trackNote(purchase)} />

        <dl className="flex shrink-0 flex-col items-end gap-[4px] pb-[6px]">
          {purchase.discount ? (
            <div className="flex items-baseline gap-[10px]">
              <dt className="font-helvetica text-[13px] text-white/60">Desconto</dt>
              <dd className="font-poppins text-[13px] font-semibold text-[#22c55e]">− {purchase.discount}</dd>
            </div>
          ) : null}
          <div className="flex items-baseline gap-[12px]">
            <dt className="font-helvetica text-[15px] font-bold text-white/80">Total pago</dt>
            <dd className="font-poppins text-[22px] leading-none font-semibold text-white">{purchase.paid}</dd>
          </div>
        </dl>
      </footer>
    </article>
  );
}

/** Uma linha do item, no desenho da linha do carrinho (miniatura de 56px). */
function ItemRow({ item }: { item: OrderItem }) {
  const art = backendAsset(item.productImageUrl) ?? backendAsset(item.gameImageUrl);
  const detail = [item.platform, item.quantity].filter(Boolean).join(" · ");

  return (
    <li className="flex min-w-0 items-center gap-[14px] border-b border-white/[0.07] py-[12px] last:border-b-0 [&:nth-last-child(2):nth-child(odd)]:border-b-0">
      <span className="relative size-[56px] shrink-0 overflow-hidden rounded-[12px] border border-white/10 bg-[#161616]">
        {art ? (
          <Image
            src={art}
            alt=""
            fill
            sizes="56px"
            className={cn("object-contain", item.productImageUrl ? "p-[5px]" : "p-[9px] opacity-80")}
          />
        ) : null}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-poppins text-[15px] leading-[20px] font-semibold text-white" title={item.productName}>
          {item.productName}
        </p>
        <p className="mt-[2px] truncate font-helvetica text-[12px] text-brand-fg-subtle" title={detail}>
          {detail}
        </p>
        {item.gift ? (
          <p className="mt-[2px] truncate font-helvetica text-[12px] font-bold text-[#4ade80]">+ Brinde: {item.gift.text}</p>
        ) : null}
      </div>

      {/* O preço é o único texto em degradê — como no carrinho. */}
      <span
        className="shrink-0 bg-clip-text font-poppins text-[15px] font-semibold text-transparent"
        style={{ backgroundImage: "var(--brand-orange-gradient)" }}
      >
        {item.price}
      </span>
    </li>
  );
}

/** Os jogos do pedido, sem repetir, na ordem dos itens — o título do card. */
export function purchaseGames(purchase: Pick<Purchase, "items">) {
  const seen = new Map<string, { name: string; imageUrl: string | null }>();
  for (const item of purchase.items) {
    if (item.gameName && !seen.has(item.gameName)) seen.set(item.gameName, { name: item.gameName, imageUrl: item.gameImageUrl });
  }
  return [...seen.values()];
}

/** Pílula do pedido: o status personalizado (nome e cor) ou a situação padrão. */
export function statusPill(purchase: Pick<Purchase, "status" | "delivery">) {
  if (purchase.delivery) {
    return { label: purchase.delivery.label, className: DELIVERY_COLOR_STYLES[purchase.delivery.color].className };
  }
  return ORDER_STATUS_STYLES[purchase.status];
}

/** O status personalizado como nota da trilha (no lugar do nome da etapa atual). */
export function trackNote(purchase: Pick<Purchase, "delivery">) {
  return purchase.delivery
    ? { label: purchase.delivery.label, color: DELIVERY_COLOR_STYLES[purchase.delivery.color].text, date: purchase.delivery.date }
    : null;
}
