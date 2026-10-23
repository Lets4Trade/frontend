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
 * Envio da proposta de venda — `POST /sell-requests` (existe desde 2026-10-23;
 * antes o formulário não chegava a lugar nenhum). A equipe vê em
 * `/admin/propostas`.
 *
 *   request  → { game, platform, server, productType, discord, whatsapp, description }
 *   201      → { data: { id } }
 *   400      → valor fora das listas / jogo inativo
 *   429      → freio por IP (3/min, 10/h — o formulário é público)
 *
 * Os nomes dos campos do FORMULÁRIO continuam em português (são os `name` dos
 * inputs); a API usa os nomes em inglês, como o resto do código.
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
      body: JSON.stringify({
        game: values.jogo,
        platform: values.plataforma,
        server: values.servidor,
        productType: values.tipoProduto,
        discord: values.discord,
        whatsapp: values.whatsapp,
        description: values.descricao,
      }),
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

  const body = (await response.json().catch(() => null)) as { data?: { id?: string } } | null;
  return { id: body?.data?.id ?? "" };
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
