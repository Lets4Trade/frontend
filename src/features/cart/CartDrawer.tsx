"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Drawer } from "vaul";
import { cartGifts, type PublicGift } from "@/features/gifts/cartGifts";
import { GiftSummary } from "@/features/gifts/GiftSummary";
import type { LoyaltyTierRule } from "@/features/loyalty/data";
import { tierArt } from "@/features/loyalty/tiers";
import { CartRow } from "./CartRow";
import { CashbackSummary } from "./CashbackSummary";
import { estimateCashback } from "./cashback";
import { formatCents, itemCount, subtotalCents, useCart, type CartItem } from "./store";
import { useLoyaltyRate } from "./useLoyaltyRate";

/**
 * Carrinho como gaveta lateral.
 *
 * ── Reformulado em 2026-10-09 (pedido do usuário) ──────────────────────────
 * A versão do Figma (2501:3626) tinha cada item com ~240px de altura (arte de
 * 146×189 e quatro linhas de rótulo/valor) e um rodapé de ~450px. Numa tela de
 * notebook sobrava lugar para UM item, e qualquer compra com dois virava uma
 * rolagem apertada no meio da gaveta.
 *
 * Agora: linhas COMPACTAS (~100px: miniatura, nome, servidor, contador e
 * preço na mesma linha), cinco ou seis à vista sem rolar; rodapé enxuto com o
 * CASHBACK que a compra rende em destaque, totais e o botão. A lista continua
 * sendo o único bloco que rola, e o resumo fica sempre visível.
 *
 * `vaul` cuida do que é chato de fazer à mão: foco preso, Esc, trava da
 * rolagem do fundo e devolver o foco ao botão do cabeçalho ao fechar.
 */

function subscribeCookies(onChange: () => void) {
  window.addEventListener("focus", onChange);
  return () => window.removeEventListener("focus", onChange);
}
/** Dica de sessão sem ida ao servidor — a mesma do chat (`ContactBubble`). */
const hasSessionHint = () => /(?:^|;\s*)pt_authed_client=/.test(document.cookie);

