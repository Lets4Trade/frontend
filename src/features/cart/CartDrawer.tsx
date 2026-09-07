"use client";

import Image from "next/image";
import Link from "next/link";
import { Drawer } from "vaul";
import { TIERS } from "@/features/loyalty/tiers";
import {
  formatCents,
  subtotalCents,
  useCart,
  type CartItem,
} from "./store";

/**
 * Carrinho como gaveta lateral (Figma 2501:3626) — 652px encostados na direita.
 *
 * ALTURA: o arquivo desenha 1150px fixos. Aqui a gaveta ocupa a altura da
 * janela, com a LISTA rolando e o resumo preso embaixo. Um painel de 1150 num
 * monitor de 900 esconderia justamente o "FINALIZAR COMPRA", que é o único
 * botão que importa. A ordem visual e todos os espaçamentos do arquivo ficam.
 *
 * `vaul` (já era dependência) entra pelo que ele resolve e é chato de fazer à
 * mão: prender o foco dentro da gaveta, fechar no Esc, travar a rolagem do
 * fundo e devolver o foco ao botão do cabeçalho ao fechar.
 */
export function CartDrawer() {
  const items = useCart((state) => state.items);
  const isOpen = useCart((state) => state.isOpen);
  const open = useCart((state) => state.open);
  const close = useCart((state) => state.close);

  const subtotal = subtotalCents(items);
  // Não existe origem de desconto ainda (nem cupom, nem promoção no backend).
  // O arquivo desenha a linha, então ela fica — mostrando o valor de verdade,
  // que hoje é zero. Some sozinha quando houver regra.
  const discount = 0;
  const total = subtotal - discount;

  return (
    <Drawer.Root
      direction="right"
      open={isOpen}
      onOpenChange={(next) => (next ? open() : close())}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed top-0 right-0 bottom-0 z-50 flex w-[652px] max-w-[100vw] flex-col border border-white/20 bg-[#070707] outline-none"
        >
          <Drawer.Title className="sr-only">Carrinho</Drawer.Title>

          <header className="shrink-0 px-[50px] pt-[50px]">
            <div className="flex items-center justify-between">
              <p className="font-poppins text-[22px] leading-[28px] font-semibold tracking-[-0.44px] text-white">
                Carrinho
              </p>
              <Drawer.Close
                aria-label="Fechar o carrinho"
                className="size-[24px] shrink-0 transition-opacity hover:opacity-70"
              >
                <Image
                  src="/icons/cart/close-arrow.svg"
                  alt=""
                  width={24}
                  height={24}
                  aria-hidden
                  className="size-[24px]"
                />
              </Drawer.Close>
            </div>
            <div aria-hidden className="mt-[15px] h-px w-full bg-white/25" />
          </header>

          {/* A lista é o único bloco elástico: é ela que rola quando o carrinho
              cresce, e é o que mantém o resumo sempre visível. */}
          <div className="scrollbar-orange min-h-0 flex-1 overflow-y-auto px-[50px]">
            {items.length === 0 ? (
              <EmptyCart />
            ) : (
              items.map((item, index) => (
                <CartRow key={item.id} item={item} first={index === 0} />
              ))
            )}
          </div>

          {items.length > 0 ? (
            <footer className="shrink-0 px-[50px] pb-[35px]">
              <GiftBanner />

              <div aria-hidden className="mt-[25px] h-px w-full bg-white/25" />

              <SummaryRow label="Preço" value={formatCents(subtotal)} />
              <SummaryRow label="Desconto" value={formatCents(discount)} />

              <div aria-hidden className="mt-[26px] h-px w-full bg-white/25" />

              <div className="mt-[26px] flex items-baseline justify-between">
                <span className="font-helvetica text-[24px] leading-[27px] font-bold tracking-[0.24px] text-white/80">
                  Total
                </span>
                <span className="font-poppins text-[24px] leading-[34px] font-semibold tracking-[0.24px] text-white">
                  {formatCents(total)}
                </span>
              </div>

              <Link
                href="/checkout"
                className="mt-[25px] flex h-[50px] w-full items-center justify-center rounded-full border border-[var(--brand-stroke-soft)] bg-[image:var(--brand-orange-gradient)] font-poppins text-[16px] font-bold tracking-[0.16px] text-black transition-opacity hover:opacity-90"
              >
                FINALIZAR COMPRA
              </Link>

              <div aria-hidden className="mt-[25px] h-px w-full bg-white/25" />

              <NextTier totalCents={total} />
            </footer>
          ) : null}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function EmptyCart() {
  return (
    <p className="py-[80px] text-center font-helvetica text-[16px] text-brand-fg-muted">
      Seu carrinho está vazio.
    </p>
  );
}

/**
 * Uma linha do carrinho (Figma 2505:1045 e irmãos).
 *
 * A geometria é a do arquivo: arte de 146×189, textos a partir de x=221 e os
 * valores alinhados à direita da coluna, que termina na borda do conteúdo.
 */
function CartRow({ item, first }: { item: CartItem; first: boolean }) {
  const setQuantity = useCart((state) => state.setQuantity);
  const remove = useCart((state) => state.remove);

  return (
    <article className={first ? "pt-[26px]" : "border-t border-white/25 pt-[26px]"}>
      <div className="flex gap-[25px] pb-[25px]">
        <div className="relative size-[146px] h-[189px] shrink-0 overflow-hidden rounded-[12px] border-2 border-white/10 bg-[#2f2f2f]">
          {item.image ? (
            <Image
              src={item.image}
              alt=""
              width={146}
              height={189}
              className="size-full object-cover"
            />
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-[15px]">
            <h3 className="min-w-0 truncate font-poppins text-[18px] leading-[27px] font-bold tracking-[0.36px] text-white">
              {item.name}
            </h3>

            <div className="flex shrink-0 items-center gap-[15px]">
              {item.gameLogo ? (
                <Image
                  src={item.gameLogo}
                  alt=""
                  width={87}
                  height={36}
                  aria-hidden
                  className="h-[36px] w-auto object-contain"
                />
              ) : null}
              <time className="font-helvetica text-[16px] tracking-[0.16px] text-brand-placeholder">
                {formatDate(item.addedAt)}
              </time>
            </div>
          </div>

          <Field label="Plataforma/Servidor" className="mt-[32px]">
            <span className="font-poppins text-[16px] font-semibold tracking-[0.08px] text-white">
              {item.platform}
            </span>
          </Field>

          <Field label="Preço" className="mt-[22px]">
            {/* O preço da linha é o ÚNICO texto em degradê no arquivo — ele é a
                informação que a pessoa está procurando na tela. */}
            <span
              className="bg-clip-text font-poppins text-[16px] font-semibold tracking-[0.08px] text-transparent"
              style={{ backgroundImage: "var(--brand-orange-gradient)" }}
            >
              {formatCents(item.unitPriceCents * item.quantity)}
            </span>
          </Field>

          <div className="mt-[27px] flex items-center justify-between">
            <div className="flex items-center gap-[37px]">
              <StepButton
                label={`Diminuir a quantidade de ${item.name}`}
                onClick={() => setQuantity(item.id, item.quantity - 1)}
              >
                −
              </StepButton>
              <span
                aria-live="polite"
                className="min-w-[7px] text-center font-poppins text-[18px] leading-[27px] font-bold tracking-[0.36px] text-white"
              >
                {item.quantity}
              </span>
              <StepButton
                label={`Aumentar a quantidade de ${item.name}`}
                onClick={() => setQuantity(item.id, item.quantity + 1)}
              >
                +
              </StepButton>
            </div>

            <button
              type="button"
              onClick={() => remove(item.id)}
              aria-label={`Remover ${item.name} do carrinho`}
              className="size-[20px] shrink-0 transition-opacity hover:opacity-70"
            >
              <Image
                src="/icons/cart/trash.svg"
                alt=""
                width={20}
                height={20}
                aria-hidden
                className="size-[20px]"
              />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex items-baseline justify-between gap-[15px] ${className ?? ""}`}>
      <span className="font-helvetica text-[16px] leading-[16px] font-bold tracking-[0.16px] text-white/80">
        {label}
      </span>
      {children}
    </div>
  );
}

/**
 * Botão do contador. O `-` some a linha quando chega a zero em vez de travar em
 * 1: é o gesto que a pessoa já está fazendo para se livrar do item, e a lixeira
 * continua ali para quem quiser o caminho direto.
 */
function StepButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-[50px] items-center justify-center rounded-[8px] border border-white/10 bg-[image:var(--brand-surface-fill)] font-poppins text-[18px] font-bold tracking-[0.18px] text-white transition-opacity hover:opacity-90"
    >
      {children}
    </button>
  );
}

/** Faixa promocional do arquivo (2516:1109). Texto fixo até haver promoção real. */
function GiftBanner() {
  return (
    <div className="mt-[25px] flex h-[89px] items-center gap-[25px] rounded-[15px] border border-white/10 bg-[image:var(--brand-surface-fill)] px-[25px]">
      <Image
        src="/icons/cart/sale.svg"
        alt=""
        width={28}
        height={28}
        aria-hidden
        className="size-[28px] shrink-0"
      />
      <div>
        <p className="font-helvetica text-[18px] leading-[20px] font-bold tracking-[0.18px] text-white">
          Ganhe um Brinde
        </p>
        <p className="mt-[6px] font-helvetica text-[14px] leading-[16px] tracking-[0.14px] text-brand-placeholder">
          A partir de R$ 50.00
        </p>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-[26px] flex items-baseline justify-between">
      <span className="font-helvetica text-[16px] leading-[16px] font-bold tracking-[0.16px] text-white/80">
        {label}
      </span>
      <span className="font-poppins text-[16px] leading-[23px] font-semibold tracking-[0.08px] text-white">
        {value}
      </span>
    </div>
  );
}

/**
 * "Prata — Ao comprar vai atingir este nível de Cashback".
 *
 * O nível sai do VALOR DO CARRINHO contra as faixas de `loyalty/tiers.ts`, que
 * já existiam. Ficaria exato somando o `totalSpent` da conta — é uma prop de
 * distância, mas exigiria o cabeçalho buscar o perfil em toda página, e ele
 * hoje só busca a sessão. Ver open-questions.md.
 */
function NextTier({ totalCents }: { totalCents: number }) {
  const reais = totalCents / 100;
  const tier =
    [...TIERS].reverse().find((candidate) => reais >= candidate.minSpend) ?? TIERS[0];

  return (
    <div className="mt-[26px] flex items-center justify-between gap-[25px]">
      <div className="min-w-0">
        <p className="font-helvetica text-[22px] leading-[24px] font-bold tracking-[0.22px] text-white">
          {tier.name}
        </p>
        <p className="mt-[5px] font-helvetica text-[16px] leading-[16px] tracking-[0.16px] text-brand-placeholder">
          Ao comprar vai atingir este nível de Cashback
        </p>
      </div>
      <Image
        src={tier.icon}
        alt=""
        width={75}
        height={75}
        aria-hidden
        className="size-[75px] shrink-0 object-contain"
      />
    </div>
  );
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function formatDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : dateFormatter.format(date);
}
