import { refreshSession } from "@/lib/browserSession";

/**
 * Envio do VÍDEO de uma sessão direto do navegador para a API (2026-09-17).
 *
 * ── Por que não um server action, como as imagens ─────────────────────────
 * Até 100 MB passando pelo servidor do Next seria o arquivo inteiro na memória
 * dele, acima do teto de corpo das actions, e mais um salto de rede. O
 * navegador já fala direto com a API com o cookie de sessão (o chat faz o
 * mesmo); quem autoriza é o `RolesGuard` do backend, como em toda rota admin.
 *
 * ── Por que XHR e não `fetch` ─────────────────────────────────────────────
 * `fetch` não informa progresso de ENVIO. Com 100 MB, uma barra parada por um
 * minuto parece travamento. A sessão é renovada ANTES (o access dura 15 min e o
 * upload não pode ser repetido de graça como um `fetch` curto).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

/** Espelha `MAX_VIDEO_BYTES` do backend. */
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime";

export type VideoUploadResult = { ok: true } | { ok: false; message: string };

export async function uploadSectionVideo(
  key: string,
  file: File,
  onProgress: (fraction: number) => void,
): Promise<VideoUploadResult> {
  if (API_URL === "") return { ok: false, message: "API não configurada." };
  if (file.size > MAX_VIDEO_BYTES) {
    return { ok: false, message: "O vídeo passa de 100 MB. Comprima ou use um link do YouTube." };
  }

  await refreshSession();

  const form = new FormData();
  form.set("key", key);
  form.set("video", file, file.name);

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `${API_URL}/admin/sections/video`);
    xhr.withCredentials = true;
    xhr.setRequestHeader("x-pt-surface", "client");
    xhr.setRequestHeader("accept", "application/json");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onerror = () => resolve({ ok: false, message: "Sem conexão com o servidor." });
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve({ ok: true });
      if (xhr.status === 413) {
        return resolve({ ok: false, message: "O vídeo passa de 100 MB." });
      }
      if (xhr.status === 401 || xhr.status === 403) {
        return resolve({ ok: false, message: "Sessão expirada. Entre de novo." });
      }
      let message = "Não foi possível enviar o vídeo.";
      try {
        const body = JSON.parse(xhr.responseText) as { message?: unknown };
        // Só mensagem curta e de erro do cliente (ex.: "não é MP4 ou WebM").
        if (typeof body.message === "string" && body.message.length < 200 && xhr.status < 500) {
          message = body.message;
        }
      } catch {
        // resposta sem JSON: fica a genérica
      }
      resolve({ ok: false, message });
    };
    xhr.send(form);
  });
}
