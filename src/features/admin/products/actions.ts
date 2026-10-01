"use server";

import { getSessionRole } from "@/features/auth/session";
import { revalidatePath } from "next/cache";
import { apiDelete, apiPatchFormData, apiPost, apiPostFormData, apiPut } from "@/lib/serverApi";
import { MAX_IMAGE_BYTES } from "../games/options";
import { pricingSchema, type Pricing } from "@/features/pricing/quote";
import { MAX_PRICE_BATCH, MAX_PRICE_CENTS } from "./prices";
import { createProductSchema, highlightsSchema } from "./schema";
import { tabContentSchema, type TabContent } from "../games/tabs/types";

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
    tabId: form.get("tabId"),
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

  const pricing = readPricing(form);
  if (!pricing.ok) return { ok: false, reason: "invalid", message: pricing.message };
  const highlights = readHighlights(form);
  if (!highlights.ok) return { ok: false, reason: "invalid", message: highlights.message };
  const content = readContent(form);
  if (!content.ok) return { ok: false, reason: "invalid", message: content.message };

  const payload = new FormData();
  payload.set("gameId", parsed.data.gameId);
  payload.set("name", parsed.data.name);
  // Inteiro de centavos até o fim. O `Decimal` só nasce na borda do banco, no
  // `ProductsService` — em nenhum ponto do caminho o preço passa por float.
  payload.set("priceCents", String(parsed.data.priceCents));
  payload.set("platform", parsed.data.platform);
  // A aba do jogo — "tipo de produto" não existe mais (FASE 5).
  payload.set("tabId", parsed.data.tabId);
  // Cadastro: só vai quando há regra (aba SERVIÇO). `null` num cadastro seria
  // o mesmo que não mandar.
  if (pricing.value) payload.set("pricing", JSON.stringify(pricing.value));
  // Tópicos do card (aba PACOTES). Em multipart vão como TEXTO com o JSON da
  // lista dentro — mesmo formato do `pricing`.
  if (highlights.value !== undefined) payload.set("highlights", JSON.stringify(highlights.value));
  // Textos da página do pacote (2026-10-01): no cadastro, só quando há.
  if (content.value) payload.set("content", JSON.stringify(content.value));
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
          "O servidor recusou os dados. Confira se a plataforma, o servidor, a aba e a categoria pertencem ao jogo escolhido.",
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
 * "Reativar" dos desativados na Central do jogo — desfaz a lixeira.
 * Revalida as duas árvores: a Central (`/admin/jogos/...`) e a listagem.
 */
export async function reactivateProductAction(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const role = await getSessionRole();
  if (role !== "ADMIN") {
    return { ok: false, message: "Sua conta não tem permissão para reativar produtos." };
  }

  if (!isValidId(id)) return { ok: false, message: "Produto inválido." };

  const response = await apiPost(`/admin/products/${encodeURIComponent(id)}/reactivate`, {});
  if (!response.ok) {
    return {
      ok: false,
      message:
        response.status === 404
          ? "Este produto já não existe."
          : response.status === 400
            ? "O jogo deste produto está desativado. Reative o jogo antes."
            : "Não conseguimos reativar agora. Tente novamente em instantes.",
    };
  }

  revalidatePath("/admin/jogos", "layout");
  revalidatePath("/admin/produtos", "layout");
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
      tabId: form.get("tabId"),
      serverId: form.get("serverId") ?? "",
      categoryId: form.get("categoryId") ?? "",
    });

  if (!parsed.success) {
    return { ok: false, reason: "invalid", message: parsed.error.issues[0]?.message };
  }

  const pricing = readPricing(form);
  if (!pricing.ok) return { ok: false, reason: "invalid", message: pricing.message };
  const highlights = readHighlights(form);
  if (!highlights.ok) return { ok: false, reason: "invalid", message: highlights.message };
  const content = readContent(form);
  if (!content.ok) return { ok: false, reason: "invalid", message: content.message };

  const payload = new FormData();
  payload.set("name", parsed.data.name);
  payload.set("priceCents", String(parsed.data.priceCents));
  payload.set("platform", parsed.data.platform);
  payload.set("tabId", parsed.data.tabId);
  // Na edição `null` LIMPA a regra (produto que passou de uma aba SERVIÇO para
  // uma CATÁLOGO); ausente mantém.
  if (pricing.value !== undefined) {
    payload.set("pricing", pricing.value === null ? "null" : JSON.stringify(pricing.value));
  }
  // Tópicos: ausente mantém; `[]` limpa (produto que saiu de uma aba PACOTES).
  if (highlights.value !== undefined) payload.set("highlights", JSON.stringify(highlights.value));
  // Textos do pacote: ausente mantém; `null` limpa (volta aos textos da aba).
  if (content.value !== undefined) {
    payload.set("content", content.value === null ? "null" : JSON.stringify(content.value));
  }
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
  /** A aba do jogo (`tabId`, abas por jogo 2026-09-28). */
  tabId: string,
  ids: string[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  const role = await getSessionRole();
  if (role !== "ADMIN") {
    return { ok: false, message: "Sua conta não tem permissão para organizar produtos." };
  }
  if (!isValidId(tabId)) {
    return { ok: false, message: "Aba inválida." };
  }
  if (
    typeof gameId !== "string" ||
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > 300 ||
    !ids.every((id) => typeof id === "string")
  ) {
    return { ok: false, message: "Lista de produtos inválida." };
  }

  // Remontado: só os campos do `SaveProductOrderDto` viajam.
  const response = await apiPut("/admin/products/order", {
    gameId,
    tabId,
    ids: [...ids],
  });
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
 * "Editar preços" (2026-10-01): vários preços de um jogo numa gravação só.
 *
 * Tudo ou nada no backend: cada item leva o preço que a tela leu, e se algum
 * mudou no meio do caminho a resposta é 409 com os nomes — essa mensagem é
 * repassada como veio, porque é ela que diz o que conferir.
 */
export async function saveProductPricesAction(
  gameId: string,
  items: { id: string; priceCents: number; expectedPriceCents: number }[],
): Promise<{ ok: true; saved: number } | { ok: false; message: string }> {
  const role = await getSessionRole();
  if (role !== "ADMIN") {
    return { ok: false, message: "Sua conta não tem permissão para alterar preços." };
  }
  const cents = (value: unknown, min: number) =>
    Number.isInteger(value) && (value as number) >= min && (value as number) <= MAX_PRICE_CENTS;
  if (
    !isValidId(gameId) ||
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > MAX_PRICE_BATCH ||
    !items.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        isValidId(item.id) &&
        cents(item.priceCents, 1) &&
        cents(item.expectedPriceCents, 0),
    )
  ) {
    return { ok: false, message: "Lista de preços inválida." };
  }

  // Remontado: só os campos do `SaveProductPricesDto` viajam.
  const response = await apiPut<{ saved: number }>("/admin/products/prices", {
    gameId,
    items: items.map(({ id, priceCents, expectedPriceCents }) => ({ id, priceCents, expectedPriceCents })),
  });
  if (!response.ok) {
    return {
      ok: false,
      message:
        (response.status === 409 || response.status === 400) && response.message
          ? response.message
          : "Não conseguimos salvar os preços agora. Tente novamente em instantes.",
    };
  }

  revalidatePath("/admin/produtos", "layout");
  revalidatePath("/admin/jogos", "layout");
  return { ok: true, saved: response.data?.saved ?? items.length };
}

