/**
 * Endereços do cadastro e da listagem de produtos com o contexto já escolhido
 * (admin-games-ux.md, Etapa 1, 2026-09-30) — a parte PURA, sem `serverApi`,
 * para servir tanto à página (servidor) quanto aos editores (cliente).
 *
 * `/admin/produtos/novo?jogo=<gameId>&aba=<tabId>&servidor=<serverId>&plataforma=<PLAT>`
 * chega com jogo, aba, servidor e plataforma escolhidos — o atalho "+ Produto"
 * de cada aba e, na Etapa 2, a Central do jogo. Os nomes `jogo` e `aba` são os
 * MESMOS da listagem (`PARAM` de `catalog.ts`): um endereço copiado de uma tela
 * lê igual na outra.
 *
 * Tudo o que vem da URL é input de cliente: cada valor só passa se for uma das
 * opções que a tela carregou (jogo da lista, servidor/plataforma DESSE jogo, aba
 * de produto DESSE jogo). Inválido = ignorado, e o campo abre como abriria sem
 * o parâmetro — nunca um erro, nunca um valor que o select não tem.
 */
import type { AdminGame } from "@/features/admin/catalog";
import { isProductTab, isValidId, type GameTab } from "@/features/admin/games/tabs/types";
import { PARAM, buildHref } from "./catalog";

export const PREFILL_PARAM = {
  game: PARAM.game,
  tab: PARAM.tab,
  server: "servidor",
  platform: "plataforma",
} as const;

/** Pré-preenchimento do cadastro. `""` = sem valor (o campo abre vazio). */
export type ProductPrefill = {
  gameId: string;
  tabId: string;
  serverId: string;
  platform: string;
};

export const EMPTY_PREFILL: ProductPrefill = { gameId: "", tabId: "", serverId: "", platform: "" };

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw : "";
}

/**
 * Lê jogo, servidor e plataforma e os confere contra os jogos carregados. A
 * aba só tem o FORMATO conferido aqui: as abas moram em outra leitura, feita
 * depois de se saber o jogo — quem confere é `resolvePrefillTab`.
 */
export function parseProductPrefill(params: RawParams, games: readonly AdminGame[]): ProductPrefill {
  const game = games.find((item) => item.id === first(params[PREFILL_PARAM.game]));
  if (!game) return EMPTY_PREFILL;

  const rawServer = first(params[PREFILL_PARAM.server]);
  const rawPlatform = first(params[PREFILL_PARAM.platform]).toUpperCase();
  const rawTab = first(params[PREFILL_PARAM.tab]);

  return {
    gameId: game.id,
    tabId: isValidId(rawTab) ? rawTab : "",
    serverId: game.servers.some((server) => server.id === rawServer) ? rawServer : "",
    platform: game.platforms.includes(rawPlatform) ? rawPlatform : "",
  };
}

/**
 * A aba só fica se for uma aba de PRODUTO do jogo (LINK e SELL não recebem
 * produto). `null` = a leitura das abas falhou: sem a lista não há como
 * conferir, então a aba cai.
 */
export function resolvePrefillTab(prefill: ProductPrefill, tabs: readonly GameTab[] | null): ProductPrefill {
  if (prefill.tabId === "") return prefill;
  const ok = tabs?.some((tab) => tab.id === prefill.tabId && isProductTab(tab)) ?? false;
  return ok ? prefill : { ...prefill, tabId: "" };
}

// ── `volta` (admin-games-ux.md, Etapa 2) ────────────────────────────────────

/**
 * `?volta=<caminho>`: para onde o cadastro/edição de produto leva depois de
 * salvar (e o link "← Voltar"). A Central do jogo manda o próprio endereço, e a
 * pessoa volta para a aba que estava vendo.
 */
export const RETURN_PARAM = "volta";

/** Teto do caminho aceito — uma URL da Central tem ~120 caracteres. */
const MAX_RETURN_LENGTH = 300;

/**
 * Aceita SÓ caminho interno do painel (`/admin/...`). É input de URL que vira
 * `router.push`: sem esta trava, `?volta=https://golpe.com` ou `//golpe.com`
 * (esquema relativo) faria o painel mandar quem acabou de salvar para fora —
 * open redirect clássico. Recusa também `\` (navegadores o tratam como `/`),
 * caracteres de controle e `..` (sair de `/admin/` pelo caminho), e confere o
 * resultado com o parser de URL do próprio navegador: a origem tem de continuar
 * a mesma. `null` = sem retorno (a tela usa o destino de sempre).
 */
export function safeReturnPath(raw: unknown): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return null;
  if (value.length === 0 || value.length > MAX_RETURN_LENGTH) return null;
  if (!value.startsWith("/admin/")) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return null;
  if (value.includes("//") || value.includes("..")) return null;
  try {
    const base = "http://painel.invalid";
    const url = new URL(value, base);
    if (url.origin !== base || !url.pathname.startsWith("/admin/")) return null;
  } catch {
    return null;
  }
  return value;
}

/** Link do cadastro com o que já se sabe. Campo vazio fica fora da URL. */
export function newProductHref(prefill: Partial<ProductPrefill> & { returnTo?: string | null } = {}): string {
  const search = new URLSearchParams();
  if (prefill.gameId) search.set(PREFILL_PARAM.game, prefill.gameId);
  // Aba e servidor só fazem sentido dentro de um jogo — sem ele, a página os
  // ignoraria; melhor nem escrevê-los.
  if (prefill.gameId && prefill.tabId) search.set(PREFILL_PARAM.tab, prefill.tabId);
  if (prefill.gameId && prefill.serverId) search.set(PREFILL_PARAM.server, prefill.serverId);
  if (prefill.gameId && prefill.platform) search.set(PREFILL_PARAM.platform, prefill.platform);
  const back = safeReturnPath(prefill.returnTo);
  if (back) search.set(RETURN_PARAM, back);
  const qs = search.toString();
  return qs === "" ? "/admin/produtos/novo" : `/admin/produtos/novo?${qs}`;
}

/** Listagem de produtos filtrada por jogo (e aba) — o mesmo `buildHref` dos filtros. */
export function productsListHref({ gameId, tabId = "" }: { gameId: string; tabId?: string }): string {
  return buildHref({ game: "", tab: "", server: "", sort: "recente", search: "", page: 1 }, { game: gameId, tab: tabId });
}

/** Edição de um produto, com o `volta` (conferido) quando houver. */
export function editProductHref(productId: string, returnTo?: string | null): string {
  const base = `/admin/produtos/${encodeURIComponent(productId)}/editar`;
  const back = safeReturnPath(returnTo);
  return back ? `${base}?${new URLSearchParams({ [RETURN_PARAM]: back }).toString()}` : base;
}
