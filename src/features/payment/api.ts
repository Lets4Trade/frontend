import { fetchWithSession } from "@/lib/browserSession";
import type { PaymentMethod, PaymentView } from "./types";

/**
 * Chamadas de pagamento feitas PELO NAVEGADOR direto à API (2026-09-24).
 *
 * ── Por que não um server action, como o fechamento do carrinho ──────────
 * O corpo do pagamento com cartão leva número e código de segurança. Passar
 * pelo servidor do Next seria mais um processo com o cartão na memória, mais um
 * lugar que pode logá-lo, e nenhum ganho: quem decide o valor é o backend, a
 * partir do `Payment` que ele mesmo criou. O navegador manda só O COMO pagar,
 * nunca o QUANTO. O cookie de sessão viaja com `credentials: "include"`, como
 * no chat.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

const HEADERS = {
  "content-type": "application/json",
  accept: "application/json",
  "x-pt-surface": "client",
};

export type PayRequest =
  | { method: Extract<PaymentMethod, "PIX"> }
  | {
      method: Extract<PaymentMethod, "CREDIT_CARD">;
      card: CardPayload;
      installments: number;
    }
  | {
      method: Extract<PaymentMethod, "DEBIT_CARD">;
      card: CardPayload;
      threeDs: ThreeDsPayload;
    };

export type CardPayload = { holder: string; number: string; expiry: string; cvv: string };

export type ThreeDsPayload = {
  cavv?: string;
  eci: string;
  xid?: string;
  version?: string;
  referenceId?: string;
};

export type PaymentCallResult =
  | { ok: true; payment: PaymentView }
  | {
      ok: false;
      status: number;
      /** Texto do backend — já é mensagem de tela (tabela fixa lá). */
      message: string;
    };

const GENERIC = "Não foi possível falar com o servidor. Tente de novo em instantes.";

async function call(path: string, init: RequestInit): Promise<PaymentCallResult> {
  if (API_URL === "") return { ok: false, status: 0, message: GENERIC };

  let response: Response;
  try {
    response = await fetchWithSession(`${API_URL}${path}`, { ...init, headers: HEADERS, cache: "no-store" });
  } catch {
    return { ok: false, status: 0, message: GENERIC };
  }

  let body: { data?: PaymentView; message?: unknown } | null = null;
  try {
    body = await response.json();
  } catch {
    // resposta sem JSON: fica a genérica
  }

  if (response.ok && body?.data) return { ok: true, payment: normalizePayment(body.data) };

  if (response.status === 401) {
    return { ok: false, status: 401, message: "Sua sessão expirou. Entre de novo para pagar." };
  }
  // O backend escreve mensagens de TELA para 4xx de pagamento (tabela fixa por
  // código da Cielo) e para o 503 de operadora fora. Texto, nunca HTML — e com
  // teto, por via das dúvidas. Outros 5xx são erro interno: genérica.
  const readable = response.status < 500 || response.status === 503;
  const message =
    readable && typeof body?.message === "string" && body.message.length < 300
      ? body.message
      : GENERIC;
  return { ok: false, status: response.status, message };
}

/**
 * O interceptor de compressão do backend APAGA campos `null`/vazios da
 * resposta. Os que a tela lê sem checar voltam a um padrão aqui, num lugar só.
 */
export function normalizePayment(raw: PaymentView): PaymentView {
  return {
    ...raw,
    amountCents: raw.amountCents ?? 0,
    attemptsLeft: raw.attemptsLeft ?? 0,
    maxInstallments: raw.maxInstallments ?? 1,
    processing: raw.processing ?? false,
    orders: raw.orders ?? [],
  };
}

export function payPayment(id: string, request: PayRequest) {
  return call(`/payments/${encodeURIComponent(id)}/pay`, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function fetchPaymentStatus(id: string) {
  return call(`/payments/${encodeURIComponent(id)}/status`, { method: "GET" });
}

/** SÓ SANDBOX — o backend responde 404 em produção. */
export function sandboxPayPix(id: string) {
  return call(`/payments/${encodeURIComponent(id)}/sandbox/pix-pago`, { method: "POST" });
}

export async function fetchThreeDsToken(
  id: string,
): Promise<{ accessToken: string; environment: "SDB" | "PRD" } | null> {
  if (API_URL === "") return null;
  try {
    const response = await fetchWithSession(
      `${API_URL}/payments/${encodeURIComponent(id)}/3ds-token`,
      { headers: HEADERS, cache: "no-store" },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as {
      data?: { accessToken?: string; environment?: string };
    };
    const token = body.data?.accessToken;
    if (!token) return null;
    return { accessToken: token, environment: body.data?.environment === "PRD" ? "PRD" : "SDB" };
  } catch {
    return null;
  }
}