export function CartDrawer({ tiers, gifts }: { tiers: LoyaltyTierRule[]; gifts: PublicGift[] }) {
  const items = useCart((state) => state.items);
  const isOpen = useCart((state) => state.isOpen);
  const open = useCart((state) => state.open);
  const close = useCart((state) => state.close);
  const signedIn = useSyncExternalStore(subscribeCookies, hasSessionHint, () => false);

  const subtotal = subtotalCents(items);
  // Não existe origem de desconto no carrinho (as Lets Coins entram no
  // checkout); a linha só aparece quando houver.
  const discount = 0;
  const total = subtotal - discount;
  const count = itemCount(items);
  // Brinde por jogo (2026-10-12): prévia sobre o valor cheio — as Lets Coins só
  // entram no checkout, e lá o cartão recalcula.
  const giftList = cartGifts(items, gifts);

  return (
    <Drawer.Root direction="right" open={isOpen} onOpenChange={(next) => (next ? open() : close())}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed top-0 right-0 bottom-0 z-50 flex w-[480px] max-w-[100vw] flex-col border-l border-white/15 bg-[#070707] outline-none"
        >
          <header className="flex shrink-0 items-center justify-between gap-[12px] border-b border-white/10 px-[20px] py-[18px] sm:px-[28px] sm:py-[22px]">
            <Drawer.Title className="flex items-baseline gap-[10px] font-poppins text-[20px] font-semibold tracking-[-0.4px] text-white">
              Carrinho
              {count > 0 ? (
                <span className="font-helvetica text-[14px] font-normal tracking-normal text-brand-fg-muted">
                  {count} {count === 1 ? "item" : "itens"}
                </span>
              ) : null}
            </Drawer.Title>
            <Drawer.Close
              aria-label="Fechar o carrinho"
              className="flex size-[36px] shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none"
            >
              {/* A arte do Figma aponta para a esquerda, mas a gaveta sai pela
                  DIREITA (2026-10-27, pedido do usuário): espelhada, a seta
                  mostra para onde o painel vai. */}
              <Image src="/icons/cart/close-arrow.svg" alt="" width={22} height={22} aria-hidden className="size-[22px] -scale-x-100" />
            </Drawer.Close>
          </header>

          {items.length === 0 ? (
            <EmptyCart onClose={close} />
          ) : (
            <>
              {/* A lista é o único bloco elástico: rola quando cresce, e o resumo
                  embaixo fica sempre visível. */}
              <ul className="scrollbar-orange min-h-0 flex-1 overflow-y-auto px-[20px] py-[8px] sm:px-[28px]">
                {items.map((item) => (
                  <CartRow key={item.id} item={item} />
                ))}
              </ul>

              <footer className="shrink-0 border-t border-white/10 bg-[#0b0b0b] px-[20px] pt-[18px] pb-[22px] sm:px-[28px]">
                <CashbackCard items={items} tiers={tiers} signedIn={signedIn} enabled={isOpen} />
                <GiftSummary
                  gifts={giftList}
                  className="mt-[10px]"
                  note="Brinde calculado sobre o valor pago no jogo e entregue junto com o pedido."
                />

                {/* Subtotal e desconto só quando HÁ desconto: sem ele, o subtotal
                    repete o total e só come espaço da lista. */}
                <dl className="mt-[16px] flex flex-col gap-[8px]">
                  {discount > 0 ? (
                    <>
                      <div className="flex items-baseline justify-between">
                        <dt className="font-helvetica text-[14px] text-white/70">Subtotal</dt>
                        <dd className="font-poppins text-[14px] font-semibold text-white">{formatCents(subtotal)}</dd>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <dt className="font-helvetica text-[14px] text-white/70">Desconto</dt>
                        <dd className="font-poppins text-[14px] font-semibold text-[#22c55e]">− {formatCents(discount)}</dd>
                      </div>
                    </>
                  ) : null}
                  <div className="flex items-baseline justify-between">
                    <dt className="font-helvetica text-[18px] font-bold text-white">Total</dt>
                    <dd className="font-poppins text-[22px] leading-none font-semibold text-white">{formatCents(total)}</dd>
                  </div>
                </dl>

                <Link
                  href="/checkout"
                  onClick={close}
                  className="mt-[16px] flex h-[50px] w-full items-center justify-center rounded-full border border-[var(--brand-stroke-soft)] bg-[image:var(--brand-orange-gradient)] font-poppins text-[16px] font-bold tracking-[0.16px] text-black transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                >
                  FINALIZAR COMPRA
                </Link>
                <button
                  type="button"
                  onClick={close}
                  className="mt-[10px] w-full py-[6px] text-center font-poppins text-[13px] font-semibold text-white/70 transition-colors hover:text-white"
                >
                  Continuar comprando
                </button>
              </footer>
            </>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function EmptyCart({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-[12px] px-[28px] text-center">
      <span aria-hidden className="flex size-[64px] items-center justify-center rounded-full border border-white/10 bg-white/5">
        <Image src="/icons/game/cart.svg" alt="" width={26} height={26} className="size-[26px] opacity-80" />
      </span>
      <p className="font-poppins text-[16px] font-semibold text-white">Seu carrinho está vazio</p>
      <p className="font-helvetica text-[14px] leading-[20px] text-brand-fg-muted">
        Escolha um jogo e adicione moedas, itens ou serviços.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-[6px] inline-flex h-[42px] items-center justify-center rounded-full border border-brand-border px-[24px] font-poppins text-[14px] font-bold text-white transition-colors hover:bg-white/5"
      >
        CONTINUAR COMPRANDO
      </button>
    </div>
  );
}

/**
 * Quanto de cashback a compra rende (2026-10-09). Logado: o percentual do
 * NÍVEL DA CONTA (o mesmo que o backend vai usar). Deslogado: o do nível
 * inicial, com o convite para entrar — sem conta não há onde creditar.
 */
function CashbackCard({
  items,
  tiers,
  signedIn,
  enabled,
}: {
  items: CartItem[];
  tiers: LoyaltyTierRule[];
  signedIn: boolean;
  enabled: boolean;
}) {
  const rate = useLoyaltyRate(enabled && signedIn);
  const base = tiers[0];
  const bps = rate?.cashbackBps ?? base?.cashbackBps ?? 0;
  const coinCents = rate?.coinCents ?? 1;
  const { coins, cents } = estimateCashback(items, bps, coinCents);
  if (bps <= 0 || cents <= 0) return null;

  const tierKey = rate?.tier ?? base?.tier ?? "BRONZE";
  const tierName = rate?.tierName ?? base?.name ?? "Bronze";
  const tierRule = tiers.find((tier) => tier.tier === tierKey);

  return (
    <CashbackSummary
      icon={tierArt(tierKey, tierRule?.iconUrl).icon}
      cents={cents}
      coins={coins}
      bps={bps}
      tierName={tierName}
      invite={!(signedIn && rate)}
      nextTierName={rate?.nextTierName}
      missingToNextCents={rate?.missingToNextCents}
    />
  );
}
