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
import { MAX_IMAGE_BYTES } from "../games/options";
import {
  cleanCategories,
  cleanDescriptionGroups,
  cleanList,
  type SavePageCategory,
} from "./payload";
import { MAX_BANNERS, type BuilderGame } from "./types";

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
  /** Link na loja. Ausente/vazio = não mexe. */
  slug?: string;
  heading: string;
  serversLabel: string;
  categoriesLabel: string;
  descriptionGroups: { title: string; items: { subtitle: string; text: string }[] }[];
  servers: { id?: string; label: string }[];
  /** Dois níveis: categoria → subcategoria (contrato C da FASE 4). */
  categories: SavePageCategory[];
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
  // Conteúdo: ADMIN e EDITOR (2026-09-25). O backend confere de novo.
  if (role !== "ADMIN" && role !== "EDITOR") return { ok: false, reason: "forbidden" };
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

  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof payload.name !== "string" ||
    !Array.isArray(payload.servers) ||
    !Array.isArray(payload.categories)
  ) {
    return { ok: false, reason: "invalid", message: "Dados da página inválidos." };
  }
  if (!payload.name.trim()) {
    return { ok: false, reason: "invalid", message: "O nome do game é obrigatório." };
  }

  const categories = cleanCategories(payload.categories);
  if (!categories.ok) return { ok: false, reason: "invalid", message: categories.message };

  const description = cleanDescriptionGroups(payload.descriptionGroups);
  if (!description.ok) return { ok: false, reason: "invalid", message: description.message };

  const slug = typeof payload.slug === "string" ? payload.slug.trim() : "";
  if (slug.length > 80) {
    return { ok: false, reason: "invalid", message: "O link pode ter no máximo 80 caracteres." };
  }

  const body = {
    name: payload.name.trim(),
    ...(slug === "" ? {} : { slug }),
    heading: payload.heading ?? "",
    serversLabel: payload.serversLabel ?? "",
    categoriesLabel: payload.categoriesLabel ?? "",
    descriptionGroups: description.data,
    servers: cleanList(payload.servers),
    categories: categories.data,
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
  if (file.size > MAX_IMAGE_BYTES) return IMAGE_TOO_LARGE;

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
  if (file.size > MAX_IMAGE_BYTES) return IMAGE_TOO_LARGE;

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

/**
 * Teto de banners por jogo — espelha o `MAX_BANNERS` do backend (2026-10-08,
 * quando o banner virou slider). Exportado só como tipo de dado: arquivo
 * `"use server"` não exporta constante, então a tela importa de `types.ts`.
 */

/**
 * Etapa 2 — ordem do slider. Manda TODOS os ids, na ordem nova; o backend
 * recusa (400) se a lista não for exatamente a do jogo.
 */
export async function reorderBannersAction(
  gameId: string,
  ids: string[],
): Promise<BuilderResult<{ ids: string[] }>> {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (
    !Array.isArray(ids) ||
    ids.length > MAX_BANNERS ||
    ids.some((id) => typeof id !== "string" || id === "" || id.length > 100)
  ) {
    return { ok: false, reason: "invalid", message: "Ordem dos banners inválida." };
  }

  const result = await apiPut<{ ids: string[] }>(
    `/admin/game-page/${encodeURIComponent(gameId)}/banners/order`,
    { ids },
  );
  if (!result.ok) return failure(result);
  return { ok: true, data: result.data };
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
 * Mesmo teto do cadastro de jogo e do multer do backend. Faltava nas duas
 * etapas de imagem do builder: o arquivo grande atravessava navegador → Next →
 * API só para o backend recusar no fim — e, acima do `bodySizeLimit`, nem
 * chegava aqui e derrubava a tela (2026-09-25).
 */
const IMAGE_TOO_LARGE = {
  ok: false,
  reason: "invalid",
  message: "A imagem precisa ter no máximo 5 MB.",
} as const satisfies BuilderResult<never>;

/** A vitrine e o próprio builder passam a mostrar o que acabou de ser salvo. */
function revalidate(slug: string) {
  revalidatePath(`/games/${slug}`);
  revalidatePath("/admin/builder", "layout");
  // Nome e link do jogo aparecem nos slides do hero da home (itens ligados ao
  // jogo, 2026-09-25): trocar o link no builder tem que chegar lá na hora.
  revalidatePath("/", "layout");
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
    // 409 = link já usado por outro jogo: é recusa de DADO, como o 400.
    reason: result.status === 400 || result.status === 409 ? "invalid" : "error",
    message: result.message,
  };
}
