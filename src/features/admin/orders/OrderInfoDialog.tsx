"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/masks";
import { toOrderGift } from "@/features/gifts/orderGift";
import { toOrderDetails } from "@/features/orders/details";
import { backendAsset } from "@/lib/publicApi";
import {
  formatDateTime,
  formatMoney,
  orDash,
  orderPill,
  statusStyle,
  type AdminOrder,
  type AdminOrderItem,
} from "./types";

/**
 * "Informações de compra" — o detalhe de um pedido (Figma 2546:1136, última
 * coluna da tabela).
 *
 * Desde 2026-10-16 o pedido tem VÁRIOS itens: o topo é o pedido (código,
 * cliente, situação, entregador) e abaixo vêm os produtos, cada um com arte,
 * servidor, quantidade, preço, a conta do serviço e o brinde — tudo o que
 * quem entrega precisa. No fim, os totais da compra.
 *
 * SÓ LEITURA. O que o cliente comprou é o histórico congelado no momento da
 * compra — editá-lo pelo painel seria reescrever o passado de alguém. O que se
 * altera (situação e entregador) fica na linha da tabela.
 *
 * Controlado por `open`/`onOpenChange` em vez de `Dialog.Trigger`: quem abre é
 * a célula da tabela, e um gatilho por linha montaria quinze diálogos.
 */
