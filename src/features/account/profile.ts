import { apiGet } from "@/lib/serverApi";
import { accountAvatar, parseGender, type Gender } from "./gender";
import type { ProfileSummary } from "./ProfileCard";

/**
 * Leitura do perfil do usuário autenticado — o que alimenta as DUAS abas do
 * painel (card da esquerda em ambas, formulário em "Minhas Informações").
 *
 * ── Contrato (../backend/src/app/users) ─────────────────────────────────────
 *   GET /me → { data: { id, email, name, avatarUrl, whatsapp, discord, tier,
 *                       letsCoins, points, totalSpent, totalSaved, rank } }
 *   401     → sem sessão
 *
 * `rank` é CALCULADO pelo backend (quantos têm mais pontos, mais um), não
 * guardado em coluna — ver o comentário em `users.service.ts`.
 *
 * O backend omite campos vazios na resposta, então tudo aqui tem default. Um
 * perfil sem Discord não pode derrubar a página.
 */

export type AccountProfile = ProfileSummary & {
  id: string;
  email: string;
  discord: string;
  whatsapp: string;
  tier: string;
  totalSpent: string;
  totalSaved: string;
  gender: Gender | null;
};

type ApiProfile = {
  id?: string;
  email?: string;
  name?: string;
  avatarUrl?: string | null;
  gender?: string | null;
  whatsapp?: string;
  discord?: string;
  tier?: string;
  letsCoins?: number;
  points?: number;
  totalSpent?: string;
  totalSaved?: string;
  rank?: number;
};

export type ProfileResult =
  | { ok: true; profile: AccountProfile }
  | { ok: false; reason: "unauthenticated" | "error" };

export async function getAccountProfile(): Promise<ProfileResult> {
  const result = await apiGet<ApiProfile>("/me");
  if (!result.ok) return { ok: false, reason: result.reason };

  const api = result.data;
  return {
    ok: true,
    profile: {
      id: api.id ?? "",
      name: api.name?.trim() || api.email?.split("@")[0] || "Minha conta",
      email: api.email ?? "",
      avatar: accountAvatar(api.avatarUrl, api.gender),
      gender: parseGender(api.gender),
      rank: numberOr(api.rank, 1),
      coins: numberOr(api.letsCoins, 0),
      points: numberOr(api.points, 0),
      discord: api.discord ?? "",
      whatsapp: api.whatsapp ?? "",
      tier: api.tier ?? "BRONZE",
      totalSpent: api.totalSpent ?? "0",
      totalSaved: api.totalSaved ?? "0",
    },
  };
}

function numberOr(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
