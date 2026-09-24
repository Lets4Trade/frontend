"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import {
  formatCents,
  subtotalCents,
  useCart,
  useCartHydrated,
} from "@/features/cart/store";
import type { LoyaltySummary } from "@/features/loyalty/data";
import { formatBps, tierArt } from "@/features/loyalty/tiers";
import {
  OrderLineBlock,
  TotalsBlock,
} from "@/features/orders/OrderSummaryPieces";
import {
  CheckoutSidePanel,
  ReferencesBadge,
  ReferencesButton,
} from "./CheckoutPanel";
import { payPayment, type PaymentCallResult } from "@/features/payment/api";
import {
  cartSignature,
  clearPendingPayment,
  readPendingPayment,
  savePendingPayment,
} from "@/features/payment/pendingPayment";
import { ThreeDsError, authenticateDebit } from "@/features/payment/threeDs";
import { maxInstallmentsFor } from "@/features/payment/types";
import { checkoutAction, type CheckoutLine } from "./actions";
import { cardSchema, pixSchema } from "./schema";

/**
 * Cotação de reserva da Lets Coin, em centavos.
 *
 * O valor REAL vem do backend (`loyalty.coinCents`), que é quem define o
 * programa. Este só entra quando não há sessão — e aí o saldo é zero e a
 * cotação não chega a ser usada para nada. Manter os dois evita um `?? 10`
 * espalhado por quatro contas.
 */
const FALLBACK_COIN_CENTS = 10;

