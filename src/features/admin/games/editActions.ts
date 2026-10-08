"use server";

import { revalidatePath } from "next/cache";
import { getSessionRole } from "@/features/auth/session";
import { savePageAction, type BuilderResult } from "@/features/admin/builder/actions";
import { isGlobalCategory, type BuilderGame } from "@/features/admin/builder/types";
import { toCategoryTree } from "@/features/game/categoryTree";
import { toGameDescription } from "@/features/game/description";
import { apiGet, apiPost } from "@/lib/serverApi";

/**
 * Edição do CADASTRO de um jogo, pela tela `/admin/jogos/[id]/editar`
 * (2026-09-28, fora do Figma — pedida junto da listagem de jogos).
 *
 * Não existe endpoint próprio: o backend grava o jogo pelo `PUT
 * /admin/game-page/:id`, o mesmo do Builder, e ele é uma troca COMPLETA (título,
 * descrição, categorias e ordem dos blocos vão juntos). Por isso a action lê o
 * estado atual e só substitui os campos de cadastro — nome, link e
 * servidores (as abas têm tela própria, Jogos → Abas). O resto volta como veio, e a página montada no Builder
 * não é tocada.
 *
 * Reaproveitar `savePageAction` mantém UMA montagem de corpo e UMA tradução de
 * erro (a recusa "servidor com produtos ligados" chega com a mensagem do
 * backend). A diferença é a porta: aqui só ADMIN, porque é o catálogo, não o
 * conteúdo — o EDITOR segue editando a página pelo Builder.
 *
 * Risco residual: leitura + gravação não são atômicas. Se alguém salvar o
 * Builder do mesmo jogo entre as duas, os textos da página gravados aqui são os
 * lidos um instante antes. Janela de milissegundos numa tela de uso raro.
 */

export type UpdateGameInput = {
  name: string;
  slug: string;
  servers: { id?: string; label: string }[];
};

export async function updateGameAction(
  gameId: string,
  input: UpdateGameInput,
): Promise<BuilderResult<BuilderGame>> {
  const role = await getSessionRole();
  if (role === null) return { ok: false, reason: "unauthenticated" };
  if (role !== "ADMIN") return { ok: false, reason: "forbidden" };

  // O id vai para o CAMINHO da URL do backend: formato fechado.
  if (typeof gameId !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(gameId)) {
    return { ok: false, reason: "invalid", message: "Game inválido." };
  }
  if (
    typeof input !== "object" ||
    input === null ||
    typeof input.name !== "string" ||
    typeof input.slug !== "string" ||
    !Array.isArray(input.servers)
  ) {
    return { ok: false, reason: "invalid", message: "Dados do game inválidos." };
  }

  const name = input.name.trim();
  if (name.length < 2 || name.length > 120) {
    return { ok: false, reason: "invalid", message: "O nome precisa ter de 2 a 120 caracteres." };
  }

  const current = await apiGet<BuilderGame>(`/admin/game-page/${encodeURIComponent(gameId)}`);
  if (!current.ok) {
    if (current.reason === "unauthenticated") return { ok: false, reason: "unauthenticated" };
    return {
      ok: false,
      reason: "error",
      message: current.status === 404 ? "Este game já não existe." : undefined,
    };
  }
  const game = current.data;

  const result = await savePageAction(gameId, {
    name,
    slug: input.slug,
    servers: input.servers.map((server) => ({ id: server?.id, label: String(server?.label ?? "") })),
    // Tudo abaixo volta como veio: esta tela não edita a página.
    heading: game.heading ?? "",
    serversLabel: game.serversLabel ?? "",
    categoriesLabel: game.categoriesLabel ?? "",
    // A descrição também volta como veio: sem ela, salvar o nome apagaria.
    descriptionGroups: toGameDescription(game.descriptionGroups) ?? [],
    // Só as GLOBAIS: o PUT do Builder mexe só nelas (contrato de abas).
    categories: toCategoryTree((game.categories ?? []).filter(isGlobalCategory)).map((category) => ({
      id: category.id,
      label: category.label,
      children: category.children.map((child) => ({ id: child.id, label: child.label })),
    })),
    // SEMPRE a ordem atual: o backend grava `dto.sectionOrder ?? []`, então
    // omitir o campo apagaria a ordem montada no Builder.
    sectionOrder: game.sectionOrder ?? [],
  });

  if (result.ok) revalidatePath("/admin/jogos", "layout");
  return result;
}

export type DuplicatedServer = {
  server: { id: string; label: string; slug: string; position: number };
  categories: number;
  products: number;
};

/** Id que vai para o CAMINHO da URL do backend: formato fechado. */
const PATH_ID = /^[A-Za-z0-9_-]{1,100}$/;

/**
 * Duplica um servidor (2026-10-08): o backend cria "Nome (cópia)" logo abaixo
 * do original, com as categorias e os produtos ATIVOS dele, numa transação.
 * Só ADMIN (a cópia cria produtos). O nome se troca depois, na própria lista.
 */
export async function duplicateServerAction(
  gameId: string,
  serverId: string,
): Promise<BuilderResult<DuplicatedServer>> {
  const role = await getSessionRole();
  if (role === null) return { ok: false, reason: "unauthenticated" };
  if (role !== "ADMIN") return { ok: false, reason: "forbidden" };
  if (typeof gameId !== "string" || !PATH_ID.test(gameId) || typeof serverId !== "string" || !PATH_ID.test(serverId)) {
    return { ok: false, reason: "invalid", message: "Servidor inválido." };
  }

  const result = await apiPost<DuplicatedServer>(
    `/admin/games/${encodeURIComponent(gameId)}/servers/${encodeURIComponent(serverId)}/duplicate`,
    {},
  );
  if (!result.ok) {
    if (result.reason === "unauthenticated") return { ok: false, reason: "unauthenticated" };
    return {
      ok: false,
      // 400 (teto) e 404 (servidor sumiu) são recusas de dado, com frase do backend.
      reason: result.status === 400 || result.status === 404 ? "invalid" : "error",
      message: result.status === 400 || result.status === 404 ? result.message : undefined,
    };
  }

  revalidatePath("/admin/jogos", "layout");
  revalidatePath("/admin/produtos", "layout");
  return { ok: true, data: result.data };
}
