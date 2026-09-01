import { cookies } from "next/headers";
import { cache } from "react";

/**
 * Leitura da sessão no SERVIDOR. É a única fonte de verdade sobre "está
 * logado?" na aplicação.
 *
 * Roda só no servidor de propósito: o token vive num cookie `httpOnly` posto
 * pelo backend (`pt_at_client`) e o JS da página nunca o enxerga. Qualquer XSS
 * no front continua sem conseguir ler ou reencaminhar a sessão.
 *
 * ── Como o backend expõe a sessão (../backend/src/app/auth) ──────────────────
 *   POST /auth/login    → grava `pt_at_client` (access) e `pt_rt_client`
 *                         (refresh), ambos httpOnly, mais `pt_authed_client`
 *                         (legível por JS, valor "1", SEM segredo)
 *   GET  /auth/profile  → { data: { id, email, firstName, lastName, avatarUrl,
 *                           role, ... }, success } — exige o cookie de acesso
 *   POST /auth/logout   → limpa os três
 *
 * O header `x-pt-surface` declara QUAL jogo de cookies usar. O backend isola
 * `admin` / `organizer` / `client` para as três sessões coexistirem no mesmo
 * navegador; a loja é sempre `client`.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

const SURFACE = "client";
const HINT_COOKIE = `pt_authed_${SURFACE}`;

/**
 * Teto para a chamada ao backend. Sem ele, um backend pendurado seguraria a
 * renderização de TODA página que monta o cabeçalho — o `fetch` do Node não
 * tem timeout padrão. Preferimos mostrar o header deslogado a travar a página.
 */
const PROFILE_TIMEOUT_MS = 2500;

/** Só o que o cabeçalho precisa. Nada de token, papel ou e-mail aqui. */
export type SessionUser = {
  name: string;
  avatar: string;
  online?: boolean;
};

/** Avatar padrão quando o usuário não subiu foto. */
const AVATAR_FALLBACK = "/images/avatar-placeholder.png";

/**
 * `next/image` só carrega host declarado em `remotePatterns` (next.config.ts).
 * Uma URL de host não autorizado derrubaria a renderização inteira do header,
 * então uma foto que não dá para exibir vira o avatar padrão — degradação
 * silenciosa é melhor que página quebrada por causa de um retrato.
 */
function safeAvatar(avatarUrl: unknown): string {
  if (typeof avatarUrl !== "string" || avatarUrl === "") return AVATAR_FALLBACK;
  if (avatarUrl.startsWith("/")) return avatarUrl;
  try {
    const { protocol } = new URL(avatarUrl);
    return protocol === "https:" || protocol === "http:" ? avatarUrl : AVATAR_FALLBACK;
  } catch {
    return AVATAR_FALLBACK;
  }
}

/** Nome de exibição. Cai no trecho antes do @ quando o cadastro não tem nome. */
function displayName(profile: Record<string, unknown>): string {
  const partes = [profile.firstName, profile.lastName]
    .filter((p): p is string => typeof p === "string" && p.trim() !== "")
    .join(" ")
    .trim();
  if (partes !== "") return partes;
  const email = typeof profile.email === "string" ? profile.email : "";
  return email.split("@")[0] || "Minha conta";
}

/**
 * Usuário da sessão atual, ou `null` se não houver.
 *
 * `cache()` do React memoriza por REQUISIÇÃO: o cabeçalho e qualquer outro
 * componente que peça a sessão na mesma renderização compartilham uma única
 * chamada ao backend, em vez de uma por chamador.
 *
 * FAIL SECURE: qualquer imprevisto — sem API configurada, timeout, 401, corpo
 * inesperado — resolve para `null`, isto é, "deslogado". Nunca o contrário.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  // Sem backend configurado não existe sessão. Fingir uma aqui deixaria o
  // cabeçalho mentindo sobre estar logado — e um estado de login que não
  // depende do servidor é exatamente o que não pode existir.
  if (API_URL === "") return null;

  const jar = await cookies();

  // Atalho barato: o backend grava `pt_authed_client` junto dos cookies de
  // sessão só para isto. Sem ele, o visitante anônimo é a maioria do tráfego e
  // pagaria um round-trip (que terminaria em 401) a cada página.
  if (jar.get(HINT_COOKIE)?.value !== "1") return null;

  // Reencaminha os cookies da requisição do navegador. Sem isto o backend não
  // recebe o `pt_at_client` e responde 401 — o fetch do servidor não herda o
  // cookie jar do usuário.
  const cookieHeader = jar.toString();
  if (cookieHeader === "") return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROFILE_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}/auth/profile`, {
      headers: {
        cookie: cookieHeader,
        "x-pt-surface": SURFACE,
        accept: "application/json",
      },
      // Sessão nunca entra em cache compartilhado: o HTML de um usuário logado
      // não pode ser servido a outro.
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const body: unknown = await response.json();
    const profile =
      typeof body === "object" && body !== null
        ? ((body as { data?: unknown }).data ?? null)
        : null;
    if (typeof profile !== "object" || profile === null) return null;

    const perfil = profile as Record<string, unknown>;
    return {
      name: displayName(perfil),
      avatar: safeAvatar(perfil.avatarUrl),
      online: true,
    };
  } catch {
    // Rede fora, timeout ou JSON inválido. Não logamos o erro com o objeto da
    // requisição junto: ele carrega o cookie de sessão no header.
    return null;
  } finally {
    clearTimeout(timer);
  }
});
