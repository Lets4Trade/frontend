import {
  AuthError,
  type AuthErrorCode,
  type LoginCredentials,
  type LoginResult,
  SignupError,
  type SignupCredentials,
  type SignupErrorCode,
  type SignupResult,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

/**
 * Enquanto o backend não existe, o formulário precisa ser exercitável — dá pra
 * ver loading, erro e sucesso sem servidor. O mock só liga FORA de produção E
 * quando não há API configurada (fail secure: se alguém esquecer a env em
 * produção, a chamada real falha em vez de "autenticar" qualquer um).
 */
const USE_MOCK = process.env.NODE_ENV !== "production" && API_URL === "";

/**
 * ⚠️ PONTO DE TROCA — quando o servidor existir, este é o ÚNICO arquivo a mexer.
 *
 * Contrato esperado do backend em `POST /auth/login`:
 *   request  → { email, password }                     (JSON, HTTPS)
 *   200      → { user: { id, name, email } }
 *   401      → { code: "invalid_credentials" }
 *   429      → { code: "rate_limited" }
 *
 * SESSÃO: o servidor deve responder com `Set-Cookie` httpOnly + Secure +
 * SameSite=Lax carregando o token. NÃO devolva o token no corpo e NÃO o guarde
 * em localStorage/sessionStorage — qualquer XSS na página o leria. Por isso o
 * fetch abaixo usa `credentials: "include"`: o cookie vai e volta sozinho, sem
 * o JS nunca tocar no token.
 *
 * PENDÊNCIAS do lado do servidor (ver .claude/context/open-questions.md):
 *  - rate limiting por IP + por conta (brute-force / credential stuffing);
 *  - resposta e tempo idênticos para e-mail inexistente e senha errada;
 *  - hash Argon2id (ou bcrypt custo ≥ 12);
 *  - CSRF token se a sessão for por cookie e houver form POST cross-site;
 *  - Turnstile (`@marsidev/react-turnstile` já está instalado) após N falhas.
 */
export async function login(
  credentials: LoginCredentials,
  signal?: AbortSignal,
): Promise<LoginResult> {
  if (USE_MOCK) return mockLogin(credentials, signal);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Sessão por cookie httpOnly — ver nota acima.
      credentials: "include",
      body: JSON.stringify(credentials),
      signal,
    });
  } catch (cause) {
    // AbortError não é falha: é o usuário saindo da tela ou reenviando.
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new AuthError("network", "Falha de rede ao autenticar.");
  }

  if (!response.ok) {
    throw new AuthError(codeFromStatus(response.status), "Falha ao autenticar.");
  }

  return (await response.json()) as LoginResult;
}

function codeFromStatus(status: number): AuthErrorCode {
  if (status === 401 || status === 403) return "invalid_credentials";
  if (status === 429) return "rate_limited";
  return "unknown";
}

/* ────────────────────────── apenas desenvolvimento ────────────────────────── */

/**
 * Simulação local. Qualquer senha `123456` autentica; o resto cai em
 * `invalid_credentials`. Serve só para exercitar os estados da tela.
 */
async function mockLogin(
  { email, password }: LoginCredentials,
  signal?: AbortSignal,
): Promise<LoginResult> {
  await delay(700, signal);

  if (password !== "123456") {
    throw new AuthError("invalid_credentials", "Credenciais inválidas (mock).");
  }

  return {
    user: { id: "mock-1", name: email.split("@")[0] ?? "Jogador", email },
  };
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

/**
 * ⚠️ PONTO DE TROCA — cadastro. Mesmas regras do `login` acima.
 *
 * Contrato esperado em `POST /auth/signup`:
 *   request  → { email, name, password, whatsapp }   (JSON, HTTPS)
 *   201      → { user: { id, name, email } }
 *   409      → { field: "email" | "name" }           (colisão de unicidade)
 *   429      → { code: "rate_limited" }
 *
 * O servidor decide unicidade — o cliente não tem como saber. Por isso o 409
 * precisa dizer QUAL campo colidiu, para o formulário marcar o campo certo.
 *
 * PENDÊNCIAS do lado do servidor:
 *  - hash Argon2id (ou bcrypt custo ≥ 12) antes de persistir;
 *  - rate limiting por IP (cadastro em massa) e Turnstile — `@marsidev/react-turnstile`
 *    já está instalado;
 *  - verificação de e-mail e/ou do WhatsApp antes de liberar a conta;
 *  - normalizar o telefone para E.164 no servidor (é quem envia a mensagem).
 */
export async function signup(
  credentials: SignupCredentials,
  signal?: AbortSignal,
): Promise<SignupResult> {
  if (USE_MOCK) return mockSignup(credentials, signal);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(credentials),
      signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new SignupError("network", "Falha de rede ao cadastrar.");
  }

  if (!response.ok) {
    throw new SignupError(
      await signupCodeFromResponse(response),
      "Falha ao cadastrar.",
    );
  }

  return (await response.json()) as SignupResult;
}

async function signupCodeFromResponse(
  response: Response,
): Promise<SignupErrorCode> {
  if (response.status === 429) return "rate_limited";
  if (response.status === 409) {
    // O corpo diz qual campo colidiu. Se vier malformado, cai no genérico em
    // vez de estourar — erro de parse não pode virar tela branca.
    try {
      const body = (await response.json()) as { field?: string };
      if (body.field === "email") return "email_taken";
      if (body.field === "name") return "name_taken";
    } catch {
      /* corpo ausente ou inválido — segue para o genérico */
    }
  }
  return "unknown";
}

/** Simulação local: e-mail com "usado" colide; o resto passa. */
async function mockSignup(
  { email, name }: SignupCredentials,
  signal?: AbortSignal,
): Promise<SignupResult> {
  await delay(700, signal);

  if (email.includes("usado")) {
    throw new SignupError("email_taken", "E-mail já cadastrado (mock).");
  }
  if (name === "admin") {
    throw new SignupError("name_taken", "Nome já em uso (mock).");
  }

  return { user: { id: "mock-2", name, email } };
}
