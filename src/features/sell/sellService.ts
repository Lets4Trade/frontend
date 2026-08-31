import type { SellFormValues } from "./schema";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

/** Mesmo gate fail-secure do `authService`: mock só fora de produção e sem API. */
const USE_MOCK = process.env.NODE_ENV !== "production" && API_URL === "";

export type SellErrorCode = "rate_limited" | "network" | "unknown";

export class SellError extends Error {
  readonly code: SellErrorCode;

  constructor(code: SellErrorCode, message: string) {
    super(message);
    this.name = "SellError";
    this.code = code;
  }
}

export const SELL_ERROR_MESSAGES: Record<SellErrorCode, string> = {
  rate_limited: "Muitos envios. Aguarde alguns minutos e tente de novo.",
  network: "Não foi possível conectar. Verifique sua internet.",
  unknown: "Não conseguimos enviar agora. Tente novamente em instantes.",
};

/**
 * ⚠️ PONTO DE TROCA — envio da proposta de venda.
 *
 * Contrato esperado em `POST /sell-requests`:
 *   request  → { jogo, plataforma, servidor, tipoProduto, discord, whatsapp, descricao }
 *   201      → { id }
 *   429      → { code: "rate_limited" }
 *
 * PENDÊNCIAS do lado do servidor:
 *  - o formulário é PÚBLICO (não exige login), então é alvo fácil de spam:
 *    rate limiting por IP e Turnstile são necessários, não opcionais;
 *  - revalidar os `value` dos selects contra o catálogo real — o cliente pode
 *    mandar qualquer string;
 *  - tratar `descricao` como texto não confiável ao exibir no painel interno
 *    (`isomorphic-dompurify` já está no projeto).
 */
export async function submitSellRequest(
  values: SellFormValues,
  signal?: AbortSignal,
): Promise<{ id: string }> {
  if (USE_MOCK) {
    await delay(700, signal);
    return { id: "mock-sell-1" };
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}/sell-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(values),
      signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new SellError("network", "Falha de rede ao enviar.");
  }

  if (!response.ok) {
    throw new SellError(
      response.status === 429 ? "rate_limited" : "unknown",
      "Falha ao enviar.",
    );
  }

  return (await response.json()) as { id: string };
}

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}
