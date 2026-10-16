/**
 * Atendentes online (2026-10-16) — o que o cabeçalho e o botão do chat mostram.
 * Módulo PURO: o servidor (leitura cacheada) e o cliente (atualização na aba
 * aberta) passam pela mesma leitura saneada.
 *
 *   GET /api/v1/support/presence → { online, total, attendants: [{ name, avatarUrl }] }
 */

/** `avatarUrl` RELATIVO (`/uploads/...`); quem desenha resolve com `backendAsset`. */
export type Attendant = { name: string; avatarUrl: string | null };

export type SupportPresence = {
  /** Pelo menos um atendente online agora. O status do cabeçalho e do chat é ESTE. */
  online: boolean;
  /** Quantos estão online — a lista vem cortada em 12 e o botão mostra "+N". */
  total: number;
  attendants: Attendant[];
};

export const OFFLINE: SupportPresence = { online: false, total: 0, attendants: [] };

/** Resposta da API, saneada. Formato inesperado = offline (nunca um estado quebrado). */
export function parsePresence(raw: unknown): SupportPresence {
  if (!raw || typeof raw !== "object") return OFFLINE;
  const data = raw as { total?: unknown; attendants?: unknown };
  const attendants = Array.isArray(data.attendants)
    ? data.attendants.slice(0, 12).flatMap((item): Attendant[] => {
        if (!item || typeof item !== "object") return [];
        const { name, avatarUrl } = item as { name?: unknown; avatarUrl?: unknown };
        if (typeof name !== "string" || !name.trim()) return [];
        // Só foto servida pelo nosso backend (`/uploads/...`): é o que a API grava.
        // Mesmo padrão que o backend devolve (`avatarPath`); com `?v=` que troca a cada foto nova.
        const avatar =
          typeof avatarUrl === "string" && /^\/uploads\/avatars\/[A-Za-z0-9_-]+\.webp(\?v=\d{1,20})?$/.test(avatarUrl)
            ? avatarUrl
            : null;
        return [{ name: name.trim().slice(0, 40), avatarUrl: avatar }];
      })
    : [];
  const total =
    typeof data.total === "number" && Number.isFinite(data.total) ? Math.max(attendants.length, Math.floor(data.total)) : attendants.length;
  return { online: total > 0, total, attendants };
}

/** "Ana", "Ana e Bruno", "Ana, Bruno e mais 3". */
export function attendantsLabel(presence: SupportPresence): string {
  const names = presence.attendants.slice(0, 2).map((attendant) => attendant.name);
  const rest = presence.total - names.length;
  if (names.length === 0) return "";
  if (rest > 0) return `${names.join(", ")} e mais ${rest}`;
  return names.join(" e ");
}
