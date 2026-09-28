"use server";

import { revalidatePath } from "next/cache";
import { getSessionRole } from "@/features/auth/session";
import { cleanCategories } from "@/features/admin/builder/payload";
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  apiPutFormData,
} from "@/lib/serverApi";
import { MAX_IMAGE_BYTES } from "../options";
import {
  createTabSchema,
  isValidId,
  updateTabSchema,
  type CreateTabInput,
  type GameTab,
  type ScopedCategoryRow,
  type UpdateTabInput,
} from "./types";

/**
 * Escritas das ABAS POR JOGO (contrato `.claude/context/game-tabs.md`).
 *
 * Só ADMIN: aba é estrutura do catálogo (define onde produto mora e como a
 * página do jogo se desenha), não conteúdo — o EDITOR segue no Builder. A
 * conferência aqui é a segunda porta; a de verdade é o `@Roles('ADMIN')` do
 * backend. Está aqui porque server action é endereço PÚBLICO e não passa pelo
 * layout que protege a tela.
 *
 * Todo corpo é REMONTADO a partir do que passou pelo zod — campo extra
 * injetado na página não viaja. Todo id que entra no caminho da URL passa pelo
 * formato fechado de `isValidId`.
 *
 * Mensagens do backend: repassadas nas recusas de DADO (400/409), porque são
 * as acionáveis ("há 3 produtos ativos nesta aba", "endereço já usado"). A tela
 * as mostra como TEXTO, nunca HTML, e só no painel.
 */

export type TabsResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      reason: "unauthenticated" | "forbidden" | "invalid" | "error";
      message?: string;
    };

async function requireAdmin(): Promise<TabsResult<never> | null> {
  const role = await getSessionRole();
  if (role === null) return { ok: false, reason: "unauthenticated" };
  if (role !== "ADMIN") return { ok: false, reason: "forbidden" };
  return null;
}

const INVALID_ID = { ok: false, reason: "invalid", message: "Identificador inválido." } as const;

function base(gameId: string) {
  return `/admin/games/${encodeURIComponent(gameId)}/tabs`;
}

/**
 * O painel de jogos e produtos mostram as abas, e a página do jogo na loja é
 * desenhada por elas. `"/games/[slug]"` com `"page"` invalida TODAS as páginas
 * de jogo — assim a action não precisa confiar num slug vindo do cliente, e o
 * custo é só a próxima visita de cada jogo renderizar de novo (a vitrine já é
 * `no-store`; o que se limpa aqui é o Router Cache de quem está navegando).
 *
 * Nome e arte de aba NÃO aparecem no menu GAMES do cabeçalho, então
 * `GAMES_MENU_TAG` não é derrubada.
 */
function revalidate() {
  revalidatePath("/admin/jogos", "layout");
  revalidatePath("/admin/produtos", "layout");
  revalidatePath("/admin/builder", "layout");
  revalidatePath("/games/[slug]", "page");
}

function failure(result: {
  status: number;
  reason: "unauthenticated" | "error";
  message?: string;
}): TabsResult<never> {
  if (result.reason === "unauthenticated") return { ok: false, reason: "unauthenticated" };
  if (result.status === 403) return { ok: false, reason: "forbidden" };
  if (result.status === 400 || result.status === 409) {
    return { ok: false, reason: "invalid", message: result.message };
  }
  if (result.status === 404) {
    return { ok: false, reason: "invalid", message: "Esta aba (ou o jogo) já não existe." };
  }
  return { ok: false, reason: "error" };
}

/** Lê as abas — para o cadastro de produto, quando o jogo muda na tela. */
export async function listGameTabsAction(gameId: string): Promise<TabsResult<GameTab[]>> {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!isValidId(gameId)) return INVALID_ID;

  const result = await apiGet<GameTab[]>(base(gameId));
  if (!result.ok) return failure(result);
  if (!Array.isArray(result.data)) return { ok: false, reason: "error" };
  return { ok: true, data: [...result.data].sort((a, b) => a.position - b.position) };
}

export async function createTabAction(
  gameId: string,
  input: CreateTabInput,
): Promise<TabsResult<GameTab>> {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!isValidId(gameId)) return INVALID_ID;

  const parsed = createTabSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: "invalid", message: parsed.error.issues[0]?.message };
  }

  const { label, slug, layout, linkHref, content, isActive } = parsed.data;
  const result = await apiPost<GameTab>(base(gameId), {
    label,
    ...(slug ? { slug } : {}),
    layout,
    ...(layout === "LINK" ? { linkHref } : {}),
    ...(layout === "SERVICE" && content ? { content: copyContent(content) } : {}),
    ...(isActive === undefined ? {} : { isActive }),
  });
  if (!result.ok) return failure(result);

  revalidate();
  return { ok: true, data: result.data };
}

