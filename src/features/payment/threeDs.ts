"use client";

import { fetchThreeDsToken, type ThreeDsPayload } from "./api";

/**
 * Autenticação 3DS 2.0 do DÉBITO no navegador, pelo script MPI da Braspag
 * (2026-09-24). Portado do `useThreeDS` do PodioTicket, que já passou pelos
 * tropeços do SDK em produção — os comentários com "lição" são de lá.
 *
 * Fluxo: token do MPI (pelo backend) → campos `bpmpi_*` na página → o SDK
 * conversa com a Cardinal, que decide entre aprovar direto (frictionless) ou
 * abrir o DESAFIO do banco num iframe (SMS, app) → o resultado (CAVV, ECI) vai
 * junto do pagamento para a Cielo.
 *
 * O que mudou em relação ao PodioTicket:
 * - O AMBIENTE (sandbox × produção) vem do BACKEND junto do token. Lá era uma
 *   variável de build separada, e SDK de um ambiente com token do outro dá
 *   "Invalid JWT" (lição: aconteceu em homologação).
 * - Os campos escondidos são APAGADOS ao terminar. Lá o número do cartão
 *   ficava num `<input>` no DOM até a página fechar.
 */

declare global {
  interface Window {
    bpmpi_config?: () => Record<string, unknown>;
    bpmpi_authenticate?: () => void;
  }
}

export type ThreeDsErrorCode = "FAILURE" | "UNSUPPORTED_BRAND" | "SDK_ERROR" | "TOKEN_ERROR" | "DISABLED";

export class ThreeDsError extends Error {
  constructor(
    readonly code: ThreeDsErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ThreeDsError";
  }
}

type AuthParams = {
  paymentId: string;
  /** Tem que ser IDÊNTICO ao valor cobrado: divergência invalida o CAVV. */
  amountCents: number;
  card: { number: string; holder: string; expiry: string };
};

const SDK_URL = {
  PRD: "https://mpi.braspag.com.br/Scripts/BP.Mpi.3ds20.min.js",
  SDB: "https://mpisandbox.braspag.com.br/Scripts/BP.Mpi.3ds20.min.js",
} as const;

/** Desafio do banco pode esperar SMS/app: 5 minutos cobre o pior caso. */
const GLOBAL_TIMEOUT_MS = 5 * 60_000;
/** Iframe do desafio fechado sem resposta = cancelado na página do banco. */
const CHALLENGE_GRACE_MS = 15_000;
/** Id oficial do iframe do DESAFIO na Cardinal (Songbird v2). */
const CHALLENGE_IFRAME_ID = "Cardinal-CCA-IFrame";

const loaded: Partial<Record<keyof typeof SDK_URL, Promise<void>>> = {};

function loadSdk(environment: keyof typeof SDK_URL): Promise<void> {
  loaded[environment] ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL[environment];
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      delete loaded[environment];
      reject(new ThreeDsError("SDK_ERROR", "Não conseguimos carregar a verificação do banco. Confira sua conexão."));
    };
    document.head.appendChild(script);
  });
  return loaded[environment]!;
}

/**
 * O SDK lê os campos pela CLASSE (`input.bpmpi_accesstoken`), não pelo id —
 * lição: criado com id, o `/3ds/init` volta 401.
 */
function setField(className: string, value: string) {
  let input = document.querySelector<HTMLInputElement>(`input.${CSS.escape(className)}`);
  if (!input) {
    input = document.createElement("input");
    input.type = "hidden";
    input.className = className;
    input.dataset.threeDs = "";
    document.body.appendChild(input);
  }
  input.value = value;
}

function clearFields() {
  document.querySelectorAll("input[data-three-ds]").forEach((input) => input.remove());
}

/** A doc passa o objeto direto; algumas versões do SDK embrulham em `detail`. */
function detail<T>(event: unknown): T {
  if (event && typeof event === "object" && "detail" in event && (event as { detail: unknown }).detail) {
    return (event as { detail: T }).detail;
  }
  return event as T;
}

export async function authenticateDebit(params: AuthParams): Promise<ThreeDsPayload> {
  const token = await fetchThreeDsToken(params.paymentId);
  if (!token) {
    throw new ThreeDsError("TOKEN_ERROR", "Não conseguimos iniciar a verificação do banco. Tente de novo.");
  }

  const [month, year] = params.card.expiry.split("/");
  setField("bpmpi_auth", "true");
  setField("bpmpi_auth_notifyonly", "false");
  setField("bpmpi_auth_suppresschallenge", "false");
  setField("bpmpi_accesstoken", token.accessToken);
  setField("bpmpi_ordernumber", params.paymentId);
  // ISO 4217 numérico — o SDK não aceita "BRL".
  setField("bpmpi_currency", "986");
  setField("bpmpi_totalamount", String(params.amountCents));
  setField("bpmpi_installments", "1");
  // "Debit" em Title Case: em cartão múltiplo, é o que diz QUAL função autenticar.
  setField("bpmpi_paymentmethod", "Debit");
  setField("bpmpi_cardnumber", params.card.number);
  setField("bpmpi_cardexpirationmonth", month);
  setField("bpmpi_cardexpirationyear", `20${year}`);
  setField("bpmpi_cardalias", params.card.holder);

  try {
    return await runSdk(token.environment);
  } finally {
    clearFields();
  }
}

