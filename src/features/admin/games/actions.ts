"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getSessionRole } from "@/features/auth/session";
import { canAccess } from "@/features/admin/permissions";
import { GAMES_MENU_TAG } from "@/features/game/menuGames";
import { apiDelete, apiPostFormData, apiPut } from "@/lib/serverApi";
import { MAX_IMAGE_BYTES } from "./options";
import { createGameSchema } from "./schema";

/**
 * Cadastro de jogo — "SALVAR E CADASTRAR" (Figma 4468:1848).
 *
 * O corpo sai daqui como `multipart/form-data` porque leva a arte junto. Vai
 * pelo SERVIDOR e não pelo navegador pelo mesmo motivo de todo o resto do
 * painel: o token é cookie `httpOnly`, então quem consegue autenticar a chamada
 * é este processo, não a página.
 *
 * O `FormData` que chega do formulário NÃO é reencaminhado como veio. Montamos
 * um novo com os campos que o backend declara — o corpo que sai daqui só tem o
 * que passou pelo zod, e um campo extra injetado na página não viaja junto.
 *
 * A conferência de papel aqui é a terceira, e a menos importante: o layout já
 * barrou a navegação e o `RolesGuard` vai barrar a chamada. Está aqui porque
 * server action é um ENDEREÇO PÚBLICO — o Next expõe uma rota para ela, e essa
 * rota não passa pelo layout que protege a página.
 */

export type CreateGameResult =
  | {
      ok: true;
      slug: string;
      name: string;
      /**
       * Para o atalho "configurar abas" depois do cadastro (2026-09-28). O
       * backend cria as abas a partir do tipo escolhido; ausente = resposta sem
       * id, e a tela aponta para a lista de jogos.
       */
      id?: string;
    }
  | {
      ok: false;
      reason: "unauthenticated" | "forbidden" | "invalid" | "error";
      message?: string;
    };

export async function createGameAction(form: FormData): Promise<CreateGameResult> {
  const role = await getSessionRole();
  if (role === null) return { ok: false, reason: "unauthenticated" };
  if (!canAccess(role, "catalog")) return { ok: false, reason: "forbidden" };

  const parsed = createGameSchema.safeParse({
    name: form.get("name"),
    slug: form.get("slug") ?? "",
    platform: form.get("platform"),
    tabTemplate: form.get("tabTemplate"),
    servers: form.get("servers") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      reason: "invalid",
      message: parsed.error.issues[0]?.message,
    };
  }

  const payload = new FormData();
  payload.set("name", parsed.data.name);
  // Só viaja se o admin escolheu: ausente, o backend deriva do nome.
  if (parsed.data.slug !== "") payload.set("slug", parsed.data.slug);
  // Os dois selects mandam UM valor e o contrato é lista. `productTypes` é o
  // nome que o `POST /admin/games` mantém (FASE 5) para as CHAVES de modelo de
  // aba: o backend cria as abas iniciais a partir delas e não as grava.
  payload.set("platforms", parsed.data.platform);
  payload.set("productTypes", parsed.data.tabTemplate);
  payload.set("servers", parsed.data.servers.join(","));

  const image = form.get("image");
  if (image instanceof File && image.size > 0) {
    // Terceira barreira do mesmo teto (a primeira é o `FileField`, a última é o
    // multer). Vale a pena aqui porque é a última antes de gastar banda
    // mandando o arquivo para o backend só para ele recusar.
    if (image.size > MAX_IMAGE_BYTES) {
      return {
        ok: false,
        reason: "invalid",
        message: "A imagem precisa ter no máximo 5 MB.",
      };
    }
    payload.set("image", image, image.name);
  }

  const response = await apiPostFormData<{ id?: string; slug: string; name: string }>(
    "/admin/games",
    payload,
  );

  if (!response.ok) {
    if (response.reason === "unauthenticated") {
      return { ok: false, reason: "unauthenticated" };
    }
    if (response.status === 403) return { ok: false, reason: "forbidden" };
    // Link já usado por outro jogo. Texto NOSSO, não o do backend (ver abaixo).
    if (response.status === 409) {
      return {
        ok: false,
        reason: "invalid",
        message: "Esse link já está em uso por outro jogo. Escolha outro.",
      };
    }
    if (response.status === 400) {
      // A mensagem do backend não é repassada: ela pode ecoar o que foi
      // enviado, e texto do cliente renderizado de volta na tela é como um
      // payload chega ao navegador de quem administra.
      return {
        ok: false,
        reason: "invalid",
        message: "O servidor recusou os dados enviados. Confira os campos.",
      };
    }
    return { ok: false, reason: "error" };
  }

  // Jogo novo entra no menu GAMES do cabeçalho na hora (`menuGames.ts`).
  updateTag(GAMES_MENU_TAG);
  const id = response.data.id;
  return {
    ok: true,
    slug: response.data.slug,
    name: response.data.name,
    ...(typeof id === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(id) ? { id } : {}),
  };
}

