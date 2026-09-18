"use server";

import { revalidatePath, updateTag } from "next/cache";
import { GAMES_MENU_TAG } from "@/features/game/menuGames";
import { backendAsset } from "@/lib/publicApi";
import { getSessionRole } from "@/features/auth/session";
import {
  apiDelete,
  apiPostFormData,
  apiPut,
  apiPutFormData,
} from "@/lib/serverApi";
import type { BuilderGame } from "./types";

/**
 * As escritas do "Builder de Páginas".
 *
 * Todas passam pelo SERVIDOR e não pelo navegador, pelo mesmo motivo do resto
 * do painel: o token é cookie `httpOnly`, então quem consegue autenticar a
 * chamada é este processo.
 *
 * A conferência de papel em cada uma é a terceira, e a menos importante — o
 * layout já barrou a navegação e o `RolesGuard` vai barrar a chamada. Está aqui
 * porque server action é um ENDEREÇO PÚBLICO: o Next expõe uma rota para ela, e
 * essa rota não passa pelo layout que protege a página.
 *
 * ── Por que `revalidatePath` da VITRINE ────────────────────────────────────
 * O botão se chama "SALVAR E PUBLICAR PAGE", e publicar significa a loja
 * mostrar. A vitrine é renderizada no servidor a cada visita (`no-store`), mas o
 * Next guarda o resultado do Router Cache no navegador de quem já esteve lá —
 * então sem isto o próprio admin, ao abrir a página do jogo depois de salvar,
 * veria a versão anterior e concluiria que o salvamento falhou.
 */

export type BuilderResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      reason: "unauthenticated" | "forbidden" | "invalid" | "error";
      message?: string;
    };

/** O corpo do `PUT` — o mesmo formato do `SaveGamePageDto` do backend. */
export type SavePagePayload = {
  name: string;
  heading: string;
  serversLabel: string;
  categoriesLabel: string;
  description: string;
  productTypes: string[];
  servers: { id?: string; label: string }[];
  categories: { id?: string; label: string }[];
  sectionOrder: string[];
};

/**
 * `null` quando a sessão é ADMIN; a recusa pronta quando não é.
 *
 * Devolve a recusa em vez de lançar para quem chama poder devolvê-la direto —
 * exceção em server action vira erro genérico na tela, e a diferença entre
 * "não está logado" e "não é admin" é o que decide se a página manda para o
 * login ou mostra um aviso.
 */
async function requireAdmin(): Promise<BuilderResult<never> | null> {
  const role = await getSessionRole();
  if (role === null) return { ok: false, reason: "unauthenticated" };
  if (role !== "ADMIN") return { ok: false, reason: "forbidden" };
  return null;
}

/**
 * "SALVAR E PUBLICAR PAGE" — grava as sete etapas de texto e lista de uma vez.
 *
 * O corpo NÃO é reencaminhado como veio da tela: é remontado campo a campo,
 * então um campo extra injetado na página não viaja junto. As listas levam só
 * `id` e `label` — a chave de renderização e o slug são da tela e do banco,
 * respectivamente, e nenhum dos dois é decisão de quem edita.
 */
export async function savePageAction(
  gameId: string,
  payload: SavePagePayload,
): Promise<BuilderResult<BuilderGame>> {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!payload.name?.trim()) {
    return { ok: false, reason: "invalid", message: "O nome do game é obrigatório." };
  }
  if (!Array.isArray(payload.productTypes) || payload.productTypes.length === 0) {
    return {
      ok: false,
      reason: "invalid",
      message: "Escolha ao menos uma categoria principal — ela vira as abas da loja.",
    };
  }

  const body = {
    name: payload.name.trim(),
    heading: payload.heading ?? "",
    serversLabel: payload.serversLabel ?? "",
    categoriesLabel: payload.categoriesLabel ?? "",
    description: payload.description ?? "",
    productTypes: payload.productTypes,
    servers: cleanList(payload.servers),
    categories: cleanList(payload.categories),
    sectionOrder: payload.sectionOrder,
  };

  const result = await apiPut<BuilderGame>(
    `/admin/game-page/${encodeURIComponent(gameId)}`,
    body,
  );

  if (!result.ok) return failure(result);

  revalidate(result.data.slug);
  return { ok: true, data: result.data };
}

