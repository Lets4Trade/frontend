"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getSessionRole } from "@/features/auth/session";
import { PRESENCE_TAG } from "@/features/support/presence";
import { apiGet, apiPut, apiPutFormData } from "@/lib/serverApi";

/**
 * Online/Offline e FOTO do atendente no painel (2026-10-16) — ver
 * `backend/src/app/support/support-presence.service.ts`.
 *
 * Server action (e não o navegador direto ao backend, como o resto dos chats)
 * por um motivo: a loja lê a presença CACHEADA por 30 s, e só o servidor do
 * Next derruba esse cache. Com `updateTag`, quem clica em Online (ou troca a
 * foto) aparece no cabeçalho e no botão do chat no mesmo instante.
 *
 * Só ADMIN — é quem atende (o EDITOR não vê chats). O backend confere de novo.
 */

export type PresenceStatus = {
  online: boolean;
  intent: boolean;
  /** Primeiro nome e foto (`/uploads/avatars/...`), como o chat da loja mostra. */
  name: string;
  avatarUrl: string | null;
};
export type PresenceResult = { ok: true; data: PresenceStatus } | { ok: false; message: string };
export type PhotoResult = { ok: true; data: { avatarUrl: string | null } } | { ok: false; message: string };

/** Mesmo teto do backend (multer) e das outras artes do painel. */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

async function denied(): Promise<{ ok: false; message: string } | null> {
  const role = await getSessionRole();
  if (role === null) return { ok: false, message: "Sua sessão expirou. Entre de novo." };
  if (role !== "ADMIN") return { ok: false, message: "Só atendentes (ADMIN) ficam online no chat." };
  return null;
}

export async function getMyPresenceAction(): Promise<PresenceResult> {
  const blocked = await denied();
  if (blocked) return blocked;
  const result = await apiGet<PresenceStatus>("/admin/support/presence");
  return result.ok ? { ok: true, data: result.data } : { ok: false, message: "Não foi possível ler seu status." };
}

export async function setMyPresenceAction(online: boolean): Promise<PresenceResult> {
  const blocked = await denied();
  if (blocked) return blocked;
  if (typeof online !== "boolean") return { ok: false, message: "Status inválido." };
  const result = await apiPut<PresenceStatus>("/admin/support/presence", { online });
  if (!result.ok) return { ok: false, message: "Não foi possível mudar seu status. Tente de novo." };
  // A loja vê a troca na hora (leitura cacheada por 30 s, ver `presence.ts`).
  updateTag(PRESENCE_TAG);
  return { ok: true, data: result.data };
}

/** Troca a própria foto — a da conta, que também aparece no menu do usuário. */
export async function uploadMyPhotoAction(form: FormData): Promise<PhotoResult> {
  const blocked = await denied();
  if (blocked) return blocked;
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Escolha uma foto." };
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, message: "A foto precisa ter até 5 MB." };
  if (!PHOTO_TYPES.has(file.type)) return { ok: false, message: "Use uma foto PNG, JPEG ou WebP." };

  const payload = new FormData();
  payload.set("image", file, file.name);
  const result = await apiPutFormData<{ avatarUrl: string | null }>("/admin/support/presence/photo", payload);
  if (!result.ok) {
    return { ok: false, message: result.message ?? "Não foi possível trocar a foto. Tente de novo." };
  }
  updateTag(PRESENCE_TAG);
  // O avatar do menu da conta (cabeçalho do painel e da loja) é a mesma foto.
  revalidatePath("/", "layout");
  return { ok: true, data: result.data };
}
