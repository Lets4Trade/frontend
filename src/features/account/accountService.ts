import type { EditProfileValues } from "./schema";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

/** Mesmo gate fail-secure do `authService`: mock só fora de produção e sem API. */
const USE_MOCK = process.env.NODE_ENV !== "production" && API_URL === "";

export type AccountErrorCode =
  | "email_taken"
  | "name_taken"
  | "unauthorized"
  | "network"
  | "unknown";

export class AccountError extends Error {
  readonly code: AccountErrorCode;

  constructor(code: AccountErrorCode, message: string) {
    super(message);
    this.name = "AccountError";
    this.code = code;
  }
}

export const ACCOUNT_ERROR_MESSAGES: Record<AccountErrorCode, string> = {
  email_taken: "Este e-mail já está em uso por outra conta.",
  name_taken: "Este nome de usuário já está em uso.",
  unauthorized: "Sua sessão expirou. Entre novamente.",
  network: "Não foi possível conectar. Verifique sua internet.",
  unknown: "Não conseguimos salvar agora. Tente novamente em instantes.",
};

/**
 * ⚠️ PONTO DE TROCA — atualização do perfil.
 *
 * Contrato esperado em `PATCH /me`:
 *   request  → { name, email, discord, whatsapp, password? }
 *   200      → { user: { id, name, email } }
 *   401      → sessão inválida/expirada
 *   409      → { field: "email" | "name" }
 *
 * `password` só vai no corpo quando o usuário digitou algo — mandar string
 * vazia faria o servidor reescrever o hash com uma senha em branco caso a
 * validação de lá fosse permissiva.
 *
 * PENDÊNCIAS do lado do servidor:
 *  - exigir a senha ATUAL para confirmar troca de senha ou de e-mail; sem isso,
 *    uma sessão sequestrada muda as credenciais e expulsa o dono da conta;
 *  - reemitir a sessão após troca de senha e invalidar as demais;
 *  - confirmar o novo e-mail por link antes de passar a usá-lo para login.
 */
export async function updateProfile(
  values: EditProfileValues,
  signal?: AbortSignal,
): Promise<void> {
  const payload: Record<string, string> = {
    name: values.name,
    email: values.email,
    discord: values.discord,
    whatsapp: values.whatsapp,
  };
  if (values.password !== "") payload.password = values.password;

  if (USE_MOCK) {
    await delay(700, signal);
    if (values.email.includes("usado")) {
      throw new AccountError("email_taken", "E-mail em uso (mock).");
    }
    return;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
      signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new AccountError("network", "Falha de rede ao salvar.");
  }

  if (!response.ok) {
    throw new AccountError(await codeFromResponse(response), "Falha ao salvar.");
  }
}

async function codeFromResponse(response: Response): Promise<AccountErrorCode> {
  if (response.status === 401) return "unauthorized";
  if (response.status === 409) {
    try {
      const body = (await response.json()) as { field?: string };
      if (body.field === "email") return "email_taken";
      if (body.field === "name") return "name_taken";
    } catch {
      /* corpo ausente ou inválido — cai no genérico */
    }
  }
  return "unknown";
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
