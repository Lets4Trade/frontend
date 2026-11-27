"use client";

/**
 * Silent Order Post da Braspag (2026-11-27, pedido do usuário): o cartão vai do
 * NAVEGADOR direto à Braspag, que devolve um token. O número, a validade e o
 * CVV nunca passam pelo nosso backend — se o servidor for comprometido, não há
 * cartão para levar, e o escopo PCI da loja encolhe.
 *
 * Fluxo: AccessToken do SOP (backend, um por cartão) → campos com as classes
 * `bp-sop-*` que o script lê → `bpSop_silentOrderPost(opções)` → `onSuccess`
 * com o `PaymentToken` (uso único) ou, com `enableTokenize`, o `CardToken`
 * (cartão salvo). Mesmo padrão dos campos escondidos do 3DS (`threeDs.ts`),
 * apagados ao terminar.
 *
 * Script: um só endereço para sandbox e produção (o ambiente vai nas opções).
 * A CSP do `/checkout` libera `www.pagador.com.br` em `next.config.ts`.
 */

declare global {
  interface Window {
    bpSop_silentOrderPost?: (options: Record<string, unknown>) => void;
  }
}

const SCRIPT_URL = "https://www.pagador.com.br/post/scripts/silentorderpost-1.0.min.js";
/** A Braspag responde em segundos; 60 s cobre rede ruim sem prender o botão. */
const TIMEOUT_MS = 60_000;

export class SopError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SopError";
  }
}

export type SopCard = { holder: string; number: string; expiry: string; cvv: string };

export type SopResult = { paymentToken?: string; cardToken?: string };

let loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      reject(new SopError("Não conseguimos carregar o pagamento seguro do cartão. Confira sua conexão."));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** O script lê os campos pela CLASSE. Escondidos e apagados no fim. */
function setField(className: string, value: string) {
  let input = document.querySelector<HTMLInputElement>(`input.${CSS.escape(className)}`);
  if (!input) {
    input = document.createElement("input");
    input.type = "hidden";
    input.className = className;
    input.dataset.sop = "";
    document.body.appendChild(input);
  }
  input.value = value;
}

function clearFields() {
  document.querySelectorAll("input[data-sop]").forEach((input) => input.remove());
}

/** Primeiro campo inválido que a Braspag apontou, como texto para a tela. */
function invalidMessage(results: unknown): string {
  const list = Array.isArray(results) ? results : [];
  const first = list[0] as { Field?: string; Message?: string } | undefined;
  return first?.Message ? `Confira os dados do cartão: ${first.Message}` : "Confira os dados do cartão.";
}

/**
 * Tokeniza o cartão na Braspag. `tokenize` = "salvar cartão" marcado: devolve o
 * `CardToken` (permanente) em vez do `PaymentToken` (uso único).
 */
export async function tokenizeCard(params: {
  accessToken: string;
  environment: "sandbox" | "production";
  card: SopCard;
  tokenize: boolean;
}): Promise<SopResult> {
  await loadScript();
  if (typeof window.bpSop_silentOrderPost !== "function") {
    throw new SopError("Não conseguimos carregar o pagamento seguro do cartão.");
  }

  const [month, year] = params.card.expiry.split("/");
  setField("bp-sop-cardtype", "creditCard");
  setField("bp-sop-cardholdername", params.card.holder);
  setField("bp-sop-cardnumber", params.card.number);
  // A Braspag pede MM/AAAA.
  setField("bp-sop-cardexpirationdate", `${month}/20${year}`);
  setField("bp-sop-cardcvvc", params.card.cvv);

  try {
    return await new Promise<SopResult>((resolve, reject) => {
      let settled = false;
      const finish = (done: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        done();
      };
      const timer = setTimeout(
        () => finish(() => reject(new SopError("O pagamento seguro do cartão demorou demais. Tente de novo."))),
        TIMEOUT_MS,
      );

      window.bpSop_silentOrderPost!({
        accessToken: params.accessToken,
        environment: params.environment,
        language: "PT",
        enableTokenize: params.tokenize,
        cvvRequired: "true",
        enableBinQuery: false,
        enableVerifyCard: false,
        onSuccess: (response: { PaymentToken?: string; CardToken?: string }) =>
          finish(() => {
            const result: SopResult = params.tokenize
              ? { cardToken: response?.CardToken }
              : { paymentToken: response?.PaymentToken };
            if (!result.cardToken && !result.paymentToken) {
              reject(new SopError("Não conseguimos validar o cartão. Tente de novo."));
              return;
            }
            resolve(result);
          }),
        onError: () =>
          finish(() => reject(new SopError("Não conseguimos validar o cartão. Tente de novo ou pague com PIX."))),
        onInvalid: (results: unknown) => finish(() => reject(new SopError(invalidMessage(results)))),
      });
    });
  } finally {
    clearFields();
  }
}
