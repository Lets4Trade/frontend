"use server";

import { getSessionRole } from "@/features/auth/session";
import { canAccess } from "@/features/admin/permissions";
import { apiDelete, apiGet, apiPostFormData } from "@/lib/serverApi";

/**
 * Comprovante de ENTREGA no painel (2026-10-23). Server actions porque o token
 * é cookie httpOnly. Endereço público: confere cargo e formato de novo — quem
 * decide de verdade é o `RolesGuard` do backend.
 */

export type DeliveryProof = { id: string; createdAt: string; uploadedBy: string | null };
export type ProofResult<T> = { ok: true; data: T } | { ok: false; message: string };

const REF_RE = /^[A-Z0-9-]{4,40}$/i;
const ID_RE = /^[A-Za-z0-9_-]{1,100}$/;
/** Mesmo teto do backend (multer). */
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/avif"]);

async function denied(reference: string): Promise<{ ok: false; message: string } | null> {
  if (!canAccess(await getSessionRole(), "orders")) return { ok: false, message: "Sem permissão." };
  if (!REF_RE.test(reference)) return { ok: false, message: "Pedido inválido." };
  return null;
}

const base = (reference: string) => `/admin/orders/${encodeURIComponent(reference)}/delivery-proofs`;

export async function listDeliveryProofsAction(reference: string): Promise<ProofResult<DeliveryProof[]>> {
  const blocked = await denied(reference);
  if (blocked) return blocked;
  const result = await apiGet<DeliveryProof[]>(base(reference));
  if (!result.ok || !Array.isArray(result.data)) return { ok: false, message: "Não foi possível carregar os comprovantes." };
  return {
    ok: true,
    data: result.data.filter((proof) => typeof proof?.id === "string" && ID_RE.test(proof.id)),
  };
}

export async function uploadDeliveryProofAction(reference: string, form: FormData): Promise<ProofResult<null>> {
  const blocked = await denied(reference);
  if (blocked) return blocked;
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Escolha uma imagem." };
  if (file.size > MAX_BYTES) return { ok: false, message: "A imagem precisa ter até 5 MB." };
  if (!TYPES.has(file.type)) return { ok: false, message: "Use PNG, JPEG, WebP ou AVIF." };

  const payload = new FormData();
  payload.set("image", file, "comprovante");
  const result = await apiPostFormData<unknown>(base(reference), payload);
  if (!result.ok) {
    return { ok: false, message: result.message || "Não foi possível enviar o comprovante." };
  }
  return { ok: true, data: null };
}

export async function deleteDeliveryProofAction(reference: string, id: string): Promise<ProofResult<null>> {
  const blocked = await denied(reference);
  if (blocked) return blocked;
  if (!ID_RE.test(id)) return { ok: false, message: "Comprovante inválido." };
  const result = await apiDelete<unknown>(`${base(reference)}/${encodeURIComponent(id)}`);
  return result.ok ? { ok: true, data: null } : { ok: false, message: "Não foi possível apagar." };
}
