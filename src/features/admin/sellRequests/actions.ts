"use server";

import { revalidatePath } from "next/cache";
import { getSessionRole } from "@/features/auth/session";
import { canAccess } from "@/features/admin/permissions";
import { apiPatch } from "@/lib/serverApi";
import { parseStatus } from "./types";

export type UpdateSellRequestResult = { ok: true } | { ok: false; message: string };

/**
 * Muda a situação de uma proposta. Server action é endereço PÚBLICO: confere o
 * cargo de novo (o `RolesGuard` do backend é quem decide de verdade) e fecha o
 * formato do id, que vai para o CAMINHO da URL.
 */
export async function updateSellRequestAction(id: string, status: string): Promise<UpdateSellRequestResult> {
  if (!canAccess(await getSessionRole(), "orders")) {
    return { ok: false, message: "Sem permissão para mudar propostas." };
  }
  const next = parseStatus(status);
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(id) || !next) {
    return { ok: false, message: "Proposta inválida." };
  }
  const result = await apiPatch<unknown>(`/admin/sell-requests/${encodeURIComponent(id)}`, { status: next });
  if (!result.ok) return { ok: false, message: "Não foi possível salvar. Tente de novo." };
  revalidatePath("/admin/propostas");
  return { ok: true };
}
