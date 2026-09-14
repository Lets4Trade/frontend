"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getSessionRole } from "@/features/auth/session";
import { backendAsset } from "@/lib/publicApi";
import { LAYOUT_TAG } from "./layoutContent";
import { apiDelete, apiGet, apiPost, apiPutFormData } from "@/lib/serverApi";
import type { SectionContent, SectionItem } from "./list";
import type { NavTabOverride } from "@/features/game/tabs";

/**
 * As escritas de "Edição de sessões" (Figma 3806:7081).
 *
 * Passam pelo SERVIDOR porque o token é cookie `httpOnly` que a página não
 * alcança, e a conferência de papel está aqui porque server action é um
 * ENDEREÇO PÚBLICO — o Next expõe uma rota para ela, e essa rota não passa pelo
 * layout que protege a página.
 *
 * ── Por que `revalidatePath` da LOJA ───────────────────────────────────────
 * A fileira de abas aparece em toda página de jogo, e as sessões nas páginas
 * fixas. Sem invalidar, quem já esteve nelas continuaria vendo o Router Cache
 * antigo — e concluiria que o salvamento falhou.
 */

export type SectionsResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      reason: "unauthenticated" | "forbidden" | "invalid" | "error";
      message?: string;
    };

async function requireAdmin(): Promise<SectionsResult<never> | null> {
  const role = await getSessionRole();
  if (role === null) return { ok: false, reason: "unauthenticated" };
  if (role !== "ADMIN") return { ok: false, reason: "forbidden" };
  return null;
}

/**
 * Salva título e arte de uma sessão.
 *
 * O `FormData` que chega da tela NÃO é reencaminhado como veio: montamos um
 * novo com os campos que o backend declara, então um campo extra injetado na
 * página não viaja junto. É a mesma regra dos outros formulários do painel.
 */
export async function saveSectionAction(
  form: FormData,
): Promise<SectionsResult<SectionContent>> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const key = form.get("key");
  if (typeof key !== "string" || key.trim() === "") {
    return { ok: false, reason: "invalid", message: "Escolha uma sessão." };
  }

  const payload = new FormData();
  payload.set("key", key);

  // Os quatro textos da sessão. Campo ausente vira string vazia, que o backend
  // grava como nulo — é assim que "apaguei o subtítulo" volta ao padrão do
  // código em vez de gravar espaço em branco.
  for (const field of ["title", "subtitle", "footnote", "body"]) {
    const value = form.get(field);
    payload.set(field, typeof value === "string" ? value : "");
  }

  const image = form.get("image");
  if (image instanceof File && image.size > 0) {
    payload.set("image", image, image.name);
  }

  const result = await apiPutFormData<SectionContent>("/admin/sections", payload);
  if (!result.ok) return failure(result);

  revalidateStore();
  return {
    ok: true,
    data: { ...result.data, imageUrl: backendAsset(result.data.imageUrl) },
  };
}

/** Devolve uma sessão ao que o código declara. */
export async function resetSectionAction(
  key: string,
): Promise<SectionsResult<{ key: string }>> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const result = await apiDelete<{ key: string }>(
    `/admin/sections/${encodeURIComponent(key)}`,
  );
  if (!result.ok) return failure(result);

  revalidateStore();
  return { ok: true, data: result.data };
}

/**
 * Salva a personalização de uma aba: rótulo, ícone, ordem ou visibilidade.
 *
 * Só o que veio no `FormData` é reenviado. Ausente significa "não mexa neste
 * campo" — é o que permite trocar só o rótulo sem apagar o ícone, e esconder
 * uma aba sem renomeá-la.
 */
export async function saveTabAction(
  form: FormData,
): Promise<SectionsResult<NavTabOverride>> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const key = form.get("key");
  if (typeof key !== "string" || key.trim() === "") {
    return { ok: false, reason: "invalid", message: "Aba inválida." };
  }

  const payload = new FormData();
  payload.set("key", key);
  for (const field of ["label", "position", "isActive"] as const) {
    const value = form.get(field);
    if (typeof value === "string") payload.set(field, value);
  }

  const icon = form.get("icon");
  if (icon instanceof File && icon.size > 0) {
    payload.set("icon", icon, icon.name);
  }

  const result = await apiPutFormData<NavTabOverride>(
    "/admin/sections/tabs",
    payload,
  );
  if (!result.ok) return failure(result);

  revalidateStore();
  return {
    ok: true,
    data: { ...result.data, iconUrl: backendAsset(result.data.iconUrl) },
  };
}

/**
 * A loja inteira e o painel passam a mostrar o que acabou de ser salvo.
 *
 * `"layout"` em `/games` porque a fileira de abas aparece em TODA página de
 * jogo, e não há como saber quais delas o navegador já guardou.
 */
