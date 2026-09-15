/** Credenciais enviadas ao backend. NUNCA logar este objeto. */
export type LoginCredentials = {
  email: string;
  password: string;
};

/** Usuário autenticado. Só campos não sensíveis — sem token, sem hash. */
export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type LoginResult = {
  user: AuthUser;
};

/**
 * Códigos de falha que a UI sabe tratar.
 *
 * `invalid_credentials` é deliberadamente único para "e-mail não existe" e
 * "senha errada": distinguir os dois entrega um oráculo de enumeração de
 * contas a quem estiver sondando a base. O backend deve devolver o MESMO
 * código e, de preferência, o mesmo tempo de resposta nos dois casos.
 */
export type AuthErrorCode =
  | "invalid_credentials"
  | "rate_limited"
  | "network"
  | "unknown";

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

/** Mensagens exibidas ao usuário. Genéricas por design (ver acima). */
export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  rate_limited: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
  network: "Não foi possível conectar. Verifique sua internet.",
  unknown: "Algo deu errado. Tente novamente em instantes.",
};

/** Dados de cadastro. NUNCA logar este objeto (carrega senha em texto puro). */
export type SignupCredentials = {
  email: string;
  name: string;
  password: string;
  whatsapp: string;
};

export type SignupResult = {
  user: AuthUser;
};

/**
 * Falhas próprias do cadastro.
 *
 * `email_taken` e `name_taken` são separados de propósito, ao contrário do
 * login: aqui o usuário PRECISA saber qual campo trocar, e o dado já é público
 * de fato (qualquer tentativa de cadastro revela a colisão). O oráculo de
 * enumeração existe, e a defesa correta é rate limiting + captcha no servidor,
 * não esconder qual campo falhou — esconder só quebraria o formulário.
 */
export type SignupErrorCode =
  | "email_taken"
  | "name_taken"
  | "rate_limited"
  | "network"
  | "unknown";

export class SignupError extends Error {
  readonly code: SignupErrorCode;

  constructor(code: SignupErrorCode, message: string) {
    super(message);
    this.name = "SignupError";
    this.code = code;
  }
}

export const SIGNUP_ERROR_MESSAGES: Record<SignupErrorCode, string> = {
  email_taken: "Este e-mail já está cadastrado.",
  name_taken: "Este nome de usuário já está em uso.",
  rate_limited: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
  network: "Não foi possível conectar. Verifique sua internet.",
  unknown: "Algo deu errado. Tente novamente em instantes.",
};
