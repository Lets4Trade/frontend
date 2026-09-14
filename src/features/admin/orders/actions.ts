"use server";

import { revalidatePath } from "next/cache";
import { getSessionRole } from "@/features/auth/session";
import { apiPatch } from "@/lib/serverApi";
import type { AdminOrder } from "./types";

/**
 * As escritas de "Vendas e pedidos".
 *
 * Passa pelo SERVIDOR e não pelo navegador, pelo mesmo motivo do resto do
 * painel: o token é cookie `httpOnly` que a página não alcança.
 *
 * A conferência de papel é a terceira, e a menos importante — o layout já
 * barrou a navegação e o `RolesGuard` vai barrar a chamada. Está aqui porque
 * server action é um ENDEREÇO PÚBLICO: o Next expõe uma rota para ela, e essa
 * rota não passa pelo layout que protege a página.
 */

export type UpdateOrderResult =
  | { ok: true; order: AdminOrder }
  | {
      ok: false;
      reason: "unauthenticated" | "forbidden" | "invalid" | "error";
      message?: string;
    };

/**
 * Altera situação e/ou atendente de um pedido.
 *
 * ── `undefined` não é `null` ───────────────────────────────────────────────
 * Campo ausente no corpo significa "não mexa"; `null` em `assigneeId` significa
 * "desatribua". É o que permite trocar só a situação sem apagar o atendente — e
 * é por isso que o corpo é montado campo a campo em vez de repassar o objeto.
 */
export async function updateOrderAction(
  id: string,
  patch: { status?: string; assigneeId?: string | null },
): Promise<UpdateOrderResult> {
  const role = await getSessionRole();
  if (role === null) return { ok: false, reason: "unauthenticated" };
  if (role !== "ADMIN") return { ok: false, reason: "forbidden" };

  if (typeof id !== "string" || id.trim() === "" || id.length > 100) {
    return { ok: false, reason: "invalid" };
  }

  const body: { status?: string; assigneeId?: string | null } = {};
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.assigneeId !== undefined) body.assigneeId = patch.assigneeId;

  if (Object.keys(body).length === 0) {
    return { ok: false, reason: "invalid", message: "Nada para alterar." };
  }

  const result = await apiPatch<AdminOrder>(`/admin/orders/${id}`, body);

  if (!result.ok) {
    if (result.reason === "unauthenticated") {
      return { ok: false, reason: "unauthenticated" };
    }
    if (result.status === 403) return { ok: false, reason: "forbidden" };
    return {
      ok: false,
      // A mensagem do backend é preservada: "Atendente não encontrado ou sem
      // permissão" diz o que fazer, e um erro genérico não diria nada.
      reason: result.status === 400 || result.status === 404 ? "invalid" : "error",
      message: result.message,
    };
  }

  // A tabela é server component: sem invalidar a rota, a linha voltaria do
  // cache com a situação antiga na próxima navegação.
  revalidatePath("/admin/pedidos");
  return { ok: true, order: result.data };
}
