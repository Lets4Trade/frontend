"use server";

import { revalidatePath } from "next/cache";
import { canAccess } from "@/features/admin/permissions";
import { getSessionRole } from "@/features/auth/session";
import { isDeliveryColor } from "@/features/orders/deliveryStatus";
import { apiDelete, apiPatch, apiPost } from "@/lib/serverApi";
import { DELIVERY_STATUS_BASES, type AdminDeliveryStatus } from "./types";

/**
 * Cadastro dos status de entrega personalizados (2026-10-16) — ADMIN e
 * ATENDENTE (área de pedidos). O backend confere tudo de novo (DTO + RolesGuard);
 * aqui é a segunda porta, porque server action é endereço público.
 */

export type DeliveryStatusResult =
  | { ok: true; status?: AdminDeliveryStatus }
  | { ok: false; message: string };

export type DeliveryStatusInput = { label: string; color: string; base: string };

const ID = /^[A-Za-z0-9_-]{1,100}$/;

async function guard(): Promise<string | null> {
  const role = await getSessionRole();
  if (role === null) return "Sua sessão expirou. Entre de novo.";
  if (!canAccess(role, "orders")) return "Sua conta não pode mexer nos status de entrega.";
  return null;
}

/** Confere o formulário; devolve o corpo limpo ou a frase do problema. */
function clean(input: Partial<DeliveryStatusInput>): { body: Partial<DeliveryStatusInput> } | { message: string } {
  const body: Partial<DeliveryStatusInput> = {};
  if (input.label !== undefined) {
    const label = String(input.label).trim().replace(/\s+/g, " ");
    if (label.length < 1 || label.length > 40) return { message: "O nome do status tem de 1 a 40 caracteres." };
    body.label = label;
  }
  if (input.color !== undefined) {
    if (!isDeliveryColor(input.color)) return { message: "Escolha uma das cores." };
    body.color = input.color;
  }
  if (input.base !== undefined) {
    if (!(DELIVERY_STATUS_BASES as readonly string[]).includes(input.base)) return { message: "Escolha a etapa." };
    body.base = input.base;
  }
  return { body };
}

function done(status?: AdminDeliveryStatus): DeliveryStatusResult {
  // A tela de pedidos lê a lista no servidor: sem invalidar, o select voltaria antigo.
  revalidatePath("/admin/pedidos");
  return { ok: true, status };
}

export async function createDeliveryStatusAction(input: DeliveryStatusInput): Promise<DeliveryStatusResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };
  const checked = clean(input);
  if ("message" in checked) return { ok: false, message: checked.message };
  if (!checked.body.label || !checked.body.color || !checked.body.base) return { ok: false, message: "Preencha nome, cor e etapa." };

  const result = await apiPost<AdminDeliveryStatus>("/admin/delivery-statuses", checked.body);
  if (!result.ok) return { ok: false, message: result.message ?? "Não foi possível criar o status. Tente de novo." };
  return done(result.data);
}

export async function updateDeliveryStatusAction(
  id: string,
  input: Partial<DeliveryStatusInput>,
): Promise<DeliveryStatusResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };
  // O id vai para o CAMINHO: formato fechado, nada de `../`.
  if (typeof id !== "string" || !ID.test(id)) return { ok: false, message: "Status inválido." };
  const checked = clean(input);
  if ("message" in checked) return { ok: false, message: checked.message };

  const result = await apiPatch<AdminDeliveryStatus>(`/admin/delivery-statuses/${encodeURIComponent(id)}`, checked.body);
  if (!result.ok) return { ok: false, message: result.message ?? "Não foi possível salvar o status. Tente de novo." };
  return done(result.data);
}

export async function archiveDeliveryStatusAction(id: string): Promise<DeliveryStatusResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };
  if (typeof id !== "string" || !ID.test(id)) return { ok: false, message: "Status inválido." };

  const result = await apiDelete<{ archived: boolean }>(`/admin/delivery-statuses/${encodeURIComponent(id)}`);
  if (!result.ok) return { ok: false, message: result.message ?? "Não foi possível arquivar o status. Tente de novo." };
  return done();
}
