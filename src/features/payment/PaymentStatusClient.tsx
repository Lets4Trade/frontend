"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { formatBrl as formatCents } from "@/features/payment/types";
import { fetchPaymentStatus, payPayment, sandboxPayPix } from "./api";
import type { PaymentView } from "./types";

/** De quanto em quanto tempo a tela pergunta "já pagou?". */
const POLL_MS = 5000;

/** Só o alfabeto do base64 — o QR vai para um `src` de imagem. */
const BASE64 = /^[A-Za-z0-9+/=]+$/;

/**
 * Coluna esquerda de `/pagamento/[id]` (2026-09-24): o que fazer AGORA com este
 * pagamento.
 *
 * Enquanto está PENDENTE (PIX gerado, cartão em análise, débito no banco), a
 * tela pergunta ao backend a cada 5 s — e o backend pergunta à Cielo. O webhook
 * também confirma; a consulta existe porque o aviso pode atrasar, e quem está
 * olhando o QR não pode ficar esperando por ele. Aba escondida não consulta.
 */
export function PaymentStatusClient({ initial }: { initial: PaymentView }) {
  const [payment, setPayment] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pending = payment.status === "PENDING";

  const refresh = useCallback(async () => {
    const result = await fetchPaymentStatus(payment.id);
    if (result.ok) setPayment(result.payment);
  }, [payment.id]);

  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [pending, refresh]);

  async function payWithPix() {
    setBusy(true);
    setError(null);
    const result = await payPayment(payment.id, { method: "PIX" });
    setBusy(false);
    if (result.ok) setPayment(result.payment);
    else setError(result.message);
  }

  async function simulatePix() {
    setBusy(true);
    const result = await sandboxPayPix(payment.id);
    setBusy(false);
    if (result.ok) setPayment(result.payment);
    else setError(result.message);
  }

  return (
    <div className="w-[476px]">
      <h1 className="font-poppins text-[22px] leading-[28px] font-semibold tracking-[-0.44px] text-white">
        Pagamento
      </h1>
      <div aria-hidden className="mt-[15px] h-px w-full bg-white/25" />

      <div className="mt-[28px]" aria-live="polite">
        {payment.status === "PAID" ? (
          <Paid payment={payment} />
        ) : payment.status === "EXPIRED" ? (
          <Notice title="O prazo para pagar acabou">
            Os pedidos foram cancelados e as Lets Coins usadas voltaram para o seu
            saldo. Monte o carrinho de novo quando quiser.
          </Notice>
        ) : payment.status === "REFUNDED" ? (
          <Notice title="Pagamento estornado">
            O valor foi devolvido ao meio de pagamento usado. Dúvidas? Fale com o
            suporte.
          </Notice>
        ) : payment.status === "FAILED" ? (
          <Failed payment={payment} busy={busy} onPix={payWithPix} />
        ) : payment.pix?.code ? (
          <Pix payment={payment} busy={busy} onSimulate={simulatePix} />
        ) : payment.redirectUrl ? (
          <Notice title="Confirme no seu banco">
            Para aprovar o débito, o seu banco precisa confirmar a compra.
            <a
              href={payment.redirectUrl}
              className="mt-[20px] flex h-[50px] w-full items-center justify-center rounded-full border border-[var(--brand-stroke-soft)] bg-[image:var(--brand-orange-gradient)] font-poppins text-[16px] font-bold tracking-[0.16px] text-black transition-opacity hover:opacity-90"
            >
              CONTINUAR NO BANCO
            </a>
          </Notice>
        ) : (
          <Notice title="Pagamento em análise">
            A operadora está conferindo a compra. Esta tela atualiza sozinha — em
            geral leva poucos minutos.
          </Notice>
        )}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-[25px] rounded-2xl border border-red-9/40 bg-red-9/10 px-4 py-3 text-center font-helvetica text-[14px] text-red-9"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Paid({ payment }: { payment: PaymentView }) {
  return (
    <>
      <p className="bg-[image:var(--brand-orange-gradient)] bg-clip-text font-poppins text-[26px] leading-[32px] font-bold text-transparent">
        Pagamento aprovado!
      </p>
      <p className="mt-[12px] font-helvetica text-[16px] leading-[24px] text-brand-fg-muted">
        {payment.card
          ? `${payment.card.brand ?? "Cartão"} final ${payment.card.last4}${
              payment.card.installments > 1 ? ` em ${payment.card.installments}x` : ""
            }. `
          : ""}
        Seus pedidos já estão na fila de entrega. Acompanhe e converse com a
        equipe pela tela de cada pedido.
      </p>

      <ul className="mt-[25px] flex flex-col gap-[10px]">
        {payment.orders.map((order) => (
          <li key={order.reference}>
            <Link
              href={`/conta/pedidos/${encodeURIComponent(order.reference)}`}
              className="brand-ring flex h-[50px] items-center justify-between rounded-full bg-[image:var(--brand-surface-fill)] px-[25px] font-poppins text-[15px] text-white transition-opacity hover:opacity-90"
            >
              <span className="truncate">{order.productName}</span>
              <span className="ml-[15px] shrink-0 font-bold">{order.reference}</span>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href="/conta/pedidos"
        className="mt-[25px] flex h-[50px] w-full items-center justify-center rounded-full border border-[var(--brand-stroke-soft)] bg-[image:var(--brand-orange-gradient)] font-poppins text-[16px] font-bold tracking-[0.16px] text-black transition-opacity hover:opacity-90"
      >
        VER MEUS PEDIDOS
      </Link>
    </>
  );
}

function Pix({
  payment,
  busy,
  onSimulate,
}: {
  payment: PaymentView;
  busy: boolean;
  onSimulate: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const qr = payment.pix?.qrBase64 && BASE64.test(payment.pix.qrBase64) ? payment.pix.qrBase64 : null;
  const code = payment.pix?.code ?? "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Sem permissão de área de transferência: o campo continua selecionável.
    }
  }

  return (
    <>
      <p className="font-poppins text-[18px] font-bold text-white">
        Pague {formatCents(payment.amountCents)} com PIX
      </p>
      <Countdown until={payment.expiresAt} />

      {qr ? (
        // `<img>` e não `next/image`: é um data URL gerado pela Cielo, não há o
        // que otimizar nem host para autorizar.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`data:image/png;base64,${qr}`}
          alt="QR Code do PIX"
          width={240}
          height={240}
          className="mx-auto mt-[20px] size-[240px] rounded-[15px] bg-white p-[10px]"
        />
      ) : null}

      <label className="mt-[20px] block font-helvetica text-[14px] font-bold text-white/80" htmlFor="pix-code">
        PIX copia e cola
      </label>
      <div className="mt-[8px] flex gap-[10px]">
        <input
          id="pix-code"
          readOnly
          value={code}
          onFocus={(event) => event.currentTarget.select()}
          className="h-[50px] min-w-0 flex-1 rounded-full border border-brand-border bg-[image:var(--brand-surface-fill)] px-[20px] font-poppins text-[14px] text-white outline-none"
        />
        <button
          type="button"
          onClick={copy}
          className="h-[50px] w-[120px] shrink-0 rounded-full border border-[var(--brand-stroke-soft)] bg-[image:var(--brand-orange-gradient)] font-poppins text-[14px] font-bold text-black transition-opacity hover:opacity-90"
        >
          {copied ? "COPIADO!" : "COPIAR"}
        </button>
      </div>

      <p className="mt-[15px] font-helvetica text-[14px] leading-[20px] text-brand-placeholder">
        Abra o app do seu banco, escolha PIX e escaneie o código ou cole o texto.
        A confirmação aparece aqui sozinha.
      </p>

      {process.env.NODE_ENV !== "production" ? (
        <button
          type="button"
          disabled={busy}
          onClick={onSimulate}
          className="mt-[20px] h-[40px] w-full rounded-full border border-dashed border-white/30 font-poppins text-[13px] text-white/70 hover:text-white disabled:opacity-50"
        >
          SIMULAR PAGAMENTO (SANDBOX)
        </button>
      ) : null}
    </>
  );
}

function Failed({
  payment,
  busy,
  onPix,
}: {
  payment: PaymentView;
  busy: boolean;
  onPix: () => void;
}) {
  const now = useNow();
  const canRetry =
    payment.attemptsLeft > 0 && now !== null && new Date(payment.expiresAt).getTime() > now;

  return (
    <Notice title="Pagamento não aprovado">
      {payment.lastError ?? "A operadora não aprovou o pagamento."}
      {canRetry ? (
        <>
          <span className="mt-[10px] block">
            Seus pedidos continuam reservados até o prazo acabar. Você pode pagar
            com PIX agora:
          </span>
          <Countdown until={payment.expiresAt} />
          <button
            type="button"
            disabled={busy}
            onClick={onPix}
            className="mt-[20px] flex h-[50px] w-full items-center justify-center rounded-full border border-[var(--brand-stroke-soft)] bg-[image:var(--brand-orange-gradient)] font-poppins text-[16px] font-bold tracking-[0.16px] text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "GERANDO PIX..." : "PAGAR COM PIX"}
          </button>
        </>
      ) : null}
    </Notice>
  );
}

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[15px] border border-white/10 bg-[image:var(--brand-surface-fill)] px-[25px] py-[20px]">
      <p className="font-poppins text-[18px] font-bold text-white">{title}</p>
      <div className="mt-[8px] font-helvetica text-[16px] leading-[24px] text-brand-fg-muted">{children}</div>
    </div>
  );
}

