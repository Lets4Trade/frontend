"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import {
  formatCents,
  itemCount,
  subtotalCents,
  useCart,
  useCartHydrated,
} from "@/features/cart/store";
import { cartGifts, type CartGift, type PublicGift } from "@/features/gifts/cartGifts";
import { GiftSummary } from "@/features/gifts/GiftSummary";
import type { LoyaltySummary } from "@/features/loyalty/data";
import { couponDiscount } from "@/features/pricing/coupon";
import { allocateCoins } from "@/features/pricing/gift";
import { tierArt } from "@/features/loyalty/tiers";
import { CartRow } from "@/features/cart/CartRow";
import { CashbackSummary } from "@/features/cart/CashbackSummary";
import { estimateCashback } from "@/features/cart/cashback";
import {
  CheckoutSidePanel,
  PanelReferencesRow,
} from "./CheckoutPanel";
import { payPayment, type PaymentCallResult } from "@/features/payment/api";
import {
  cartSignature,
  clearPendingPayment,
  readPendingPayment,
  savePendingPayment,
} from "@/features/payment/pendingPayment";
import { CREDIT_CARD_FEE_BPS, cardFeeCents, maxInstallmentsFor } from "@/features/payment/types";
import { runAction } from "@/lib/safeAction";
import { hashString, selectionKey } from "@/features/cart/lineId";
import {
  checkoutAction,
  previewCouponAction,
  type AppliedCoupon,
  type CheckoutLine,
  type CheckoutResult,
} from "./actions";
import { cardSchema, pixSchema } from "./schema";

/**
 * Cotação de reserva da Lets Coin, em centavos.
 *
 * O valor REAL vem do backend (`loyalty.coinCents`), que é quem define o
 * programa. Este só entra quando não há sessão — e aí o saldo é zero e a
 * cotação não chega a ser usada para nada. Manter os dois evita um `?? 10`
 * espalhado por quatro contas.
 */
const FALLBACK_COIN_CENTS = 1;

/**
 * PIX primeiro e já marcado; crédito com taxa (2026-10-27, pedido do usuário).
 * O débito saiu — o backend também o recusa, senão seria o cartão sem taxa.
 */
type Method = "pix" | "credit";
type FieldErrors = Record<string, string>;

/**
 * Checkout (Figma 2568:1505) — formulário à esquerda, resumo do pedido à
 * direita.
 *
 * As duas colunas são um componente só porque compartilham estado: as Lets
 * Coins escolhidas à esquerda mudam o desconto e o total à direita, e o total
 * muda o rótulo do botão e as parcelas de volta à esquerda. Separá-las exigiria
 * levantar esse estado para um contexto só para reuni-lo de novo.
 *
 * ── Pagamento (Cielo, 2026-09-24) ─────────────────────────────────────────
 * Dois passos. (1) `checkoutAction` cria os pedidos e o `Payment` — o VALOR é
 * decidido lá, no backend. (2) O navegador cobra esse pagamento direto na API
 * (`payPayment`): o cartão vai do navegador ao backend e dele à Cielo, sem
 * passar pelo servidor do Next e sem ser gravado em lugar nenhum. O débito
 * autentica antes no banco (3DS, `authenticateDebit`).
 *
 * Recusa não recria o pedido: a próxima tentativa cobra o MESMO pagamento
 * (`pendingPayment.ts`). Aprovado, PIX gerado ou banco aberto, o carrinho é
 * esvaziado e a pessoa segue para `/pagamento/[id]`.
 */
