"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getSessionRole } from "@/features/auth/session";
import { backendAsset } from "@/lib/publicApi";
import { LAYOUT_TAG } from "./layoutContent";
import { apiDelete, apiGet, apiPost, apiPut, apiPutFormData } from "@/lib/serverApi";
import type { SectionContent, SectionItem } from "./list";
import type { NavTabOverride } from "@/features/game/tabs";
import { MAX_IMAGE_BYTES } from "@/features/admin/games/options";

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

/**
 * Mesmo teto do multer do backend (`MAX_IMAGE_BYTES`). Conferido aqui para o
 * arquivo grande não atravessar Next → API só para ser recusado no fim; e a
 * recusa vira texto claro, em vez do "não foi possível salvar" genérico.
 */
const IMAGE_TOO_LARGE = {
  ok: false,
  reason: "invalid",
  message: "A imagem precisa ter no máximo 5 MB.",
} as const satisfies SectionsResult<never>;

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
    if (image.size > MAX_IMAGE_BYTES) return IMAGE_TOO_LARGE;
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
  for (const field of ["label", "position"] as const) {
    const value = form.get(field);
    if (typeof value === "string") payload.set(field, value);
  }
  // Aqui a ausência É intencional ("renomear sem mexer na visibilidade"), então
  // o campo continua opcional — mas, quando vem, só "true"/"false", que é o que
  // o backend aceita. Qualquer outro valor seria um 400 sem explicação.
  const isActive = form.get("isActive");
  if (isActive !== null) {
    if (isActive !== "true" && isActive !== "false") {
      return { ok: false, reason: "invalid", message: "Visibilidade inválida." };
    }
    payload.set("isActive", isActive);
  }

  const icon = form.get("icon");
  if (icon instanceof File && icon.size > 0) {
    if (icon.size > MAX_IMAGE_BYTES) return IMAGE_TOO_LARGE;
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

  // Seletor de JOGO (slides do hero). Só viaja quando o formulário TEM o campo:
  // ausente é "não mexa" para o backend, e as outras listas nunca o mandam.
  // Formato fechado porque é id — o backend confere se o jogo existe e está ativo.
  const gameId = form.get("gameId");
  if (typeof gameId === "string") {
    if (gameId !== "" && !/^[A-Za-z0-9_-]{1,100}$/.test(gameId)) {
      return { ok: false, reason: "invalid", message: "Jogo inválido." };
    }
    payload.set("gameId", gameId);
  }

  // "visível" é CHECKBOX, e checkbox desmarcado simplesmente não entra no
  // `FormData`. Repassar só quando presente fazia o backend ler a ausência como
  // "não mexa" — desmarcar e salvar não escondia nada. Na edição (com `id`) o
  // valor vai SEMPRE, explícito; o backend só aceita "true"/"false".
  // No cadastro o formulário nem tem o checkbox, e item novo nasce visível:
  // mandar "false" ali criaria todo item já escondido.
  const visible = isChecked(form.get("isActive"));
  if (payload.has("id")) payload.set("isActive", visible ? "true" : "false");
  else if (visible) payload.set("isActive", "true");

  for (const field of ["image", "secondaryImage"]) {
    const file = form.get(field);
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_IMAGE_BYTES) return IMAGE_TOO_LARGE;
      payload.set(field, file, file.name);
    }
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