type Method = "credit" | "debit" | "pix";
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
  whatsappHref,
}: {
  loyalty: LoyaltySummary | null;
  /**
   * `https://wa.me/<dígitos>` do canal oficial, ou nada. Ausente, o convite
   * "fechar pelo WhatsApp" não aparece — ele apontava para `#` e não fazia
   * nada, justo no momento da compra.
   */
  whatsappHref?: string;
}) {
  const router = useRouter();

  const items = useCart((state) => state.items);
  const clear = useCart((state) => state.clear);
  const hydrated = useCartHydrated();

  const [method, setMethod] = useState<Method>("credit");
  const [coins, setCoins] = useState(0);
  const [installments, setInstallments] = useState(1);
  const [couponNote, setCouponNote] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = subtotalCents(items);
  const coinCents = loyalty?.coinCents || FALLBACK_COIN_CENTS;

  /**
   * O teto do desconto é o MENOR entre o saldo e o valor do carrinho.
   *
   * O mesmo teto existe no backend (`maxRedeemableCoins`), e é lá que ele vale:
   * este aqui serve para a tela não oferecer uma opção que seria recusada. Sem
   * o limite do carrinho, um pedido de R$ 10,00 aceitaria 500 coins e o total
   * ficaria negativo.
   */
  const maxCoins = loyalty
    ? Math.min(loyalty.coins, Math.floor(subtotal / coinCents))
    : 0;
  const discount = Math.min(coins, maxCoins) * coinCents;
  const total = Math.max(subtotal - discount, 0);
  // O total muda com as coins; a parcela escolhida antes pode ter ficado
  // abaixo do mínimo. Mesma regra do backend (`maxInstallmentsFor`).
  const effectiveInstallments = Math.min(installments, maxInstallmentsFor(total));

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
      coins: read("coins") || "0",
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
    const lines: CheckoutLine[] = items.map((item) => ({
      productId: item.productId,
      units: item.quantity,
    }));

    /**
     * As coins vão JUNTO com o carrinho.
     *
     * Até 2026-09-10 não iam: a tela calculava o desconto, mostrava o total
     * reduzido e mandava só os itens. O pedido nascia com o valor cheio e
     * nenhuma coin era debitada — a pessoa via R$ 20 a menos e pagava R$ 20 a
     * mais. Não dava prejuízo só porque nenhum saldo era creditado ainda.
     */
    const coinsToUse = Math.min(coins, maxCoins);
    const signature = cartSignature(lines, coinsToUse);

    // Tentativa anterior recusada, mesmo carrinho: cobra o MESMO pagamento.
    let pending = readPendingPayment(signature);
    if (!pending) {
      const created = await checkoutAction(lines, coinsToUse);
      if (!created.ok) {
        setIsSubmitting(false);
        handleCheckoutError(created.reason);
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
      if (method === "pix") {
        result = await payPayment(pending.id, { method: "PIX" });
      } else if (method === "credit") {
        result = await payPayment(pending.id, {
          method: "CREDIT_CARD",
          card: card!,
          installments: effectiveInstallments,
        });
      } else {
        // O valor autenticado no banco tem que ser o MESMO cobrado — o do
        // servidor, nunca o recalculado aqui.
        const threeDs = await authenticateDebit({
          paymentId: pending.id,
          amountCents: pending.amountCents,
          card: card!,
        });
        result = await payPayment(pending.id, { method: "DEBIT_CARD", card: card!, threeDs });
      }
    } catch (error) {
      setIsSubmitting(false);
      setFormError(
        error instanceof ThreeDsError
          ? error.message
          : "Não conseguimos processar o pagamento. Tente de novo em instantes.",
      );
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
    if (payment.redirectUrl) {
      // Débito fora do 3DS do navegador: autentica na página do banco, que
      // volta para `/pagamento/[id]` pelo backend.
      clear();
      clearPendingPayment();
      window.location.assign(payment.redirectUrl);
      return;
    }
    if (payment.status === "PAID" || payment.pix || payment.processing) {
      goToPayment(payment.id);
      return;
    }

    setIsSubmitting(false);
    setFormError(payment.lastError ?? "Pagamento não aprovado. Tente outra forma de pagamento.");
  }

  function goToPayment(id: string) {
    clear();
    clearPendingPayment();
    router.push(`/pagamento/${encodeURIComponent(id)}`);
  }

  function handleCheckoutError(reason: "unauthenticated" | "empty" | "invalid" | "error" | "coins") {
    if (reason === "unauthenticated") {
      router.push("/login?redirect=/checkout");
      return;
    }
    if (reason === "coins") {
      // O saldo mudou entre a escolha e o envio (outra aba, outro aparelho). É
      // o único erro deste fluxo que a pessoa resolve sozinha, então a tela
      // desfaz a escolha em vez de só reclamar.
      setCoins(0);
      setFormError(
        "Seu saldo de Lets Coins mudou. Escolha o desconto de novo e reenvie.",
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
    <div className="flex min-h-[1080px]">
      {/* Coluna do formulário: 476px centrados na faixa da esquerda, como no
          arquivo (302 de margem dos dois lados dentro dos 1079). */}
      <div className="flex flex-1 justify-center px-[50px] pt-[97px] pb-[60px]">
        <form noValidate onSubmit={handleSubmit} className="w-[476px]">
          <h1 className="font-poppins text-[22px] leading-[28px] font-semibold tracking-[-0.44px] text-white">
            Pagamento
          </h1>
          <div aria-hidden className="mt-[15px] h-px w-full bg-white/25" />

          {/* O arquivo desenha CRÉDITO e PIX; DÉBITO entrou com a Cielo e
              divide a mesma fileira — o vão encolhe de 40 para 28 para caber
              nos 476px. */}
          <fieldset className="mt-[23px] flex flex-wrap gap-x-[28px] gap-y-[14px]">
            <legend className="sr-only">Forma de pagamento</legend>
            <MethodRadio
              label="CARTÃO DE CRÉDITO"
              value="credit"
              current={method}
              onSelect={setMethod}
            />
            <MethodRadio
              label="DÉBITO"
              value="debit"
              current={method}
              onSelect={setMethod}
            />
            <MethodRadio
              label="PIX"
              value="pix"
              current={method}
              onSelect={setMethod}
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
              <div className="grid grid-cols-[225px_225px] gap-x-[26px]">
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
              {method === "credit" ? (
                <SelectField
                  name="installments"
                  label="Número de parcelas"
                  placeholder="Escolha as parcelas"
                  value={String(effectiveInstallments)}
                  onValueChange={(value) => setInstallments(Number(value))}
                  options={installmentOptions(total)}
                />
              ) : (
                <p className="font-helvetica text-[14px] leading-[20px] text-brand-placeholder">
                  No débito o seu banco pode pedir uma confirmação (SMS ou app)
                  antes de aprovar.
                </p>
              )}
            </div>
          ) : (
            <p className="mt-[28px] rounded-[15px] border border-white/10 bg-[image:var(--brand-surface-fill)] px-[25px] py-[20px] font-helvetica text-[16px] leading-[24px] text-brand-fg-muted">
              Ao confirmar, geramos o QR Code do PIX. Você tem 30 minutos para
              pagar — a aprovação é automática.
            </p>
          )}

          <div className="mt-[25px] flex flex-col gap-[25px]">
            <SelectField
              name="coins"
              label="Usar lets coins"
              placeholder="Não usar Lets Coins"
              value={String(coins)}
              disabled={maxCoins === 0}
              onValueChange={(value) => setCoins(Number(value))}
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
            {isSubmitting ? "PROCESSANDO..." : `PAGAR ${formatCents(total)}`}
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

      {/* Painel do pedido: 841px fixos, encostado na direita. */}
      <CheckoutSidePanel>
        <div className="flex items-center justify-between gap-[25px]">
          <ReferencesButton />
          <ReferencesBadge />
        </div>

        <h2 className="mt-[38px] font-poppins text-[22px] leading-[28px] font-semibold tracking-[-0.44px] text-white">
          Ordem
        </h2>
        <div aria-hidden className="mt-[15px] h-px w-full bg-white/25" />

        {hydrated && items.length === 0 ? (
          <p className="py-[40px] font-helvetica text-[16px] text-brand-fg-muted">
            Seu carrinho está vazio.
          </p>
        ) : (
          items.map((item) => (
            <OrderLineBlock
              key={item.id}
              line={{
                id: item.id,
                name: item.name,
                platform: item.platform,
                quantity: `${item.quantity}x`,
                price: formatCents(item.unitPriceCents * item.quantity),
                gameLogo: item.gameLogo,
                date: formatDate(item.addedAt),
              }}
            />
          ))
        )}

        <div aria-hidden className="mt-[26px] h-px w-full bg-white/25" />

        <p className="mt-[25px] font-helvetica text-[18px] leading-[18px] font-bold tracking-[0.18px] text-white">
          Cupom
        </p>
        <div className="mt-[15px] flex gap-[25px]">
          <input
            type="text"
            aria-label="Presente ou código de desconto"
            placeholder="Presente ou código de desconto"
            className="h-[50px] w-[476px] rounded-full border border-brand-border bg-[image:var(--brand-surface-fill)] px-[25px] font-poppins text-[16px] tracking-[0.16px] text-white outline-none placeholder:text-white/60 focus-visible:border-brand-orange"
          />
          <button
            type="button"
            onClick={() => setCouponNote("Cupons ainda não estão disponíveis.")}
            className="h-[50px] w-[141px] shrink-0 rounded-full border border-[var(--brand-stroke-soft)] bg-[image:var(--brand-orange-gradient)] font-poppins text-[16px] font-bold tracking-[0.16px] text-black transition-opacity hover:opacity-90"
          >
            APLICAR
          </button>
        </div>
        {couponNote ? (
          <p
            role="status"
            className="mt-[10px] font-helvetica text-[14px] text-brand-placeholder"
          >
            {couponNote}
          </p>
        ) : null}

        <div aria-hidden className="mt-[25px] h-px w-full bg-white/25" />

        <TotalsBlock
          price={formatCents(subtotal)}
          discount={formatCents(discount)}
          total={formatCents(total)}
        />

        <div aria-hidden className="mt-[26px] h-px w-full bg-white/25" />

        <CashbackCard loyalty={loyalty} />
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
}: {
  label: string;
  value: Method;
  current: Method;
  onSelect: (value: Method) => void;
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
    </label>
  );
}

/**
 * Card de cashback (3779:1839).
 *
 * Nível, percentual, progresso e o que falta vêm PRONTOS do backend
 * (`GET /me/loyalty`). Até 2026-09-10 a tela recalculava tudo a partir do total
 * gasto contra uma tabela de níveis que só existia no frontend — e o backend
 * não sabia que Prata começa em R$ 500 nem que rende 1,5%.
 *
 * Sem sessão cai no primeiro nível, com o que o backend declara como primeiro:
 * é a verdade para quem ainda não comprou, e continua sem tabela local.
 */
function CashbackCard({ loyalty }: { loyalty: LoyaltySummary | null }) {
  const art = tierArt(loyalty?.tier ?? "BRONZE");
  const name = loyalty?.tierName ?? "Bronze";
  const cashback = formatBps(loyalty?.cashbackBps ?? 100);
  const progress = loyalty?.progress ?? 0;
  const nextName = loyalty?.nextTierName ?? null;
  const missingCents = loyalty?.missingToNextCents ?? 0;

  return (
    <>
      <p className="mt-[26px] font-helvetica text-[22px] leading-[24px] font-bold tracking-[0.22px] text-white">
        {name}
      </p>
      <p className="mt-[5px] font-helvetica text-[16px] leading-[16px] tracking-[0.16px] text-brand-placeholder">
        Seu nível de cashback atual
      </p>

      <div className="mt-[26px] rounded-[15px] border border-white/10 bg-black p-[24px]">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-helvetica text-[14px] leading-[13px] font-bold tracking-[0.14px] text-white/80">
              Cashback
            </p>
            <p className="mt-[10px] bg-[image:var(--brand-orange-gradient)] bg-clip-text font-poppins text-[22px] leading-[27px] font-bold tracking-[0.22px] text-transparent">
              {cashback}
            </p>
          </div>
          <Image
            src={art.icon}
            alt=""
            width={62}
            height={62}
            aria-hidden
            className="size-[62px] object-contain"
          />
        </div>

        {nextName ? (
          <>
            <div aria-hidden className="mt-[18px] h-px w-full bg-white/25" />

            <div className="mt-[17px] flex items-baseline justify-between">
              <span className="font-helvetica text-[14px] leading-[13px] font-bold tracking-[0.14px] text-white/80">
                Progresso para o {nextName}
              </span>
              <span className="bg-[image:var(--brand-orange-gradient)] bg-clip-text font-helvetica text-[16px] font-bold tracking-[0.16px] text-transparent">
                {progress}%
              </span>
            </div>

            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label={`Progresso para o nível ${nextName}`}
              className="mt-[10px] h-[9px] w-full overflow-hidden rounded-[44px] border-[0.8px] border-white/10 bg-[image:var(--brand-surface-fill)]"
            >
              <div
                className="h-full rounded-[44px] bg-[image:var(--brand-orange-gradient)]"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="mt-[10px] font-helvetica text-[14px] leading-[16px] tracking-[0.14px] text-brand-placeholder">
              Faltam{" "}
              <strong className="font-bold">{formatCents(missingCents)}</strong>{" "}
              para o próximo nível
            </p>
          </>
        ) : (
          <p className="mt-[17px] font-helvetica text-[14px] leading-[16px] tracking-[0.14px] text-brand-placeholder">
            Você está no nível máximo.
          </p>
        )}
      </div>
    </>
  );
}

/** "1x de R$ 500,00 (R$ 500,00)" — sem juros, que é o que o arquivo mostra. */
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
 * Opções de Lets Coins. Em vez de listar moeda a moeda (o saldo pode ser
 * milhares), oferece frações do máximo utilizável — que é o menor entre o saldo
 * e o valor do carrinho.
 */
function coinOptions(maxCoins: number, coinCents: number) {
  if (maxCoins === 0)
    return [{ value: "0", label: "Nenhuma Lets Coin disponível" }];

  const steps = [0.25, 0.5, 0.75, 1]
    .map((fraction) => Math.floor(maxCoins * fraction))
    .filter((coins, index, all) => coins > 0 && all.indexOf(coins) === index);

  return [
    { value: "0", label: "Não usar Lets Coins" },
    ...steps.map((coins) => ({
      value: String(coins),
      label: `${coins.toLocaleString("pt-BR")} Lets Coins (${formatCents(coins * coinCents)})`,
    })),
  ];
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