/**
 * O id vai para o CAMINHO da URL. Sem conferir o formato, um `../` vindo do
 * cliente viraria outra rota do backend no `fetch` (que normaliza o caminho) —
 * com a sessão de admin de quem chamou.
 */
function isValidId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(id);
}

/** Teto do JSON da regra: 20 adicionais + 50 faixas cabem com folga em 20 KB. */
const MAX_PRICING_CHARS = 20_000;

/**
 * Lê o campo `pricing` do formulário: ausente/vazio = `undefined` (não mexer),
 * `"null"` = `null` (limpar), o resto é JSON validado pelo `pricingSchema` do
 * contrato — o MESMO que o backend usa. Vai adiante REMONTADO (o `data` do zod),
 * então chave extra injetada no JSON não viaja.
 */
function readPricing(
  form: FormData,
): { ok: true; value: Pricing | null | undefined } | { ok: false; message: string } {
  const raw = form.get("pricing");
  if (raw === null || raw === "") return { ok: true, value: undefined };
  if (typeof raw !== "string" || raw.length > MAX_PRICING_CHARS) {
    return { ok: false, message: "Regra de preço inválida." };
  }
  if (raw === "null") return { ok: true, value: null };

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, message: "Regra de preço inválida." };
  }
  const parsed = pricingSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Regra de preço inválida." };
  }
  return { ok: true, value: parsed.data };
}

/** Teto do JSON dos textos do pacote: 10 seções × 20 itens × 300 cabem em 80 KB. */
const MAX_CONTENT_CHARS = 80_000;

/**
 * Lê o campo `content` (textos da página do PACOTE, 2026-10-01): ausente/vazio
 * = `undefined` (não mexer); `"null"` ou nenhuma seção = `null` (limpar, a
 * página usa os textos da aba). O resto passa pelo MESMO schema dos textos da
 * aba (`tabContentSchema`) — texto puro, nos mesmos limites que o backend
 * confere de novo.
 */
function readContent(
  form: FormData,
): { ok: true; value: TabContent | null | undefined } | { ok: false; message: string } {
  const raw = form.get("content");
  if (raw === null || raw === "") return { ok: true, value: undefined };
  if (typeof raw !== "string" || raw.length > MAX_CONTENT_CHARS) {
    return { ok: false, message: "Textos do pacote inválidos." };
  }
  if (raw === "null") return { ok: true, value: null };

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, message: "Textos do pacote inválidos." };
  }
  const parsed = tabContentSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, message: `Textos do pacote: ${parsed.error.issues[0]?.message ?? "inválidos."}` };
  }
  return { ok: true, value: parsed.data.sections.length > 0 ? parsed.data : null };
}

/** Teto do JSON dos tópicos: 6 × 80 caracteres cabem com folga em 4 KB. */
const MAX_HIGHLIGHTS_CHARS = 4_000;

/**
 * Lê o campo `highlights` (JSON de `string[]`): ausente/vazio = `undefined`
 * (não mexer). O resto passa pelo `highlightsSchema` — trim, vazios fora, até
 * 6 × 80 — e vai adiante REMONTADO (a lista do zod).
 */
function readHighlights(
  form: FormData,
): { ok: true; value: string[] | undefined } | { ok: false; message: string } {
  const raw = form.get("highlights");
  if (raw === null || raw === "") return { ok: true, value: undefined };
  if (typeof raw !== "string" || raw.length > MAX_HIGHLIGHTS_CHARS) {
    return { ok: false, message: "Tópicos do card inválidos." };
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, message: "Tópicos do card inválidos." };
  }
  const parsed = highlightsSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Tópicos do card inválidos." };
  }
  return { ok: true, value: parsed.data };
}