/** Valor de checkbox marcado: o `value` declarado ("true") ou o padrão do navegador ("on"). */
function isChecked(value: FormDataEntryValue | null): boolean {
  return value === "true" || value === "on";
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

/* ───────────────────────── edição inline da página ───────────────────────── */

/**
 * Publica o RASCUNHO de uma página: os textos que mudaram e a ordem das sessões
 * (2026-09-15, tela `/admin/paginas`).
 *
 * Uma chamada por sessão alterada mais uma para a ordem. Não é lote no backend
 * de propósito: a rota de sessão já existe, aceita `multipart` (por causa da
 * arte) e é auditada — criar uma segunda porta de escrita para o mesmo dado
 * seria duplicar regra de validação.
 *
 * Erro no meio PARA e informa qual sessão falhou, em vez de seguir e deixar a
 * página metade nova, metade velha sem ninguém saber onde.
 */
export async function publishPageAction(input: {
  page: string;
  texts: Record<string, Record<string, string>>;
  /** Campos de ITENS de lista que mudaram (reviews, equipe, guias, dúvidas...). */
  items?: { sectionKey: string; id: string; fields: Record<string, string> }[];
  order: { key: string; hidden: boolean }[];
}): Promise<SectionsResult<{ sections: number; items: number }>> {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (
    typeof input !== "object" ||
    input === null ||
    typeof input.page !== "string" ||
    input.page === "" ||
    typeof input.texts !== "object" ||
    input.texts === null ||
    !Array.isArray(input.order)
  ) {
    return { ok: false, reason: "invalid", message: "Rascunho inválido." };
  }

  const entries = Object.entries(input.texts);

  for (const [key, fields] of entries) {
    // A chave da sessão tem que ser da página que está sendo editada: sem isso,
    // um campo forjado na página editaria a sessão de outra.
    if (!key.startsWith(`${input.page}:`)) {
      return { ok: false, reason: "invalid", message: `Sessão fora da página: ${key}` };
    }

    const payload = new FormData();
    payload.set("key", key);
    // Só os campos que o editor mandou. Um `set` vazio nos outros apagaria
    // título ou legenda que ninguém tocou.
    for (const field of ["title", "subtitle", "footnote", "body"] as const) {
      const value = fields[field];
      if (typeof value === "string") payload.set(field, value);
    }

    // Os textos EXTRAS chegam como `extra.<nome>` e viajam num JSON só — o
    // backend os MESCLA com os que já existem (ver `SectionsService.mergeExtras`).
    const extras: Record<string, string> = {};
    for (const [field, value] of Object.entries(fields)) {
      if (field.startsWith("extra.")) extras[field.slice("extra.".length)] = value;
    }
    if (Object.keys(extras).length > 0) payload.set("extras", JSON.stringify(extras));

    const result = await apiPutFormData<SectionContent>("/admin/sections", payload);
    if (!result.ok) return failure(result);
  }

  for (const item of input.items ?? []) {
    if (!item.sectionKey.startsWith(`${input.page}:`)) {
      return { ok: false, reason: "invalid", message: `Item fora da página: ${item.sectionKey}` };
    }
    const saved = await saveItemFieldsAction(item);
    if (!saved.ok) return saved;
  }

  const layout = await apiPut<{ page: string; count: number }>("/admin/sections/layout", {
    page: input.page,
    items: input.order,
  });
  if (!layout.ok) return failure(layout);

  revalidateStore();
  return { ok: true, data: { sections: entries.length, items: input.items?.length ?? 0 } };
}

/**
 * Troca a ARTE de uma sessão. Sobe na hora, fora do rascunho: binário não cabe
 * num rascunho de memória — mesma regra do Builder de Páginas.
 */
export async function uploadSectionImageAction(
  form: FormData,
): Promise<SectionsResult<SectionContent>> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const key = form.get("key");
  const image = form.get("image");
  if (typeof key !== "string" || !(image instanceof File) || image.size === 0) {
    return { ok: false, reason: "invalid", message: "Escolha uma imagem." };
  }

  if (image.size > MAX_IMAGE_BYTES) return IMAGE_TOO_LARGE;

  // "secondary" = a segunda arte da sessão; qualquer outro valor é a principal.
  const field = form.get("slot") === "secondary" ? "secondaryImage" : "image";

  const payload = new FormData();
  payload.set("key", key);
  payload.set(field, image, image.name);

  const result = await apiPutFormData<SectionContent>("/admin/sections", payload);
  if (!result.ok) return failure(result);

  revalidateStore();
  return {
    ok: true,
    data: { ...result.data, imageUrl: backendAsset(result.data.imageUrl) },
  };
}

/**
 * Salva UM campo de um item de lista, vindo da edição inline.
 *
 * Separada de `saveSectionItemAction` porque aquela é do FORMULÁRIO, que manda
 * o item inteiro: ela grava `""` nos campos ausentes, que é como o formulário
 * apaga um texto. Aqui o editor manda só o que a pessoa mexeu — mandar o resto
 * vazio apagaria o que ela não tocou.
 */
export async function saveItemFieldsAction(input: {
  sectionKey: string;
  id: string;
  fields: Record<string, string>;
}): Promise<SectionsResult<SectionItem>> {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!input.sectionKey || !input.id) {
    return { ok: false, reason: "invalid", message: "Item inválido." };
  }

  const payload = new FormData();
  payload.set("sectionKey", input.sectionKey);
  payload.set("id", input.id);
  for (const field of ["title", "body", "href"] as const) {
    const value = input.fields[field];
    if (typeof value === "string") payload.set(field, value);
  }

  const result = await apiPutFormData<SectionItem>("/admin/section-items", payload);
  if (!result.ok) return failure(result);

  revalidateStore();
  return { ok: true, data: withAssets(result.data) };
}

