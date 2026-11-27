import { publicApiGet } from "@/lib/publicApi";
import { GAME_SLUG, gameHref } from "./href";

/**
 * Redirects DINÂMICOS da página de jogo (2026-11-27).
 *
 * O destino mora no BANCO por id (jogo + aba), e a API devolve os slugs de
 * HOJE — renomear o jogo ou a aba no painel não quebra nada. Cobre:
 *   - endereços do site antigo (`/currencypoe` → Path of Exile);
 *   - jogo renomeado no Builder (`/diablo` → `/diablo-4`);
 *   - aba renomeada na Central (`?aba=moedas` → `?aba=currencys`).
 *
 * Sem cache (`no-store`, padrão do `publicApiGet`): só é chamado quando o
 * endereço NÃO é jogo, e um renome tem de valer no clique seguinte.
 */

type RouteSearch = Record<string, string | string[] | undefined>;

type RawRedirect = { gameSlug?: unknown; tabSlug?: unknown };

const TAB_SLUG = /^[a-z0-9-]{1,60}$/;

/** A query de quem chegou, sem as listas (só o primeiro valor de cada chave). */
function queryOf(search: RouteSearch): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first === "string") params.set(key, first);
  }
  return params;
}

/**
 * Para onde `/<slug>` leva hoje, ou `null` (404). A query de quem chega
 * (`?utm_...` de anúncio antigo) segue junto; a aba do destino, se houver,
 * vence a `?aba=` que veio na URL.
 */
export async function findGameRedirect(slug: string, search: RouteSearch): Promise<string | null> {
  if (!GAME_SLUG.test(slug)) return null;
  const data = await publicApiGet<RawRedirect>(`/game-redirects/${encodeURIComponent(slug)}`);
  // Dado da API: só slug no formato de sempre vira endereço (nada de `//x`).
  if (!data || typeof data.gameSlug !== "string" || !GAME_SLUG.test(data.gameSlug)) return null;
  if (data.gameSlug === slug) return null; // nunca redirecionar para si mesmo

  const params = queryOf(search);
  if (typeof data.tabSlug === "string" && TAB_SLUG.test(data.tabSlug)) params.set("aba", data.tabSlug);
  return gameHref(data.gameSlug, params);
}

/**
 * `?aba=velho` de uma aba renomeada → o mesmo endereço com a aba de hoje, ou
 * `null` quando a aba pedida não é apelido (aba atual, ausente ou inventada).
 */
export function tabAliasRedirect(
  gameSlug: string,
  aliases: Record<string, string> | undefined,
  search: RouteSearch,
): string | null {
  const requested = Array.isArray(search.aba) ? search.aba[0] : search.aba;
  if (!aliases || typeof requested !== "string") return null;
  const current = Object.hasOwn(aliases, requested) ? aliases[requested] : undefined;
  if (!current) return null;
  const params = queryOf(search);
  params.set("aba", current);
  return gameHref(gameSlug, params);
}
