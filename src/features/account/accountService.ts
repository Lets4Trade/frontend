import { PASSWORD_RULE_TEXT } from "@/features/auth/password";
import { fetchWithSession } from "@/lib/browserSession";
import type { EditProfileValues } from "./schema";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

export type AccountErrorCode =
  | "email_taken"
  | "name_taken"
  | "wrong_password"
  | "weak_password"
  | "invalid_code"
  | "no_api"
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
  wrong_password: "Senha atual incorreta.",
  weak_password: PASSWORD_RULE_TEXT,
  invalid_code: "Código inválido ou expirado. Peça um novo.",
  no_api: "Serviço indisponível no momento.",
  network: "Não foi possível conectar. Verifique sua internet.",
  unknown: "Não conseguimos salvar agora. Tente novamente em instantes.",
};

/**
 * Salvamento do painel "Minhas Informações".
 *
 * São TRÊS chamadas diferentes, e não uma, porque o backend trata perfil e
 * credencial de formas diferentes — de propósito:
 *
 *   PATCH /me                  → nome, Discord, WhatsApp. Não são credenciais,
 *                                então salvam direto.
 *   POST  /auth/change-password → exige a SENHA ATUAL.
 *   PATCH /auth/change-email    → exige a senha atual E manda um código de 6
 *                                dígitos para o e-mail ATUAL, confirmado depois
 *                                em POST /auth/verify-email-change.
 *
 * A confirmação por senha atual não é burocracia nossa: sem ela, uma sessão
 * sequestrada trocaria e-mail e senha e expulsaria o dono da conta. Era
 * exatamente a pendência anotada aqui quando este arquivo era mock.
 *
 * A ordem importa: os campos de perfil salvam primeiro. Se a troca de e-mail
 * falhar depois, o que já era seguro salvar ficou salvo.
 */
export type SaveProfileResult = {
  /** `true` quando o backend mandou o código e falta o usuário confirmar. */
  emailChangePending: boolean;
};

export async function saveProfile(
  values: EditProfileValues,
  currentEmail: string,
  signal?: AbortSignal,
): Promise<SaveProfileResult> {
  requireApi();

  await request("/me", "PATCH", {
    name: values.name,
    discord: values.discord,
    whatsapp: values.whatsapp,
  }, signal);

  if (values.password !== "") {
    await request(
      "/auth/change-password",
      "POST",
      { currentPassword: values.currentPassword, newPassword: values.password },
      signal,
    );
  }

  const emailChanged =
    values.email.trim().toLowerCase() !== currentEmail.trim().toLowerCase();

  if (emailChanged) {
    await request(
      "/auth/change-email",
      "PATCH",
      { newEmail: values.email, currentPassword: values.currentPassword },
      signal,
    );
  }

  return { emailChangePending: emailChanged };
}

/** Confirma a troca de e-mail com o código de 6 dígitos enviado ao e-mail atual. */
export async function confirmEmailChange(code: string, signal?: AbortSignal) {
  requireApi();
  await request("/auth/verify-email-change", "POST", { code }, signal);
}

function requireApi() {
  // Sem backend configurado NÃO existe caminho de mock: um "salvo com sucesso"
  // que não salvou nada é pior que um erro honesto. Era assim antes e é a
  // diferença entre a tela mentir e a tela avisar.
  if (API_URL === "") {
    throw new AccountError("no_api", "NEXT_PUBLIC_API_URL não configurada.");
  }
}

async function request(
  path: string,
  method: "PATCH" | "POST",
  body: Record<string, unknown>,
  signal?: AbortSignal,
) {
  let response: Response;
  try {
    // `fetchWithSession`: com o access de 15 minutos, uma página aberta há mais
    // tempo que isso mandaria um token vencido — e o 401 abaixo seria lido
    // como "senha atual incorreta". Ele renova uma vez e repete; só o 401 que
    // sobrevive à renovação chega a `toAccountError`.
    response = await fetchWithSession(`${API_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json", "x-pt-surface": "client" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new AccountError("network", "Falha de rede ao salvar.");
  }

  if (!response.ok) throw await toAccountError(response, path);
}

/**
 * Traduz a resposta do backend.
 *
 * O 401 aqui é lido como SENHA ATUAL ERRADA, e não como sessão expirada: as
 * rotas de credencial só são alcançadas com sessão válida (o guard rejeita
 * antes), então quem chega ao handler e leva 401 errou a senha. Se a sessão
 * tiver mesmo caído, o próximo carregamento da página manda para o login.
 */
async function toAccountError(response: Response, path: string) {
  const body = await readJson(response);
  const message = messageOf(body);

  if (response.status === 401) {
    return new AccountError("wrong_password", message || "Senha incorreta.");
  }

  if (response.status === 409) {
    if (fieldOf(body) === "name") return new AccountError("name_taken", message);
    return new AccountError("email_taken", message);
  }

  if (response.status === 400) {
    if (path.includes("verify-email-change")) {
      return new AccountError("invalid_code", message);
    }
    if (/e-?mail/i.test(message) && /uso/i.test(message)) {
      return new AccountError("email_taken", message);
    }
    if (path.includes("change-password")) {
      return new AccountError("weak_password", message);
    }
  }

  return new AccountError("unknown", message || "Falha ao salvar.");
}

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = await response.json();
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function messageOf(body: Record<string, unknown> | null): string {
  if (!body) return "";
  const raw = body.message;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
  // O ConflictException do backend manda `{ field, message }` dentro de
  // `message` quando o corpo é um objeto.
  if (typeof raw === "object" && raw !== null) {
    const nested = (raw as { message?: unknown }).message;
    if (typeof nested === "string") return nested;
  }
  return "";
}

function fieldOf(body: Record<string, unknown> | null): string | null {
  if (!body) return null;
  if (typeof body.field === "string") return body.field;
  const raw = body.message;
  if (typeof raw === "object" && raw !== null) {
    const field = (raw as { field?: unknown }).field;
    if (typeof field === "string") return field;
  }
  return null;
}