export function OrderInfoDialog({
  order,
  onClose,
}: {
  order: AdminOrder;
  onClose: () => void;
}) {
  const pill = orderPill(order);
  const items = Array.isArray(order.items) ? order.items : [];
  const couponCents = order.couponCents ?? 0;
  const coinsCents = order.discountCents ?? 0;
  const totalCents = Math.round(Number(order.totalPrice) * 100);
  const paid = formatMoney((Math.max(0, totalCents - coinsCents - couponCents) / 100).toFixed(2), order.currency);

  const linhas: [string, string][] = [
    ["Código", order.reference],
    ["Data", formatDateTime(order.createdAt)],
    // O personalizado diz também a etapa em que conta.
    ["Situação", pill.label === statusStyle(order.status).label ? pill.label : `${pill.label} (${statusStyle(order.status).label})`],
    ["Cliente", order.customerName],
    ["Telefone", orDash(order.customerPhone && formatPhone(order.customerPhone))],
    ["Entregador", orDash(order.assigneeName)],
  ];

  return (
    <Dialog.Root open onOpenChange={(next) => (next ? undefined : onClose())}>
      <Dialog.Portal>
        {/* O overlay escurece e captura o clique fora; o Radix cuida do foco
            preso, do Esc e de devolver o foco ao botão que abriu. */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]" />

        <Dialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[680px] max-w-[calc(100vw-40px)]",
            "max-h-[calc(100vh-80px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto",
            "scrollbar-orange rounded-[30px] border border-brand-border bg-brand-surface p-[24px] sm:p-[40px]",
            "shadow-[0_24px_60px_rgba(0,0,0,0.6)]",
          )}
        >
          <div className="flex items-start justify-between gap-[20px]">
            <div className="min-w-0">
              <Dialog.Title className="font-helvetica text-[25px] leading-[24px] font-bold tracking-[0.25px] text-white">
                Informações de compra
              </Dialog.Title>
              <Dialog.Description className="mt-[10px] font-helvetica text-[15px] text-brand-placeholder">
                {items.length === 1 ? "1 item" : `${items.length} itens`}, uma entrega. O que o pedido registrou no
                momento da compra.
              </Dialog.Description>
            </div>

            <span
              className={cn(
                "max-w-[200px] shrink-0 truncate rounded-[6px] border border-white/5 px-[10px] py-[4px] font-poppins text-[12px] font-bold",
                pill.className,
              )}
            >
              {pill.label}
            </span>
          </div>

          <dl className="mt-[24px]">
            {linhas.map(([rotulo, valor]) => (
              <Line key={rotulo} label={rotulo} value={valor} />
            ))}
          </dl>

          <h3 className="mt-[28px] font-poppins text-[13px] font-bold tracking-[0.06em] text-brand-fg-subtle uppercase">
            Itens
          </h3>
          <ul className="mt-[10px] flex flex-col gap-[12px]">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} currency={order.currency} />
            ))}
          </ul>

          <dl className="mt-[24px] border-t-2 border-white/10 pt-[12px]">
            <Line label="Preço cheio" value={formatMoney(order.totalPrice, order.currency)} />
            {couponCents > 0 ? (
              <Line
                label={`Cupom ${order.couponCode ?? ""}`.trim()}
                value={`− ${formatMoney((couponCents / 100).toFixed(2), order.currency)}`}
              />
            ) : null}
            {coinsCents > 0 ? (
              <Line
                label={`Lets Coins (${(order.coinsSpent ?? 0).toLocaleString("pt-BR")})`}
                value={`− ${formatMoney((coinsCents / 100).toFixed(2), order.currency)}`}
              />
            ) : null}
          </dl>
          <div className="mt-[12px] flex items-baseline justify-between">
            <span className="font-poppins text-[14px] text-brand-fg-subtle">Valor pago</span>
            <strong className="font-helvetica text-[24px] font-bold text-white">{paid}</strong>
          </div>

          <div className="mt-[30px] flex justify-end">
            <Dialog.Close className="h-[50px] rounded-full border border-brand-border bg-[image:var(--brand-surface-fill)] px-[35px] font-poppins text-[14px] font-bold text-white transition-opacity hover:opacity-90">
              Fechar
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Um produto do pedido: arte, jogo, servidor, quantidade, preço, serviço e brinde. */
function ItemCard({ item, currency }: { item: AdminOrderItem; currency: string }) {
  const art = backendAsset(item.productImageUrl);
  const gift = toOrderGift(item.gift);
  const details = toOrderDetails(item.details, currency);

  return (
    <li className="flex items-start gap-[16px] rounded-[18px] border border-white/10 bg-black/20 p-[14px]">
      {/* A arte é opcional: sem ela a caixa some, em vez de um retângulo vazio. */}
      {art ? (
        <div className="relative h-[72px] w-[68px] shrink-0 overflow-hidden rounded-[10px] border border-white/10">
          <Image src={art} alt="" fill sizes="68px" className="object-cover" />
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-[12px]">
          <p className="min-w-0 truncate font-poppins text-[15px] font-bold text-white" title={item.productName}>
            {item.productName}
          </p>
          <span className="shrink-0 font-poppins text-[14px] text-white">{formatMoney(item.totalPrice, currency)}</span>
        </div>
        <p className="mt-[2px] font-poppins text-[13px] text-brand-fg-subtle">
          {[item.gameName, item.platform, item.quantity].filter(Boolean).join(" · ")}
          {item.legacyReference ? ` · código antigo ${item.legacyReference}` : ""}
        </p>

        {details ? (
          <ul className="mt-[8px] flex flex-col gap-[2px]">
            {details.lines.map((line) => (
              <li key={line.label} className="flex justify-between gap-[12px] font-poppins text-[12px] text-white/70">
                <span className="truncate">{line.label}</span>
                <span className="shrink-0">{line.price}</span>
              </li>
            ))}
            {details.hours ? (
              <li className="font-poppins text-[12px] text-white/50">Tempo estimado: {details.hours} h</li>
            ) : null}
          </ul>
        ) : null}

        {/* Brinde do jogo (2026-10-12): entregar JUNTO, no servidor indicado. */}
        {gift ? (
          <p className="mt-[8px] font-poppins text-[12px] font-bold text-[#4ade80]">
            Brinde: {gift.server ? `${gift.text} (em ${gift.server})` : gift.text}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-[20px] border-b border-white/5 py-[10px]">
      <dt className="shrink-0 font-poppins text-[13px] text-brand-fg-subtle">{label}</dt>
      <dd className="min-w-0 truncate text-right font-poppins text-[14px] text-white">{value}</dd>
    </div>
  );
}