export function CheckoutClient({
  loyalty,
  gifts = [],
  whatsappHref,
  referencesHref,
}: {
  loyalty: LoyaltySummary | null;
  /** Regras de brinde ligadas (2026-10-12) — ver `features/gifts`. */
  gifts?: PublicGift[];
  /**
   * `https://wa.me/<dígitos>` do canal oficial, ou nada. Ausente, o convite
   * "fechar pelo WhatsApp" não aparece — ele apontava para `#` e não fazia
   * nada, justo no momento da compra.
   */
  whatsappHref?: string;
  /** Vídeo de referências no YouTube (`getReferencesVideoHref`), ou nada. */
  referencesHref?: string | null;
}) {
  const router = useRouter();

  const items = useCart((state) => state.items);
  const clear = useCart((state) => state.clear);
  const hydrated = useCartHydrated();

  const [method, setMethod] = useState<Method>("pix");
  // Lets Coins é SIM ou NÃO (2026-10-27, pedido do usuário): sim usa o máximo
  // possível, e já vem marcado. Quanto é "o máximo" sai de `maxCoins`, que
  // acompanha carrinho e cupom sozinho.
  const [useCoins, setUseCoins] = useState(true);
  const [installments, setInstallments] = useState(1);
  // Cupom (2026-10-12): o que o backend validou na prévia; a conta é refeita
  // aqui com a mesma `couponDiscount` quando quantidades ou coins mudam.
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponNote, setCouponNote] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  // Brinde: servidor escolhido por jogo (slug → id de produto do carrinho).
  const [giftChoice, setGiftChoice] = useState<Record<string, string>>({});

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = subtotalCents(items);
  const coinCents = loyalty?.coinCents || FALLBACK_COIN_CENTS;

  /**
   * Cupom primeiro (a mesma ordem do backend): quanto ele abate de cada linha.
   * Se o carrinho mudou e o cupom deixou de valer (abaixo do mínimo, item
   * elegível removido), o desconto vira zero e a nota explica.
   */
  const lineCents = items.map((item) => item.unitPriceCents * item.quantity);
  const couponResult = coupon
    ? couponDiscount(
        coupon,
        items.map((item, index) => ({ cents: lineCents[index], eligible: coupon.eligibleProductIds.includes(item.productId) })),
      )
    : null;
  const couponLines = couponResult?.perLine ?? items.map(() => 0);
  const couponTotal = couponResult?.ok ? couponResult.totalCents : 0;
  const couponBlocksCoins = coupon !== null && !coupon.allowCoins;

  /**
   * O teto do desconto é o MENOR entre o saldo e o valor do carrinho.
   *
   * O mesmo teto existe no backend (`maxRedeemableCoins`), e é lá que ele vale:
   * este aqui serve para a tela não oferecer uma opção que seria recusada. Sem
   * o limite do carrinho, um pedido de R$ 10,00 aceitaria 500 coins e o total
   * ficaria negativo.
   */
  // Teto das coins = o que sobra DEPOIS do cupom; cupom que não aceita coins zera.
  const maxCoins = loyalty && !couponBlocksCoins
    ? Math.min(loyalty.coins, Math.floor((subtotal - couponTotal) / coinCents))
    : 0;
  const coins = useCoins ? maxCoins : 0;
  const discount = coins * coinCents;
  const total = Math.max(subtotal - couponTotal - discount, 0);

  /**
   * Brinde por jogo (2026-10-12) sobre o que cada jogo PAGA: as coins
   * repartidas linha a linha pela MESMA divisão do backend (`allocateCoins`,
   * arquivo espelhado), na ordem do carrinho — que é a ordem em que as linhas
   * vão para o pedido.
   */
  const lineShares = allocateCoins(
    lineCents.map((cents, index) => cents - couponLines[index]),
    coins,
    coinCents,
  );
  // O que cada linha abate da base das RECOMPENSAS (brinde e cashback): coins
  // sempre; o cupom só se o admin marcou "recompensas sobre o valor com cupom".
  const rewardsCut = coupon?.rewardsOnDiscounted ?? true;
  const rewardShares = lineShares.map((share, index) => ({
    cents: share.cents + (rewardsCut ? couponLines[index] : 0),
  }));
  const giftList = cartGifts(items, gifts, rewardShares.map((share) => share.cents));
  // Taxa do crédito POR CIMA do total (2026-10-27). Prévia: o backend cobra o
  // mesmo `cardFeeCents` sobre o valor que ELE calculou. Fora do cashback e do
  // brinde — não é preço de produto.
  const fee = method === "credit" ? cardFeeCents(total) : 0;
  const charge = total + fee;
  // O total muda com as coins; a parcela escolhida antes pode ter ficado
  // abaixo do mínimo. Mesma regra do backend (`maxInstallmentsFor`, sobre o
  // valor com a taxa).
  const effectiveInstallments = Math.min(installments, maxInstallmentsFor(charge));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || items.length === 0) return;

    const data = new FormData(event.currentTarget);
    const read = (name: string) => String(data.get(name) ?? "");

    const schema = method === "pix" ? pixSchema : cardSchema;
    const parsed = schema.safeParse({
      holder: read("holder"),
      number: read("number"),
      expiry: read("expiry"),
      cvv: read("cvv"),
      installments: read("installments") || "1",
      coins: String(coins),
      notes: read("notes"),
    });

    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const [key, messages] of Object.entries(
        parsed.error.flatten().fieldErrors,
      )) {
        const first = messages?.[0];
        if (first) next[key] = first;
      }
      setFieldErrors(next);
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    // Só id e quantidade: nome, arte, servidor e PREÇO são lidos do catálogo
    // no backend (ver `actions.ts`). O que o carrinho guarda no `localStorage`
    // serve para desenhar a tela — nada dali vira valor de pedido.
    // Serviço leva a ESCOLHA (o backend refaz o `quote` com ela) e sempre 1.
    const lines: CheckoutLine[] = items.map((item) =>
      item.selection
        ? { productId: item.productId, units: 1, selection: item.selection }
        : { productId: item.productId, units: item.quantity },
    );

    /**
     * As coins vão JUNTO com o carrinho.
     *
     * Até 2026-09-10 não iam: a tela calculava o desconto, mostrava o total
     * reduzido e mandava só os itens. O pedido nascia com o valor cheio e
     * nenhuma coin era debitada — a pessoa via R$ 20 a menos e pagava R$ 20 a
     * mais. Não dava prejuízo só porque nenhum saldo era creditado ainda.
     */
    const coinsToUse = coins;
    // Onde entregar cada brinde que depende de escolha (jogo em 2+ servidores).
    const giftProductIds = giftList
      .filter((gift) => gift.result.amount > 0 && gift.servers.length > 1)
      .map((gift) => chosenServer(gift, giftChoice).productId);
    // A escolha entra na assinatura: mudar "1 → 50" para "1 → 90" é OUTRO
    // pedido e não pode reaproveitar o pagamento pendente do anterior.
    const signature = cartSignature(
      lines.map((line) => ({
        productId: line.selection
          ? `${line.productId}#${hashString(selectionKey(line.selection))}`
          : line.productId,
        units: line.units,
      })),
      coinsToUse,
    ) +
      (giftProductIds.length > 0 ? `#brinde:${[...giftProductIds].sort().join(",")}` : "") +
      (coupon && couponTotal > 0 ? `#cupom:${coupon.code}` : "");

    // Tentativa anterior recusada, mesmo carrinho: cobra o MESMO pagamento.
    let pending = readPendingPayment(signature);
    if (!pending) {
      // Exceção (rede, deploy novo) cai no mesmo "error" de uma recusa comum:
      // sem isto o botão ficava em "enviando" para sempre, porque o
      // `setIsSubmitting(false)` abaixo nunca rodava.
      const created = await runAction(() => checkoutAction(lines, coinsToUse, giftProductIds, coupon && couponTotal > 0 ? coupon.code : ""), {
        ok: false,
        reason: "error",
      });
      if (!created.ok) {
        setIsSubmitting(false);
        handleCheckoutError(created.reason, created.message);
        return;
      }
      // Carrinho coberto inteiro por coins: nada a cobrar.
      if (created.payment.status === "PAID") {
        goToPayment(created.payment.id);
        return;
      }
      pending = { ...created.payment, signature };
      savePendingPayment(pending);
    }

    const card =
      method === "pix"
        ? null
        : {
            holder: read("holder").trim(),
            number: read("number").replace(/\D/g, ""),
            expiry: read("expiry").trim(),
            cvv: read("cvv").replace(/\D/g, ""),
          };

    let result: PaymentCallResult;
    try {
      result =
        method === "pix"
          ? await payPayment(pending.id, { method: "PIX" })
          : await payPayment(pending.id, {
              method: "CREDIT_CARD",
              card: card!,
              installments: effectiveInstallments,
            });
    } catch {
      setIsSubmitting(false);
      setFormError("Não conseguimos processar o pagamento. Tente de novo em instantes.");
      return;
    }

    if (!result.ok) {
      setIsSubmitting(false);
      if (result.status === 401) {
        router.push("/login?redirect=/checkout");
        return;
      }
      // Prazo acabou ou os pedidos mudaram: a próxima tentativa cria outro.
      if (result.status === 409) clearPendingPayment();
      setFormError(result.message);
      return;
    }

    const payment = result.payment;
    if (payment.status === "PAID" || payment.pix || payment.processing) {
      goToPayment(payment.id);
      return;
    }

    setIsSubmitting(false);
    setFormError(payment.lastError ?? "Pagamento não aprovado. Tente outra forma de pagamento.");
  }

  async function applyCoupon() {
    const code = couponInput.trim();
    if (code === "" || couponBusy) return;
    setCouponBusy(true);
    setCouponNote(null);
    const lines: CheckoutLine[] = items.map((item) =>
      item.selection
        ? { productId: item.productId, units: 1, selection: item.selection }
        : { productId: item.productId, units: item.quantity },
    );
    const result = await runAction(() => previewCouponAction(code, lines), {
      ok: false,
      reason: "error",
      message: "Não foi possível validar o cupom agora. Tente de novo.",
    });
    setCouponBusy(false);
    if (!result.ok) {
      setCouponNote(
        result.reason === "unauthenticated" ? "Entre na sua conta para usar um cupom." : (result.message ?? "Cupom inválido ou expirado."),
      );
      return;
    }
    setCoupon(result.coupon);
    setCouponInput("");
    // Cupom que não aceita coins zera `maxCoins`; tirar o cupom devolve.
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponNote(null);
  }

  function goToPayment(id: string) {
    clear();
    clearPendingPayment();
    router.push(`/pagamento/${encodeURIComponent(id)}`);
  }

  function handleCheckoutError(reason: Extract<CheckoutResult, { ok: false }>["reason"], message?: string) {
    if (reason === "unauthenticated") {
      router.push("/login?redirect=/checkout");
      return;
    }
    if (reason === "coupon") {
      // O cupom deixou de valer entre a prévia e o envio (esgotou, venceu):
      // sai da conta e a pessoa decide se paga sem ele.
      setCoupon(null);
      setCouponNote(message ?? "Este cupom não vale mais.");
      setFormError(`${message ?? "O cupom não vale mais."} O total foi atualizado sem ele.`);
      return;
    }
    if (reason === "coins") {
      // O saldo mudou entre a tela e o envio (outra aba, outro aparelho). Com
      // "usar tudo", basta reler o saldo: o `refresh` traz o `loyalty` novo
      // do servidor e o desconto se ajusta sem a pessoa escolher de novo.
      router.refresh();
      setFormError(
        "Seu saldo de Lets Coins mudou. Atualizamos o desconto, confira o total e reenvie.",
      );
      return;
    }

    setFormError(
      reason === "invalid"
        ? "Algum item do carrinho não está mais disponível. Revise o carrinho."
        : "Não conseguimos criar seu pedido agora. Tente novamente em instantes.",
    );
  }

  return (
    <div className="flex flex-col lg:min-h-[1080px] lg:flex-row">
      {/* Celular (2026-10-09): colunas empilhadas, o resumo do pedido primeiro
          (`mobileFirst`) e o formulário depois — vê o que paga, e paga. */}
      {/* Coluna do formulário: 476px centrados na faixa da esquerda, como no
          arquivo (302 de margem dos dois lados dentro dos 1079). */}
      <div className="flex flex-1 justify-center px-[16px] pt-[28px] pb-[40px] lg:px-[50px] lg:pt-[97px] lg:pb-[60px]">
        <form noValidate onSubmit={handleSubmit} className="w-full max-w-[476px]">
          <h1 className="font-poppins text-[22px] leading-[28px] font-semibold tracking-[-0.44px] text-white">
            Pagamento
          </h1>
          <div aria-hidden className="mt-[15px] h-px w-full bg-white/25" />

          {/* PIX primeiro (2026-10-27), cada forma com o selo do custo: "sem
              taxa" em verde no PIX e o percentual discreto no crédito. */}
          <fieldset className="mt-[23px] flex flex-wrap gap-x-[28px] gap-y-[14px]">
            <legend className="sr-only">Forma de pagamento</legend>
            <MethodRadio
              label="PIX"
              value="pix"
              current={method}
              onSelect={setMethod}
              tag={<FeeTag tone="free">SEM TAXA</FeeTag>}
            />
            <MethodRadio
              label="CARTÃO DE CRÉDITO"
              value="credit"
              current={method}
              onSelect={setMethod}
              tag={<FeeTag tone="fee">+{CREDIT_CARD_FEE_BPS / 100}%</FeeTag>}
            />
          </fieldset>

          {method !== "pix" ? (
            <div className="mt-[28px] flex flex-col gap-[25px]">
              <TextField
                name="holder"
                label="Nome do titular do cartão *"
                type="text"
                autoComplete="cc-name"
                placeholder="Nome"
                error={fieldErrors.holder}
              />
              <TextField
                name="number"
                label="Número do cartão *"
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                maxLength={23}
                placeholder="**** **** **** ****"
                error={fieldErrors.number}
              />
              <div className="grid grid-cols-2 gap-x-[16px] lg:grid-cols-[225px_225px] lg:gap-x-[26px]">
                <TextField
                  name="expiry"
                  label="Validade (MM/AA) *"
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  maxLength={5}
                  placeholder="MM/AA"
                  error={fieldErrors.expiry}
                />
                <TextField
                  name="cvv"
                  label="Código do cartão *"
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  maxLength={4}
                  placeholder="CVV"
                  error={fieldErrors.cvv}
                />
              </div>
              <SelectField
                name="installments"
                label="Número de parcelas"
                placeholder="Escolha as parcelas"
                value={String(effectiveInstallments)}
                onValueChange={(value) => setInstallments(Number(value))}
                options={installmentOptions(charge)}
              />
              <p className="-mt-[12px] font-helvetica text-[13px] leading-[18px] text-brand-placeholder">
                Taxa de {CREDIT_CARD_FEE_BPS / 100}% no cartão de crédito ({formatCents(fee)}). No PIX não há taxa.
              </p>
            </div>
          ) : (
            <p className="mt-[28px] rounded-[15px] border border-white/10 bg-[image:var(--brand-surface-fill)] px-[25px] py-[20px] font-helvetica text-[16px] leading-[24px] text-brand-fg-muted">
              Ao confirmar, geramos o QR Code do PIX. Você tem 30 minutos para
              pagar, e a aprovação é automática.
            </p>
          )}

          <div className="mt-[25px] flex flex-col gap-[25px]">
            <SelectField
              // Sem `name` de propósito: o valor vem do estado (`coins`), e o
              // `<select>` escondido que o Radix cria com `name` disparava uma
              // troca falsa quando o carrinho hidratava, desmarcando o "Sim".
              label="Usar lets coins"
              placeholder="Não"
              value={useCoins && maxCoins > 0 ? "sim" : "nao"}
              disabled={maxCoins === 0}
              onValueChange={(value) => {
                if (value === "sim" || value === "nao") setUseCoins(value === "sim");
              }}
              options={coinOptions(maxCoins, coinCents)}
            />

            <TextField
              name="notes"
              label="Informações adicionais"
              type="text"
              maxLength={500}
              placeholder="Adicionar informações"
              error={fieldErrors.notes}
            />
          </div>

          <div aria-hidden className="mt-[25px] h-px w-full bg-white/25" />

          {formError ? (
            <p
              role="alert"
              className="mt-[25px] rounded-2xl border border-red-9/40 bg-red-9/10 px-4 py-3 text-center font-helvetica text-[14px] text-red-9"
            >
              {formError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || !hydrated || items.length === 0}
            className="mt-[26px] flex h-[50px] w-full items-center justify-center rounded-full border border-[var(--brand-stroke-soft)] bg-[image:var(--brand-orange-gradient)] font-poppins text-[16px] font-bold tracking-[0.16px] text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "PROCESSANDO..." : `PAGAR ${formatCents(charge)}`}
          </button>

          {whatsappHref ? (
            <>
              <p className="mt-[15px] text-center font-helvetica text-[14px] leading-[16px] tracking-[0.14px] text-brand-placeholder">
                <strong className="font-bold text-white">
                  É novo por aqui?
                </strong>{" "}
                Se preferir pode fechar o pedido pelo nosso{" "}
                <strong className="font-bold text-white">WhatsApp</strong>
              </p>

              <a
                href={whatsappHref}
                // Sai do site: nova aba, e sem `window.opener` para a página de fora.
                target="_blank"
                rel="noopener noreferrer"
                className="brand-ring mt-[22px] flex h-[50px] w-full items-center justify-center gap-[12px] rounded-full bg-[image:var(--brand-surface-fill)] font-poppins text-[16px] font-bold tracking-[0.16px] text-white transition-opacity hover:opacity-90"
              >
                <Image
                  src="/icons/social/whatsapp.svg"
                  alt=""
                  width={21}
                  height={21}
                  aria-hidden
                  className="size-[21px]"
                />
                FALE COM UM ESPECIALISTA
              </a>
            </>
          ) : null}
        </form>
      </div>

      {/* Painel do pedido: 841px fixos, encostado na direita. Desde 2026-10-12
          no MESMO estilo da gaveta do carrinho (pedido do usuário): linhas
          compactas editáveis, cupom enxuto, cashback e brinde em cartão, e os
          totais no fim. */}
      <CheckoutSidePanel mobileFirst>
        <PanelReferencesRow referencesHref={referencesHref} />

        <h2 className="mt-[34px] flex items-baseline gap-[10px] font-poppins text-[20px] font-semibold tracking-[-0.4px] text-white">
          Resumo do pedido
          {hydrated && items.length > 0 ? (
            <span className="font-helvetica text-[14px] font-normal tracking-normal text-brand-fg-muted">
              {itemCount(items)} {itemCount(items) === 1 ? "item" : "itens"}
            </span>
          ) : null}
        </h2>

        {hydrated && items.length === 0 ? (
          <p className="mt-[14px] rounded-[16px] border border-white/10 px-[18px] py-[28px] text-center font-helvetica text-[15px] text-brand-fg-muted">
            Seu carrinho está vazio.
          </p>
        ) : (
          <ul className="mt-[10px] border-y border-white/10">
            {items.map((item) => (
              <CartRow key={item.id} item={item} />
            ))}
          </ul>
        )}

        {/* Cupom (2026-10-12): aplicado vira uma linha com o código e "Remover". */}
        {coupon ? (
          <div className="mt-[18px] flex items-center justify-between gap-[12px] rounded-full border border-[#22c55e]/40 bg-[#22c55e]/[0.06] py-[8px] pr-[8px] pl-[20px]">
            <p className="min-w-0 truncate font-poppins text-[14px] text-white">
              Cupom <strong className="font-bold">{coupon.code}</strong>
              {couponTotal > 0 ? <span className="text-[#4ade80]"> · − {formatCents(couponTotal)}</span> : null}
            </p>
            <button
              type="button"
              onClick={removeCoupon}
              className="h-[32px] shrink-0 rounded-full px-[14px] font-poppins text-[12px] font-bold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              Remover
            </button>
          </div>
        ) : (
          <form
            className="mt-[18px] flex gap-[10px]"
            onSubmit={(event) => {
              event.preventDefault();
              void applyCoupon();
            }}
          >
            <input
              type="text"
              value={couponInput}
              onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
              maxLength={40}
              autoComplete="off"
              aria-label="Cupom de desconto"
              placeholder="Cupom de desconto"
              className="h-[44px] min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.03] px-[20px] font-poppins text-[14px] text-white uppercase outline-none placeholder:text-white/50 placeholder:normal-case focus-visible:border-brand-orange"
            />
            <button
              type="submit"
              disabled={couponBusy || couponInput.trim() === "" || items.length === 0}
              className="h-[44px] shrink-0 rounded-full border border-brand-border px-[22px] font-poppins text-[13px] font-bold text-white transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {couponBusy ? "..." : "APLICAR"}
            </button>
          </form>
        )}
        {coupon && couponResult && !couponResult.ok ? (
          <p role="status" className="mt-[8px] font-helvetica text-[13px] text-amber-300">
            {couponResult.reason === "MIN_SUBTOTAL" && coupon.minSubtotalCents !== null
              ? `Este cupom vale a partir de ${formatCents(coupon.minSubtotalCents)} nos itens participantes.`
              : "Este cupom não vale para os itens do carrinho."}
          </p>
        ) : null}
        {couponBlocksCoins && couponTotal > 0 ? (
          <p className="mt-[8px] font-helvetica text-[12px] text-brand-fg-muted">Este cupom não pode ser usado junto com Lets Coins.</p>
        ) : null}
        {couponNote ? (
          <p role="status" className="mt-[8px] font-helvetica text-[13px] text-brand-placeholder">
            {couponNote}
          </p>
        ) : null}

        <CheckoutCashback loyalty={loyalty} items={items} lineShares={rewardShares} className="mt-[18px]" />

        <GiftSummary
          gifts={giftList}
          className="mt-[12px]"
          note={
            discount > 0 || (couponTotal > 0 && rewardsCut)
              ? "Brinde calculado sobre o valor pago no jogo (descontos abatem). Entregue junto com o pedido."
              : "Brinde calculado sobre o valor pago no jogo. Entregue junto com o pedido."
          }
          extra={(gift) =>
            gift.result.amount > 0 && gift.servers.length > 1 ? (
              <SelectField
                label="Receber o brinde em"
                value={chosenServer(gift, giftChoice).productId}
                onValueChange={(productId) => setGiftChoice((current) => ({ ...current, [gift.gameSlug]: productId }))}
                options={gift.servers.map((server) => ({ value: server.productId, label: server.label }))}
              />
            ) : null
          }
        />

        {/* Subtotal e desconto só quando HÁ desconto (Lets Coins), como na
            gaveta: sem ele o subtotal repete o total. */}
        <dl className="mt-[18px] flex flex-col gap-[8px] border-t border-white/10 pt-[16px]">
          {discount > 0 || couponTotal > 0 || fee > 0 ? (
            <div className="flex items-baseline justify-between">
              <dt className="font-helvetica text-[14px] text-white/70">Subtotal</dt>
              <dd className="font-poppins text-[14px] font-semibold text-white">{formatCents(subtotal)}</dd>
            </div>
          ) : null}
          {couponTotal > 0 && coupon ? (
            <div className="flex items-baseline justify-between">
              <dt className="font-helvetica text-[14px] text-white/70">Cupom {coupon.code}</dt>
              <dd className="font-poppins text-[14px] font-semibold text-[#22c55e]">− {formatCents(couponTotal)}</dd>
            </div>
          ) : null}
          {discount > 0 ? (
            <div className="flex items-baseline justify-between">
              <dt className="font-helvetica text-[14px] text-white/70">Desconto (Lets Coins)</dt>
              <dd className="font-poppins text-[14px] font-semibold text-[#22c55e]">− {formatCents(discount)}</dd>
            </div>
          ) : null}
          {fee > 0 ? (
            <div className="flex items-baseline justify-between">
              <dt className="font-helvetica text-[14px] text-white/70">Taxa do cartão ({CREDIT_CARD_FEE_BPS / 100}%)</dt>
              <dd className="font-poppins text-[14px] font-semibold text-white">+ {formatCents(fee)}</dd>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between">
            <dt className="font-helvetica text-[18px] font-bold text-white">Total</dt>
            <dd className="font-poppins text-[22px] leading-none font-semibold text-white">{formatCents(charge)}</dd>
          </div>
        </dl>
      </CheckoutSidePanel>
    </div>
  );
}

/**
 * Rádio do arquivo (2568:1551/1554): círculo de 27px com o miolo laranja quando
 * escolhido. É um `<input type="radio">` de verdade por baixo — o desenho é
 * customizado, o comportamento (teclado, leitor de tela, agrupamento) não.
 */
function MethodRadio({
  label,
  value,
  current,
  onSelect,
  tag,
}: {
  label: string;
  value: Method;
  current: Method;
  onSelect: (value: Method) => void;
  /** Selo do custo ao lado do nome ("SEM TAXA", "+5%"). */
  tag?: ReactNode;
}) {
  const checked = current === value;
  return (
    <label className="flex cursor-pointer items-center gap-[13px]">
      <input
        type="radio"
        name="method"
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`flex size-[27px] items-center justify-center rounded-full border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-orange peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-brand-bg ${
          checked ? "border-brand-orange" : "border-white/40"
        }`}
      >
        {checked ? (
          <span className="size-[13px] rounded-full bg-[image:var(--brand-orange-gradient)]" />
        ) : null}
      </span>
      <span className="font-poppins text-[15px] leading-[19px] font-bold tracking-[0.15px] text-white">
        {label}
      </span>
      {tag}
    </label>
  );
}

/**
 * Selo mínimo do custo de cada forma (2026-10-27): pílula fina, sem ícone. O
 * verde só no "sem taxa" — é a vantagem que se quer mostrar; a taxa do crédito
 * fica neutra, informada sem alarde.
 */
function FeeTag({ tone, children }: { tone: "free" | "fee"; children: ReactNode }) {
  return (
    <span
      className={`rounded-full border px-[8px] py-[2px] font-poppins text-[11px] leading-[14px] font-semibold tracking-[0.3px] ${
        tone === "free" ? "border-[#22c55e]/40 bg-[#22c55e]/10 text-[#4ade80]" : "border-white/15 text-white/60"
      }`}
    >
      {children}
    </span>
  );
}

/**
 * Cashback da compra no checkout — o MESMO cartão da gaveta (2026-10-12).
 *
 * Sobre o valor PAGO de cada linha (cheio − as Lets Coins que ela carregou,
 * `lineShares`), que é a base do backend (`cashbackCoinsFor`, por pedido). O
 * nível vem pronto do `GET /me/loyalty`; sem sessão, o primeiro nível e o
 * convite para entrar.
 */
function CheckoutCashback({
  loyalty,
  items,
  lineShares,
  className,
}: {
  loyalty: LoyaltySummary | null;
  items: { unitPriceCents: number; quantity: number }[];
  lineShares: { cents: number }[];
  className?: string;
}) {
  const tierKey = loyalty?.tier ?? "BRONZE";
  const bps = loyalty?.cashbackBps ?? 100;
  const paidLines = items.map((item, index) => ({
    unitPriceCents: Math.max(0, item.unitPriceCents * item.quantity - (lineShares[index]?.cents ?? 0)),
    quantity: 1,
  }));
  const { coins, cents } = estimateCashback(paidLines, bps, loyalty?.coinCents || FALLBACK_COIN_CENTS);
  if (bps <= 0 || cents <= 0) return null;

  return (
    <CashbackSummary
      className={className}
      icon={tierArt(tierKey, loyalty?.tiers.find((tier) => tier.tier === tierKey)?.iconUrl).icon}
      cents={cents}
      coins={coins}
      bps={bps}
      tierName={loyalty?.tierName ?? "Bronze"}
      invite={!loyalty}
      nextTierName={loyalty?.nextTierName}
      missingToNextCents={loyalty?.missingToNextCents}
    />
  );
}

/** "1x de R$ 500,00 (R$ 500,00)" — sem juros, que é o que o arquivo mostra. */
/**
 * O servidor que recebe o brinde de um jogo: o escolhido, se ainda estiver no
 * carrinho; senão o primeiro (o mesmo padrão do backend sem escolha).
 */
function chosenServer(gift: CartGift, choice: Record<string, string>) {
  return gift.servers.find((server) => server.productId === choice[gift.gameSlug]) ?? gift.servers[0];
}

function installmentOptions(totalCents: number) {
  return Array.from({ length: maxInstallmentsFor(totalCents) }, (_, index) => {
    const times = index + 1;
    return {
      value: String(times),
      label: `${times}x de ${formatCents(Math.round(totalCents / times))} (${formatCents(totalCents)})`,
    };
  });
}

/**
 * Opções de Lets Coins: só SIM ou NÃO (2026-10-27, pedido do usuário; antes
 * eram frações de 25/50/75/100%). Sim usa o máximo utilizável, o menor entre o
 * saldo e o valor do carrinho, e o rótulo diz quanto é.
 */
function coinOptions(maxCoins: number, coinCents: number) {
  if (maxCoins === 0) return [{ value: "nao", label: "Nenhuma Lets Coin disponível" }];
  return [
    {
      value: "sim",
      label: `Sim (${maxCoins.toLocaleString("pt-BR")} Lets Coins · ${formatCents(maxCoins * coinCents)})`,
    },
    { value: "nao", label: "Não" },
  ];
}
