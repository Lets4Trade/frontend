/**
 * Renovação de sessão para chamadas feitas PELO NAVEGADOR direto ao backend.
 *
 * O `proxy.ts` renova a cada navegação. Mas uma página pode ficar aberta mais
 * que os 15 minutos do access token — e aí a próxima chamada do navegador
 * (salvar o perfil, reconectar o chat) volta 401 sem que o usuário tenha feito
 * nada errado. Na tela de conta isso era especialmente ruim: 401 lá significa
 * "senha atual incorreta", e a pessoa leria um erro que não cometeu.
 *
 * `fetchWithSession` tenta a chamada; se voltar 401, renova UMA vez e repete.
 * Se a repetição também voltar 401, o 401 é verdadeiro (senha errada, sessão
 * realmente encerrada) e sobe como sempre subiu.
 *
 * NÃO use em login e cadastro: ali 401 é credencial errada, e renovar não faz
 * sentido.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

/**
 * Uma renovação por vez. Várias chamadas que voltam 401 juntas esperam a MESMA
 * renovação em vez de disparar uma cada — o backend aceitaria (janela de graça),
 * mas seriam N pares de tokens emitidos para nada.
 */
let inflight: Promise<boolean> | null = null;

export function refreshSession(): Promise<boolean> {
  if (API_URL === "") return Promise.resolve(false);

  inflight ??= fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "x-pt-surface": "client", accept: "application/json" },
    credentials: "include",
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export async function fetchWithSession(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const withCookies: RequestInit = { ...init, credentials: "include" };

  const response = await fetch(input, withCookies);
  if (response.status !== 401) return response;

  // Corpo com stream (FormData grande, ReadableStream) não pode ser reenviado;
  // string e FormData comuns podem, e são os únicos que o app usa.
  const renewed = await refreshSession();
  return renewed ? fetch(input, withCookies) : response;
}