/**
 * Relógio compartilhado, de segundo em segundo, como fonte EXTERNA do React.
 *
 * `null` no servidor e na hidratação: o relógio de lá e o daqui dariam textos
 * diferentes. Um intervalo só para todos os contadores da tela, e só enquanto
 * houver alguém ouvindo.
 */
const clock = {
  now: null as number | null,
  timer: 0,
  listeners: new Set<() => void>(),
  subscribe(listener: () => void) {
    clock.listeners.add(listener);
    if (clock.listeners.size === 1) {
      clock.now = Date.now();
      clock.timer = window.setInterval(() => {
        clock.now = Date.now();
        clock.listeners.forEach((notify) => notify());
      }, 1000);
    }
    return () => {
      clock.listeners.delete(listener);
      if (clock.listeners.size === 0) window.clearInterval(clock.timer);
    };
  },
};

function useNow() {
  return useSyncExternalStore(
    clock.subscribe,
    () => clock.now,
    () => null,
  );
}

/** "Expira em 12:34" — o prazo do PEDIDO, que é o que cancela a reserva. */
function Countdown({ until }: { until: string }) {
  const target = new Date(until).getTime();
  const now = useNow();

  if (now === null) return <p className="mt-[6px] h-[20px]" />;

  const left = Math.max(0, Math.floor((target - now) / 1000));
  const minutes = String(Math.floor(left / 60)).padStart(2, "0");
  const seconds = String(left % 60).padStart(2, "0");

  return (
    <p className="mt-[6px] font-helvetica text-[14px] text-brand-placeholder" role="timer">
      {left > 0 ? (
        <>
          Expira em <strong className="font-bold text-white">{minutes}:{seconds}</strong>
        </>
      ) : (
        "Prazo encerrado"
      )}
    </p>
  );
}