/**
 * Lixeira do jogo, na grade do `/admin/builder` (2026-09-25).
 *
 * DESATIVA — o backend marca `isActive = false`, igual à lixeira de produto. O
 * jogo some de toda a loja (vitrine, menu GAMES, busca, checkout) e os pedidos
 * que o citam continuam intactos. Reativar hoje é só pelo banco.
 */
export async function deactivateGameAction(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const role = await getSessionRole();
  if (!canAccess(role, "catalog")) {
    return { ok: false, message: "Sua conta não tem permissão para excluir games." };
  }
  // O id vai para o CAMINHO da URL: formato fechado, senão um `../` vindo do
  // cliente viraria outra rota do backend com a sessão de admin.
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) {
    return { ok: false, message: "Game inválido." };
  }

  const response = await apiDelete(`/admin/games/${encodeURIComponent(id)}`);
  if (!response.ok) {
    return {
      ok: false,
      message:
        response.status === 404
          ? "Este game já não existe."
          : "Não conseguimos excluir agora. Tente novamente em instantes.",
    };
  }

  // O menu GAMES do cabeçalho é cacheado por etiqueta; sem isto o jogo
  // excluído seguiria no menu por até uma hora.
  updateTag(GAMES_MENU_TAG);
  revalidatePath("/admin/builder");
  revalidatePath("/admin/jogos");
  return { ok: true };
}

/** Teto da lista, igual ao do DTO do backend (jogos ativos). */
const MAX_MENU_GAMES = 200;
const GAME_ID = /^[A-Za-z0-9_-]{1,100}$/;

/**
 * Ordem do menu GAMES (2026-10-15) — home, cabeçalho e celular usam a mesma
 * lista. Recebe TODOS os jogos ativos na ordem nova; o backend recusa (400)
 * uma lista que não confere, e a mensagem pede para recarregar.
 *
 * Grava na hora, sem botão "salvar": é o padrão da ordem dos banners.
 */
export async function reorderGamesMenuAction(
  ids: string[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  const role = await getSessionRole();
  if (!canAccess(role, "catalog")) {
    return { ok: false, message: "Sua conta não tem permissão para mudar a ordem dos games." };
  }
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > MAX_MENU_GAMES ||
    ids.some((id) => typeof id !== "string" || !GAME_ID.test(id))
  ) {
    return { ok: false, message: "Ordem dos games inválida." };
  }

  const response = await apiPut<{ ids: string[] }>("/admin/games/menu-order", { ids });
  if (!response.ok) {
    return {
      ok: false,
      message:
        response.status === 400
          ? "A lista de games mudou. Recarregue a página e tente de novo."
          : "Não conseguimos salvar a ordem agora. Tente novamente em instantes.",
    };
  }

  // O menu é cacheado por etiqueta (`menuGames.ts`): sem isto a loja levaria
  // até uma hora para mostrar a ordem nova.
  updateTag(GAMES_MENU_TAG);
  revalidatePath("/admin/jogos");
  return { ok: true };
}