export async function updateTabAction(
  gameId: string,
  tabId: string,
  input: UpdateTabInput,
): Promise<TabsResult<GameTab>> {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!isValidId(gameId) || !isValidId(tabId)) return INVALID_ID;

  const parsed = updateTabSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: "invalid", message: parsed.error.issues[0]?.message };
  }

  // Só o que veio: ausente = "não mexer" no PATCH.
  const data = parsed.data;
  const body: Record<string, unknown> = {};
  if (data.label !== undefined) body.label = data.label;
  if (data.slug !== undefined) body.slug = data.slug;
  if (data.linkHref !== undefined) body.linkHref = data.linkHref;
  if (data.content !== undefined) {
    body.content = data.content === null ? null : copyContent(data.content);
  }
  if (data.isActive !== undefined) body.isActive = data.isActive;
  if (Object.keys(body).length === 0) {
    return { ok: false, reason: "invalid", message: "Nada para salvar." };
  }

  const result = await apiPatch<GameTab>(`${base(gameId)}/${encodeURIComponent(tabId)}`, body);
  if (!result.ok) return failure(result);

  revalidate();
  return { ok: true, data: result.data };
}

/** Grava a ordem. O backend exige TODAS as abas do jogo na lista. */
export async function reorderTabsAction(
  gameId: string,
  ids: string[],
): Promise<TabsResult<GameTab[]>> {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!isValidId(gameId)) return INVALID_ID;
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > 100 ||
    !ids.every(isValidId) ||
    new Set(ids).size !== ids.length
  ) {
    return { ok: false, reason: "invalid", message: "Lista de abas inválida." };
  }

  const result = await apiPut<GameTab[]>(`${base(gameId)}/order`, { ids: [...ids] });
  if (!result.ok) return failure(result);

  revalidate();
  return { ok: true, data: result.data };
}

/** Troca o ícone. Mesmo pipeline das outras artes (sharp → WebP no backend). */
export async function uploadTabIconAction(
  gameId: string,
  tabId: string,
  form: FormData,
): Promise<TabsResult<{ iconUrl: string }>> {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!isValidId(gameId) || !isValidId(tabId)) return INVALID_ID;

  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, reason: "invalid", message: "Escolha uma imagem." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, reason: "invalid", message: "A imagem precisa ter no máximo 5 MB." };
  }
  // SVG fica de fora (XSS armazenado); o backend confere de novo pelo conteúdo.
  if (!["image/png", "image/jpeg", "image/webp", "image/avif"].includes(file.type)) {
    return { ok: false, reason: "invalid", message: "Use PNG, JPEG, WebP ou AVIF." };
  }

  const body = new FormData();
  body.append("image", file, file.name);
  const result = await apiPutFormData<{ iconUrl: string }>(
    `${base(gameId)}/${encodeURIComponent(tabId)}/icon`,
    body,
  );
  if (!result.ok) return failure(result);

  revalidate();
  return { ok: true, data: { iconUrl: result.data.iconUrl } };
}

/**
 * Apaga a aba. Com produto ATIVO dentro o backend responde 409 com a contagem
 * — a mensagem vai para a tela como veio, porque é ela que diz o que fazer.
 */
export async function deleteTabAction(
  gameId: string,
  tabId: string,
): Promise<TabsResult<{ id: string }>> {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!isValidId(gameId) || !isValidId(tabId)) return INVALID_ID;

  const result = await apiDelete<unknown>(`${base(gameId)}/${encodeURIComponent(tabId)}`);
  if (!result.ok) {
    if (result.status === 409) {
      return {
        ok: false,
        reason: "invalid",
        message: result.message ?? "Esta aba ainda tem produtos ativos. Mova ou exclua-os antes.",
      };
    }
    return failure(result);
  }

  revalidate();
  return { ok: true, data: { id: tabId } };
}

/**
 * Categorias de um escopo (aba + servidor; `serverId: null` = todos os
 * servidores). Troca COMPLETA daquele escopo — o backend recusa com 400 e a
 * contagem se a lista tirar uma categoria que ainda tem produto.
 *
 * Mesma limpeza do Builder (`cleanCategories`): linha em branco é descartada,
 * pai sem nome com filhas é recusado, só `id`/`label` viajam.
 */
export async function saveTabCategoriesAction(
  gameId: string,
  tabId: string,
  serverId: string | null,
  categories: unknown,
): Promise<TabsResult<ScopedCategoryRow[]>> {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!isValidId(gameId) || !isValidId(tabId)) return INVALID_ID;
  if (serverId !== null && !isValidId(serverId)) return INVALID_ID;

  const cleaned = cleanCategories(categories);
  if (!cleaned.ok) return { ok: false, reason: "invalid", message: cleaned.message };
  if (cleaned.data.length > 200 || cleaned.data.some((c) => c.label.length > 120 || c.children.length > 100)) {
    return { ok: false, reason: "invalid", message: "Lista de categorias grande demais." };
  }
  if (cleaned.data.some((c) => c.children.some((child) => child.label.length > 120))) {
    return { ok: false, reason: "invalid", message: "Nome de subcategoria longo demais (máx. 120)." };
  }

  const result = await apiPut<ScopedCategoryRow[]>(
    `${base(gameId)}/${encodeURIComponent(tabId)}/categories`,
    { serverId, categories: cleaned.data },
  );
  if (!result.ok) return failure(result);

  revalidate();
  return { ok: true, data: Array.isArray(result.data) ? result.data : [] };
}

/** Remonta o conteúdo: só `title` e `items` viajam (itens vazios já caíram no zod). */
function copyContent(content: { sections: { title: string; items: string[] }[] }) {
  return {
    sections: content.sections.map((section) => ({
      title: section.title,
      items: [...section.items],
    })),
  };
}