function revalidateStore() {
  revalidatePath("/", "layout");
  revalidatePath("/games", "layout");
  revalidatePath("/admin/sessoes");

  // O cabeçalho e o rodapé leem CACHEADOS, com TTL de uma hora — é o que os
  // impede de bater no backend em toda requisição do site (ver
  // `layoutContent.ts`). `revalidatePath` acima não os alcança: ele invalida o
  // que o Next renderizou, não a resposta do `fetch` que alimentou o render.
  // Sem esta linha, editar o rodapé e não ver nada mudar por uma hora seria o
  // comportamento normal.
  //
  // `updateTag` e não `revalidateTag`: no Next 16 aquele expira a etiqueta na
  // HORA e é o caminho declarado para server action ("read-your-own-writes"),
  // enquanto este pede um perfil de cache e trabalha com prazo. Quem acabou de
  // salvar tem que ver o resultado no mesmo clique.
  updateTag(LAYOUT_TAG);
}

function failure(result: {
  status: number;
  reason: "unauthenticated" | "error";
  message?: string;
}): SectionsResult<never> {
  if (result.reason === "unauthenticated") {
    return { ok: false, reason: "unauthenticated" };
  }
  return {
    ok: false,
    reason: result.status === 400 || result.status === 404 ? "invalid" : "error",
    message: result.message,
  };
}


/**
 * Salva um ITEM de lista de sessão — um review, um membro da equipe, um guia,
 * uma dúvida.
 *
 * Cria e edita pela MESMA ação: o formulário de um item novo e o de um item
 * existente são idênticos, e separar em duas obrigaria a tela a saber de
 * antemão qual chamar. O que decide é a presença do `id`.
 *
 * Como no resto do painel, o `FormData` da tela NÃO é reencaminhado como veio:
 * montamos um novo com os campos que o backend declara.
 */
export async function saveSectionItemAction(
  form: FormData,
): Promise<SectionsResult<SectionItem>> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const sectionKey = form.get("sectionKey");
  if (typeof sectionKey !== "string" || sectionKey.trim() === "") {
    return { ok: false, reason: "invalid", message: "Escolha uma sess\u00e3o." };
  }

  const payload = new FormData();
  payload.set("sectionKey", sectionKey);

  const id = form.get("id");
  if (typeof id === "string" && id.trim() !== "") payload.set("id", id);

  for (const field of ["title", "body", "href"]) {
    const value = form.get(field);
    payload.set(field, typeof value === "string" ? value : "");
  }

  const isActive = form.get("isActive");
  if (typeof isActive === "string") payload.set("isActive", isActive);

  for (const field of ["image", "secondaryImage"]) {
    const file = form.get(field);
    if (file instanceof File && file.size > 0) payload.set(field, file, file.name);
  }

  const result = await apiPutFormData<SectionItem>("/admin/section-items", payload);
  if (!result.ok) return failure(result);

  revalidateStore();
  return { ok: true, data: withAssets(result.data) };
}

/** Apaga um item. É exclusão de verdade — ver `SectionItemsService.remove`. */
export async function deleteSectionItemAction(
  sectionKey: string,
  id: string,
): Promise<SectionsResult<{ id: string }>> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const result = await apiDelete<{ id: string }>(
    `/admin/section-items/${encodeURIComponent(id)}?key=${encodeURIComponent(sectionKey)}`,
  );
  if (!result.ok) return failure(result);

  revalidateStore();
  return { ok: true, data: result.data };
}

/**
 * Reordena a lista inteira.
 *
 * Manda TODOS os ids na nova ordem, e não "mova X para N": o servidor reescreve
 * as posições numa transação, e o resultado não depende do que ele achava que
 * estava lá. Mesma decisão da ordem das seções no Builder de Páginas.
 */
export async function reorderSectionItemsAction(
  sectionKey: string,
  ids: string[],
): Promise<SectionsResult<SectionItem[]>> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const result = await apiPost<SectionItem[]>("/admin/section-items/reorder", {
    sectionKey,
    ids,
  });
  if (!result.ok) return failure(result);

  revalidateStore();
  return { ok: true, data: result.data.map(withAssets) };
}

/** As artes voltam do backend como caminho relativo; a tela precisa da URL. */
function withAssets(item: SectionItem): SectionItem {
  return {
    ...item,
    imageUrl: backendAsset(item.imageUrl),
    secondaryImageUrl: backendAsset(item.secondaryImageUrl),
  };
}

/**
 * Carrega os itens de uma sessão para o painel, INCLUSIVE os escondidos.
 *
 * Server action e não `fetch` do navegador porque o token é cookie `httpOnly`
 * que a página não alcança — a mesma razão das escritas. A conferência de papel
 * está aqui pelo mesmo motivo: server action é endereço público.
 *
 * Uma ida por sessão escolhida, e não todas de uma vez: são sete listas hoje, e
 * quem edita mexe numa. Carregar as sete no `load` da tela pagaria por seis que
 * ninguém vai abrir.
 */
export async function loadSectionItemsAction(
  sectionKey: string,
): Promise<SectionsResult<SectionItem[]>> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const result = await apiGet<SectionItem[]>(
    `/admin/section-items?key=${encodeURIComponent(sectionKey)}`,
  );
  if (!result.ok) return failure(result);

  return { ok: true, data: result.data.map(withAssets) };
}