/** Troca a arte de um item (principal ou secundária). Sobe na hora. */
export async function uploadItemImageAction(
  form: FormData,
): Promise<SectionsResult<SectionItem>> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const sectionKey = form.get("sectionKey");
  const id = form.get("id");
  const field = form.get("field");
  const image = form.get("image");

  const slot = field === "secondaryImage" ? "secondaryImage" : "image";
  if (
    typeof sectionKey !== "string" ||
    typeof id !== "string" ||
    !(image instanceof File) ||
    image.size === 0
  ) {
    return { ok: false, reason: "invalid", message: "Escolha uma imagem." };
  }
  if (image.size > MAX_IMAGE_BYTES) return IMAGE_TOO_LARGE;

  const payload = new FormData();
  payload.set("sectionKey", sectionKey);
  payload.set("id", id);
  payload.set(slot, image, image.name);

  const result = await apiPutFormData<SectionItem>("/admin/section-items", payload);
  if (!result.ok) return failure(result);

  revalidateStore();
  return { ok: true, data: withAssets(result.data) };
}

/**
 * Cria um item VAZIO no fim da lista, a partir da edição inline.
 *
 * O texto vem depois, clicando nele na própria página. Nasce com um rótulo
 * genérico em vez de em branco: um item sem nenhum texto é invisível na página,
 * e quem acabou de clicar em "+ novo" precisa ver onde ele caiu.
 */
export async function addSectionItemAction(
  sectionKey: string,
  label: string,
): Promise<SectionsResult<SectionItem>> {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!sectionKey) {
    return { ok: false, reason: "invalid", message: "Sessão inválida." };
  }

  const payload = new FormData();
  payload.set("sectionKey", sectionKey);
  payload.set("title", `Novo ${label}`.slice(0, 120));

  const result = await apiPutFormData<SectionItem>("/admin/section-items", payload);
  if (!result.ok) return failure(result);

  revalidateStore();
  return { ok: true, data: withAssets(result.data) };
}

/**
 * Liga um item a um JOGO cadastrado — o botão "jogo" da barrinha em
 * `/admin/paginas` (2026-09-25). Manda SÓ `gameId`: os outros campos ausentes
 * são "não mexa" para o backend, que copia nome e link do jogo para o item.
 */
export async function setSectionItemGameAction(
  sectionKey: string,
  id: string,
  gameId: string,
): Promise<SectionsResult<SectionItem>> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const idPattern = /^[A-Za-z0-9_-]{1,100}$/;
  if (!sectionKey || !idPattern.test(id) || !idPattern.test(gameId)) {
    return { ok: false, reason: "invalid", message: "Jogo inválido." };
  }

  const payload = new FormData();
  payload.set("sectionKey", sectionKey);
  payload.set("id", id);
  payload.set("gameId", gameId);

  const result = await apiPutFormData<SectionItem>("/admin/section-items", payload);
  if (!result.ok) return failure(result);

  revalidateStore();
  return { ok: true, data: withAssets(result.data) };
}

/**
 * VÍDEO da sessão (2026-09-17) — link do YouTube OU arquivo enviado; gravar um
 * apaga o outro no backend.
 *
 * O UPLOAD do arquivo não passa por aqui: até 100 MB atravessando um server
 * action seria o vídeo inteiro na memória do servidor do Next (e acima do teto
 * de corpo dele). O navegador envia direto à API (`editing/videoUpload.ts`) e
 * depois chama `videoUploadedAction` só para a loja reler.
 */
export async function saveVideoLinkAction(
  key: string,
  url: string,
): Promise<SectionsResult<null>> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const result = await apiPut<unknown>("/admin/sections/video-link", { key, url: url.trim() });
  if (!result.ok) return failure(result);
  revalidateStore();
  return { ok: true, data: null };
}

export async function removeVideoAction(key: string): Promise<SectionsResult<null>> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const result = await apiDelete<unknown>(
    `/admin/sections/video?key=${encodeURIComponent(key)}`,
  );
  if (!result.ok) return failure(result);
  revalidateStore();
  return { ok: true, data: null };
}

/** Depois do upload direto à API: a loja relê a sessão. */
export async function videoUploadedAction(): Promise<SectionsResult<null>> {
  const denied = await requireAdmin();
  if (denied) return denied;
  revalidateStore();
  return { ok: true, data: null };
}
