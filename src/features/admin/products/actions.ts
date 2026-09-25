"use server";

import { getSessionRole } from "@/features/auth/session";
import { revalidatePath } from "next/cache";
import { apiDelete, apiPatchFormData, apiPostFormData, apiPut } from "@/lib/serverApi";
import { MAX_IMAGE_BYTES } from "../games/options";
import { createProductSchema } from "./schema";

/**
 * Cadastro de produto — "SALVAR E ANUNCIAR" (Figma 3806:7072).
 *
 * Mesmas regras do cadastro de jogo: sai daqui como `multipart/form-data`
 * porque leva a arte junto, e vai pelo SERVIDOR porque o token é cookie
 * `httpOnly` que a página não alcança.
 *
 * O `FormData` do formulário NÃO é reencaminhado como veio — montamos um novo
 * só com os campos que o backend declara, então um campo extra injetado na
 * página não viaja junto.
 *
 * A conferência de papel aqui é a terceira, e a menos importante: o layout já
 * barrou a navegação e o `RolesGuard` vai barrar a chamada. Está aqui porque
 * server action é um ENDEREÇO PÚBLICO — o Next expõe uma rota para ela, e essa
 * rota não passa pelo layout que protege a página.
 */

export type CreateProductResult =
  | { ok: true; name: string; gameName: string }
  | {
      ok: false;
      reason: "unauthenticated" | "forbidden" | "invalid" | "error";
      message?: string;
    };

export async function createProductAction(
  form: FormData,
): Promise<CreateProductResult> {
  const role = await getSessionRole();
  if (role === null) return { ok: false, reason: "unauthenticated" };
  if (role !== "ADMIN") return { ok: false, reason: "forbidden" };

  const parsed = createProductSchema.safeParse({
    gameId: form.get("gameId"),
    name: form.get("name"),
    priceCents: form.get("priceCents"),
    platform: form.get("platform"),
    productType: form.get("productType"),
    serverId: form.get("serverId") ?? "",
    categoryId: form.get("categoryId") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      reason: "invalid",
      message: parsed.error.issues[0]?.message,
    };
  }

  const payload = new FormData();
  payload.set("gameId", parsed.data.gameId);
  payload.set("name", parsed.data.name);
  // Inteiro de centavos até o fim. O `Decimal` só nasce na borda do banco, no
  // `ProductsService` — em nenhum ponto do caminho o preço passa por float.
  payload.set("priceCents", String(parsed.data.priceCents));
  payload.set("platform", parsed.data.platform);
  payload.set("productType", parsed.data.productType);
  // Só manda se houver: o DTO trata ausente e vazio da mesma forma, mas mandar
  // string vazia deixaria o campo parecer preenchido em qualquer log.
  if (parsed.data.serverId !== "") payload.set("serverId", parsed.data.serverId);
  if (parsed.data.categoryId !== "") {
    payload.set("categoryId", parsed.data.categoryId);
  }

  const image = form.get("image");
  if (image instanceof File && image.size > 0) {
    if (image.size > MAX_IMAGE_BYTES) {
      return {
        ok: false,
        reason: "invalid",
        message: "A imagem precisa ter no máximo 5 MB.",
      };
    }
    payload.set("image", image, image.name);
  }

  const response = await apiPostFormData<{
    name: string;
    game: { name: string };
  }>("/admin/products", payload);

  if (!response.ok) {
    if (response.reason === "unauthenticated") {
      return { ok: false, reason: "unauthenticated" };
    }
    if (response.status === 403) return { ok: false, reason: "forbidden" };
    if (response.status === 400 || response.status === 404) {
      // A mensagem do backend não é repassada: ela pode ecoar o que foi
      // enviado, e texto do cliente renderizado de volta é como um payload
      // chega ao navegador de quem administra.
      return {
        ok: false,
        reason: "invalid",
        message:
          "O servidor recusou os dados. Confira se a plataforma, o servidor e o tipo pertencem ao jogo escolhido.",
      };
    }
    return { ok: false, reason: "error" };
  }

  // A listagem do painel é server component: sem invalidar, voltar para ela
  // logo depois de cadastrar podia mostrar a lista do cache, sem o produto novo
  // — o `update` e o `delete` já faziam isto, o cadastro não.
  revalidatePath("/admin/produtos");
  return {
    ok: true,
    name: response.data.name,
    gameName: response.data.game.name,
  };
}

/**
 * Lixeira do card (Figma 3805:6646).
 *
 * DESATIVA o produto — o backend faz `isActive = false`, não apaga a linha. O
 * `revalidatePath` é o que faz o card sumir da tela: a listagem é server
 * component, então sem invalidar o cache da rota a página voltaria do cache com
 * o produto ainda lá.
 */
export async function deleteProductAction(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const role = await getSessionRole();
  if (role !== "ADMIN") {
    return { ok: false, message: "Sua conta não tem permissão para excluir produtos." };
  }

  if (!isValidId(id)) return { ok: false, message: "Produto inválido." };

  const response = await apiDelete(`/admin/products/${encodeURIComponent(id)}`);
  if (!response.ok) {
    return {
      ok: false,
      message:
        response.status === 404
          ? "Este produto já não existe."
          : "Não conseguimos excluir agora. Tente novamente em instantes.",
    };
  }

  revalidatePath("/admin/produtos");
  return { ok: true };
}

