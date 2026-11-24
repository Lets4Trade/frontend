import { MAX_GIFT_TOTAL, type GiftRule } from "@/features/pricing/gift";

/**
 * Brinde do jogo no painel (2026-10-12) — a parte PURA: tipo e leitura da
 * resposta. Sem `serverApi`: o editor (client component) importa daqui.
 */
export type AdminGift = GiftRule & { isActive: boolean };

function int(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

/** Resposta do backend → regra. `null` = sem regra (ou resposta estranha). */
export function toAdminGift(raw: unknown): AdminGift | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const everyCents = int(row.everyCents);
  const amount = int(row.amount);
  if (everyCents === null || amount === null) return null;
  // O backend apaga campo nulo/falso da resposta: ausente = sem teto / desligado.
  const maxAmount = int(row.maxAmount);
  return {
    isActive: row.isActive === true,
    everyCents,
    amount,
    label: typeof row.label === "string" ? row.label : "",
    maxAmount: maxAmount !== null && maxAmount > 0 && maxAmount <= MAX_GIFT_TOTAL ? maxAmount : null,
  };
}

/** "50.000.000" / "50000000" → 50000000. Vazio ou lixo → `null`. */
export function parseAmount(text: string): number | null {
  const digits = text.replace(/\D/g, "");
  if (digits === "" || digits.length > 16) return null;
  const value = Number(digits);
  return Number.isSafeInteger(value) ? value : null;
}

/** 50000000 → "50.000.000" (o que o campo mostra). */
export function formatAmount(value: number | null): string {
  return value === null ? "" : value.toLocaleString("pt-BR");
}

/**
 * Um servidor do jogo na Central → Brinde (POR SERVIDOR desde 2026-11-23): o
 * nome, a plataforma (ícone), se está escondido da loja e a regra dele.
 */
export type AdminServerGift = {
  serverId: string;
  serverLabel: string;
  platform: "PC" | "PLAYSTATION" | "XBOX" | null;
  isHidden: boolean;
  /** `null` = servidor sem brinde configurado. */
  gift: AdminGift | null;
};

const PLATFORMS = new Set(["PC", "PLAYSTATION", "XBOX"]);

/** Resposta do `GET /admin/games/:id/gift` → servidores. Item sem id/nome sai. */
export function toAdminServerGifts(raw: unknown): AdminServerGift[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.serverId !== "string" || typeof row.serverLabel !== "string") return [];
    return [
      {
        serverId: row.serverId,
        serverLabel: row.serverLabel,
        platform: typeof row.platform === "string" && PLATFORMS.has(row.platform) ? (row.platform as AdminServerGift["platform"]) : null,
        // O backend apaga `false`: ausente = à vista.
        isHidden: row.isHidden === true,
        gift: toAdminGift(row.gift),
      },
    ];
  });
}
