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
 * O backend isola as sessões de `admin`, `organizer` e `client` em jogos de
 * cookie separados e decide qual usar por este header (o default já é
 * `client`). A loja é sempre `client`; mandamos explícito para não depender do
 * default. O CORS do backend já declara `x-pt-surface` em `allowedHeaders` —
 * sem isso o preflight barraria toda requisição.
 */
const SURFACE_HEADERS = {
  "Content-Type": "application/json",
  "x-pt-surface": "client",
} as const;

/**
 * Enquanto o backend não existe, o formulário precisa ser exercitável — dá pra
 * ver loading, erro e sucesso sem servidor. O mock só liga FORA de produção E
 * quando não há API configurada (fail secure: se alguém esquecer a env em
 * produção, a chamada real falha em vez de "autenticar" qualquer um).
 */
const USE_MOCK = process.env.NODE_ENV !== "production" && API_URL === "";

/**
 * Contrato REAL do backend (../backend/src/app/auth/auth.controller.ts,
 * conferido em 2026-09-01):
 *   POST /auth/login  → body { email, password }, guardas Turnstile + Local
 *   200               → grava os cookies `pt_at_client`/`pt_rt_client`
 *                       (httpOnly) e `pt_authed_client` (dica, sem segredo)
 *   401               → credenciais inválidas
 *   429               → rate limit
 *
 * O Turnstile só é EXIGIDO quando `CLOUDFLARE_TURNSTILE_SECRET_KEY` existe no
 * backend; sem a chave, e fora de produção, o guard deixa passar. Em produção
 * a chave é obrigatória — aí o formulário precisará mandar `turnstileToken`
 * (o `@marsidev/react-turnstile` já está instalado). Ainda NÃO manda.
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
      headers: SURFACE_HEADERS,
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
 * Cadastro. Mesmas regras do `login` acima.
 *
 * Contrato REAL: `POST /auth/register` (NÃO `/auth/signup`) com
 * `EmailRegisterDto` — { email, password, name, whatsapp } e, opcionais,
 * { acceptedTerms, acceptedPrivacyPolicy, language }. Responde 201 JÁ
 * AUTOLOGADO (grava os cookies de sessão), 409 em colisão de e-mail.
 *
 * ⚠️ A senha passa por um regex no DTO do backend (`PASSWORD_REGEX`). O
 * `signupSchema` do front precisa exigir o mesmo, senão o usuário só descobre
 * a regra no 400 do servidor. Ver open-questions.md.
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
    // A rota do backend é `register`, não `signup` (ver auth.controller.ts).
    // Ela também JÁ AUTOLOGA: responde 201 gravando os cookies de sessão, então
    // não é preciso chamar o login em seguida.
    response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: SURFACE_HEADERS,
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
    // O backend responde `ConflictException` do Nest — corpo
    // { statusCode, message, error }, SEM um campo `field`. E o único conflito
    // que ele levanta no cadastro é de e-mail (o nome não é único). Por isso o
    // 409 vira `email_taken` por padrão, que é o que marca o campo certo no
    // formulário; antes caía no genérico e o usuário não sabia onde corrigir.
    //
    // O `field` continua sendo respeitado se um dia passar a vir — assim o dia
    // em que o backend adicionar unicidade de nome, só o servidor muda.
    try {
      const body = (await response.json()) as { field?: string };
      if (body.field === "name") return "name_taken";
    } catch {
      /* corpo ausente ou inválido — segue para o padrão de e-mail */
    }
    return "email_taken";
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

/**
 * Encerra a sessão.
 *
 * Quem apaga o cookie é o SERVIDOR (`POST /auth/logout` → `clearAuthCookies`):
 * o `pt_at_client` é httpOnly e o JS da página não consegue removê-lo. Um
 * "logout" só no cliente deixaria a sessão viva no backend — o usuário
 * pareceria deslogado e continuaria autenticado.
 *
 * Não lança: falhar o logout não pode prender ninguém na tela. Se a chamada
 * cair, quem chama segue para a home mesmo assim e o cookie expira sozinho.
 * O efeito colateral aceito é uma sessão que continua válida no servidor até
 * expirar — por isso a expiração curta do access token importa.
 */
export async function logout(signal?: AbortSignal): Promise<void> {
  if (API_URL === "") return;
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: SURFACE_HEADERS,
      credentials: "include",
      signal,
    });
  } catch {
    // Silencioso de propósito — ver nota acima.
  }
}