/**
 * Lápis do card: salva a edição.
 *
 * O `gameId` NÃO viaja — trocar o jogo mudaria junto o significado de
 * plataforma, servidor e tipo, e o `UpdateProductDto` do backend nem o aceita.
 *
 * A imagem só vai quando o admin anexou uma nova. Sem arquivo, o campo fica de
 * fora do corpo e o backend mantém a arte que já existia: salvar o formulário
 * sem mexer na imagem não pode apagar a que estava lá.
 */
export async function updateProductAction(
  id: string,
  form: FormData,
): Promise<CreateProductResult> {
  const role = await getSessionRole();
  if (role === null) return { ok: false, reason: "unauthenticated" };
  if (role !== "ADMIN") return { ok: false, reason: "forbidden" };
  if (!isValidId(id)) return { ok: false, reason: "invalid", message: "Produto inválido." };

  // `gameId` fica de FORA: o produto já tem jogo, o backend não aceita trocá-lo
  // no PATCH, e o campo nem viaja (o select está desabilitado na tela).
  const parsed = createProductSchema
    .omit({ gameId: true })
    .safeParse({
      name: form.get("name"),
      priceCents: form.get("priceCents"),
      platform: form.get("platform"),
      productType: form.get("productType"),
      serverId: form.get("serverId") ?? "",
      categoryId: form.get("categoryId") ?? "",
    });

  if (!parsed.success) {
    return { ok: false, reason: "invalid", message: parsed.error.issues[0]?.message };
  }

  const payload = new FormData();
  payload.set("name", parsed.data.name);
  payload.set("priceCents", String(parsed.data.priceCents));
  payload.set("platform", parsed.data.platform);
  payload.set("productType", parsed.data.productType);
  // Na EDIÇÃO os dois vão SEMPRE, inclusive vazios — diferente do cadastro.
  // No PATCH, ausente significa "manter" e `""` significa "remover" (o backend
  // grava nulo). Omitir o vazio, como o cadastro faz, deixava o admin sem jeito
  // de TIRAR o servidor ou a categoria de um produto: o select voltava para
  // "nenhum", salvava, e o valor antigo continuava lá (2026-09-25).
  payload.set("serverId", parsed.data.serverId);
  payload.set("categoryId", parsed.data.categoryId);

  const image = form.get("image");
  if (image instanceof File && image.size > 0) {
    if (image.size > MAX_IMAGE_BYTES) {
      return { ok: false, reason: "invalid", message: "A imagem precisa ter no máximo 5 MB." };
    }
    payload.set("image", image, image.name);
  }

  const response = await apiPatchFormData<{ name: string; game: { name: string } }>(
    `/admin/products/${encodeURIComponent(id)}`,
    payload,
  );

  if (!response.ok) {
    if (response.reason === "unauthenticated") return { ok: false, reason: "unauthenticated" };
    if (response.status === 403) return { ok: false, reason: "forbidden" };
    if (response.status === 400 || response.status === 404) {
      return {
        ok: false,
        reason: "invalid",
        message: "O servidor recusou os dados. Confira os campos e tente de novo.",
      };
    }
    return { ok: false, reason: "error" };
  }

  revalidatePath("/admin/produtos");
  return { ok: true, name: response.data.name, gameName: response.data.game.name };
}

/**
 * "Organizar ordem": grava a ordem da aba na vitrine (2026-09-24). O 1º id vira
 * o primeiro produto; os que não vierem voltam a "não organizado".
 *
 * A vitrine lê o catálogo sem cache (`no-store`), então a nova ordem aparece na
 * próxima visita sem precisar derrubar etiqueta nenhuma.
 */
export async function saveProductOrderAction(
  gameId: string,
  type: string,
  ids: string[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  const role = await getSessionRole();
  if (role !== "ADMIN") {
    return { ok: false, message: "Sua conta não tem permissão para organizar produtos." };
  }
  if (
    typeof gameId !== "string" ||
    typeof type !== "string" ||
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > 300 ||
    !ids.every((id) => typeof id === "string")
  ) {
    return { ok: false, message: "Lista de produtos inválida." };
  }

  // Remontado: só os três campos do `SaveProductOrderDto` viajam.
  const response = await apiPut("/admin/products/order", { gameId, type, ids: [...ids] });
  if (!response.ok) {
    return {
      ok: false,
      message:
        response.status === 400 && response.message
          ? response.message
          : "Não conseguimos salvar a ordem agora. Tente novamente em instantes.",
    };
  }

  revalidatePath("/admin/produtos");
  return { ok: true };
}

/**
 * O id vai para o CAMINHO da URL. Sem conferir o formato, um `../` vindo do
 * cliente viraria outra rota do backend no `fetch` (que normaliza o caminho) —
 * com a sessão de admin de quem chamou.
 */
function isValidId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(id);
}