function runSdk(environment: keyof typeof SDK_URL): Promise<ThreeDsPayload> {
  return new Promise<ThreeDsPayload>((resolve, reject) => {
    let settled = false;
    let cardinalRetried = false;
    let challengeIframe: Element | null = null;

    const finish = (done: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      observer.disconnect();
      done();
    };
    const fail = (code: ThreeDsErrorCode, message: string) =>
      finish(() => reject(new ThreeDsError(code, message)));

    const timeout = setTimeout(
      () => fail("SDK_ERROR", "A verificação do banco demorou demais. Tente de novo."),
      GLOBAL_TIMEOUT_MS,
    );

    // Lição do PodioTicket: fechar o desafio na página do banco, em vários
    // emissores, remove o iframe SEM chamar nenhum callback — e a tela ficaria
    // "processando" até o teto de 5 minutos. Iframe do desafio sumiu e nada
    // chegou em 15 s = cancelado.
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (!(node instanceof Element)) continue;
          const iframe = node.id === CHALLENGE_IFRAME_ID ? node : node.querySelector(`#${CHALLENGE_IFRAME_ID}`);
          if (iframe) challengeIframe = iframe;
        }
        for (const node of Array.from(mutation.removedNodes)) {
          if (!challengeIframe) continue;
          if (node === challengeIframe || (node instanceof Element && node.contains(challengeIframe))) {
            challengeIframe = null;
            setTimeout(() => {
              if (!settled && !challengeIframe) {
                fail("FAILURE", "A verificação no banco não foi concluída. Tente de novo.");
              }
            }, CHALLENGE_GRACE_MS);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const authenticate = () => {
      if (typeof window.bpmpi_authenticate !== "function") {
        fail("SDK_ERROR", "Não conseguimos carregar a verificação do banco.");
        return;
      }
      try {
        window.bpmpi_authenticate();
      } catch (error) {
        // Lição: na 1ª chamada o SDK usa a Cardinal antes de ela carregar.
        if (!cardinalRetried && /Cardinal is not defined/i.test(String((error as Error)?.message))) {
          cardinalRetried = true;
          setTimeout(() => !settled && authenticate(), 1000);
          return;
        }
        fail("SDK_ERROR", "Erro na verificação do banco. Tente de novo.");
      }
    };

    // O SDK chama `bpmpi_config()` — tem que ser FUNÇÃO (lição: objeto dá
    // "bpmpi_config is not a function").
    window.bpmpi_config = () => ({
      Environment: environment,
      Debug: environment === "SDB",
      onReady: () => {},
      onSuccess: (event: unknown) => {
        const d = detail<{ Cavv?: string; Eci?: string; Xid?: string; ReferenceId?: string; Version?: string }>(event);
        finish(() =>
          resolve({
            cavv: d.Cavv || undefined,
            eci: String(d.Eci ?? ""),
            xid: d.Xid || undefined,
            referenceId: d.ReferenceId || undefined,
            version: d.Version || undefined,
          }),
        );
      },
      // Cartão fora do 3DS: segue sem CAVV e a Cielo manda para o banco.
      onUnenrolled: (event: unknown) => {
        const d = detail<{ Eci?: string }>(event);
        finish(() => resolve({ eci: String(d.Eci ?? "") }));
      },
      onFailure: () => fail("FAILURE", "O banco não autorizou a compra no débito. Use outro cartão ou PIX."),
      onDisabled: () => fail("DISABLED", "Débito indisponível no momento. Use crédito ou PIX."),
      onUnsupportedBrand: () =>
        fail("UNSUPPORTED_BRAND", "Esta bandeira não aceita débito online. Use crédito ou PIX."),
      onError: (event: unknown) => {
        const d = detail<{ ReturnMessage?: string }>(event);
        if (!cardinalRetried && /Cardinal is not defined/i.test(String(d?.ReturnMessage ?? ""))) {
          cardinalRetried = true;
          setTimeout(() => !settled && authenticate(), 1000);
          return;
        }
        fail("SDK_ERROR", "Erro na verificação do banco. Tente de novo.");
      },
    });

    loadSdk(environment)
      .then(authenticate)
      .catch((error: unknown) =>
        fail(
          "SDK_ERROR",
          error instanceof ThreeDsError ? error.message : "Não conseguimos carregar a verificação do banco.",
        ),
      );
  });
}