/** Etapa 3 — troca a arte do jogo. */
export async function uploadLogoAction(
  gameId: string,
  form: FormData,
): Promise<BuilderResult<{ imageUrl: string }>> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, reason: "invalid", message: "Escolha uma imagem." };
  }

  const body = new FormData();
  body.append("image", file);

  const result = await apiPutFormData<{ imageUrl: string }>(
    `/admin/game-page/${encodeURIComponent(gameId)}/logo`,
    body,
  );

  if (!result.ok) return failure(result);
  // Absoluta antes de chegar à tela, pela mesma razão do `list.ts`: o backend
  // devolve `/uploads/...`, que o Next serviria da própria origem.
  return { ok: true, data: { imageUrl: backendAsset(result.data.imageUrl) ?? "" } };
}

/** Etapa 2 — acrescenta um banner. */
export async function uploadBannerAction(
  gameId: string,
  form: FormData,
): Promise<BuilderResult<{ id: string; imageUrl: string; href?: string | null }>> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, reason: "invalid", message: "Escolha uma imagem." };
  }

  const body = new FormData();
  body.append("image", file);

  const result = await apiPostFormData<{
    id: string;
    imageUrl: string;
    href?: string | null;
  }>(`/admin/game-page/${encodeURIComponent(gameId)}/banners`, body);

  if (!result.ok) return failure(result);
  return {
    ok: true,
    data: {
      ...result.data,
      imageUrl: backendAsset(result.data.imageUrl) ?? result.data.imageUrl,
    },
  };
}

/** Etapa 2 — remove um banner. */
export async function removeBannerAction(
  gameId: string,
  bannerId: string,
): Promise<BuilderResult<{ id: string }>> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const result = await apiDelete<{ id: string }>(
    `/admin/game-page/${encodeURIComponent(gameId)}/banners/${encodeURIComponent(bannerId)}`,
  );

  if (!result.ok) return failure(result);
  return { ok: true, data: result.data };
}

/**
 * Linhas em branco são DESCARTADAS, não recusadas.
 *
 * A lista da tela ganha uma linha vazia a cada clique em "adicionar", e quem
 * clicou duas vezes e preencheu uma não cometeu um erro que mereça um formulário
 * recusado — só deixou uma linha sobrando.
 */
function cleanList(items: { id?: string; label: string }[]) {
  return items
    .map((item) => ({ id: item.id, label: item.label.trim() }))
    .filter((item) => item.label !== "");
}

/** A vitrine e o próprio builder passam a mostrar o que acabou de ser salvo. */
function revalidate(slug: string) {
  revalidatePath(`/games/${slug}`);
  revalidatePath("/admin/builder", "layout");
  // Nome e logo do jogo aparecem no menu GAMES do cabeçalho (`menuGames.ts`).
  updateTag(GAMES_MENU_TAG);
}

/**
 * Traduz a falha do backend preservando a MENSAGEM dele quando ela existe.
 *
 * Importa aqui mais do que no resto do painel: a recusa mais provável desta
 * tela é "120 produtos ainda estão ligados a servidores que você tirou da
 * lista", e trocar isso por um "não foi possível salvar" genérico deixaria a
 * pessoa sem saber o que fazer.
 */
function failure(result: {
  status: number;
  reason: "unauthenticated" | "error";
  message?: string;
}): BuilderResult<never> {
  if (result.reason === "unauthenticated") {
    return { ok: false, reason: "unauthenticated" };
  }
  return {
    ok: false,
    reason: result.status === 400 ? "invalid" : "error",
    message: result.message,
  };
}
