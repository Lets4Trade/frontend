import { NextResponse, type NextRequest } from "next/server";
import { internalHeaders } from "@/lib/internalKey";

/**
 * Renova a sessão ANTES de a página renderizar.
 *
 * ── Por que existe ─────────────────────────────────────────────────────────
 * Desde 2026-09-14 o access token dura 15 minutos (antes, 30 dias — ver
 * `backend/src/app/auth/token-lifetime.ts`). O que mantém o usuário conectado é
 * o refresh token, que dura 30 dias e é trocado a cada uso. Até esta data o
 * frontend NÃO tinha fluxo de renovação nenhum: só funcionava porque o access
 * durava um mês.
 *
 * Aqui, a cada navegação: se há refresh e o access está ausente ou a menos de
 * um minuto de vencer, troca-se o par no backend ANTES de renderizar. Os cookies
 * novos vão para o navegador (Set-Cookie) E para esta mesma requisição — senão
 * a página renderizada agora ainda leria o token velho e mostraria deslogado.
 *
 * ── Custo ─────────────────────────────────────────────────────────────────
 * No caso comum (access válido) é só decodificar o `exp` do cookie, sem rede.
 * A ida ao backend acontece uma vez a cada ~15 minutos por visitante logado.
 * Visitante sem refresh token (anônimo) sai na primeira linha.
 *
 * ── Falha ─────────────────────────────────────────────────────────────────
 * Backend fora do ar ou lento: a página segue sem renovar e se comporta como
 * hoje com sessão vencida (fail secure — deslogado, nunca "logado de mentira").
 * Refresh recusado: o backend apaga os cookies na mesma resposta, e o cookie
 * morto não provoca nova tentativa na navegação seguinte.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

/** A loja usa sempre a superfície `client` — ver `lib/serverApi.ts`. */
const ACCESS_COOKIE = "pt_at_client";
const REFRESH_COOKIE = "pt_rt_client";

/** Renova quando faltar menos que isto: evita o token vencer no meio do render. */
const RENEW_BEFORE_MS = 60 * 1000;

/** Proxy fica no caminho de TODA página: nunca pode segurar a navegação. */
const TIMEOUT_MS = 3000;

export async function proxy(request: NextRequest) {
  if (API_URL === "") return NextResponse.next();

  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh) return NextResponse.next();

  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const expiresAt = access ? tokenExpiry(access) : null;
  if (expiresAt !== null && expiresAt - Date.now() > RENEW_BEFORE_MS) {
    return NextResponse.next();
  }

  let backend: Response;
  try {
    backend = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        // SÓ o refresh vai para o backend — nenhum outro cookie do visitante.
        cookie: `${REFRESH_COOKIE}=${refresh}`,
        "x-pt-surface": "client",
        accept: "application/json",
        ...internalHeaders(),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return NextResponse.next();
  }

  const setCookies = backend.headers.getSetCookie();
  if (setCookies.length === 0) return NextResponse.next();

  // A requisição atual passa a enxergar os cookies novos (e não os apagados).
  const current = new Map(request.cookies.getAll().map((c) => [c.name, c.value]));
  for (const line of setCookies) {
    const parsed = parseSetCookie(line);
    if (!parsed) continue;
    if (parsed.deleted) current.delete(parsed.name);
    else current.set(parsed.name, parsed.value);
  }

  const headers = new Headers(request.headers);
  headers.set(
    "cookie",
    [...current].map(([name, value]) => `${name}=${value}`).join("; "),
  );

  const response = NextResponse.next({ request: { headers } });
  for (const line of setCookies) response.headers.append("set-cookie", line);
  return response;
}

/**
 * `exp` do JWT em milissegundos, SEM verificar a assinatura.
 *
 * Não precisa verificar: isto só decide SE vale pedir renovação. Quem valida o
 * token é o backend, em toda requisição. Um `exp` forjado no cookie só faria o
 * proxy deixar de renovar — e o backend recusaria o token do mesmo jeito.
 */
function tokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    ) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function parseSetCookie(
  line: string,
): { name: string; value: string; deleted: boolean } | null {
  const [pair, ...attributes] = line.split(";");
  const separator = pair.indexOf("=");
  if (separator <= 0) return null;

  const name = pair.slice(0, separator).trim();
  const value = pair.slice(separator + 1).trim();
  const attrs = attributes.map((a) => a.trim().toLowerCase());
  const deleted =
    value === "" ||
    attrs.includes("max-age=0") ||
    attrs.some((a) => a.startsWith("expires=") && a.includes("1970"));

  return { name, value, deleted };
}

/**
 * Só páginas e requisições do app. Arquivo estático, imagem otimizada e o
 * `public/` não carregam sessão — rodar o proxy neles seria custo sem efeito.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|icons/|fonts/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|woff2?)$).*)",
  ],
};
