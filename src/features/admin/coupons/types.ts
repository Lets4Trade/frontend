import {
  COUPON_CODE_PATTERN,
  couponRuleProblem,
  normalizeCouponCode,
  type CouponKind,
} from "@/features/pricing/coupon";

/**
 * Cupons no painel (2026-10-12) — a parte PURA: tipos, leitura da resposta,
 * conversões e a conferência do formulário. Sem `serverApi`: o formulário
 * (client component) e a lista (servidor) importam daqui.
 *
 * ⚠️ O backend APAGA da resposta campos `null`, `false`, `""` e listas vazias
 * (interceptor de compressão): ausente = nulo / desligado / vazio.
 */

export type CouponTargetLabels = {
  games: { id: string; name: string }[];
  tabs: { id: string; label: string; gameName: string }[];
  products: CouponProductOption[];
};

export type CouponProductOption = {
  id: string;
  name: string;
  gameName: string;
  server: string | null;
  tab: string | null;
};

export type CouponTargetGame = { id: string; name: string; tabs: { id: string; label: string }[] };

export type AdminCoupon = {
  id: string;
  code: string;
  description: string;
  isActive: boolean;
  kind: CouponKind;
  /** PERCENT: pontos-base (1000 = 10%). FIXED: centavos. */
  value: number;
  maxDiscountCents: number | null;
  minSubtotalCents: number | null;
  /** ISO ou `null`. */
  startsAt: string | null;
  endsAt: string | null;
  maxUses: number | null;
  maxUsesPerUser: number | null;
  usedCount: number;
  gameIds: string[];
  tabIds: string[];
  productIds: string[];
  allowCoins: boolean;
  rewardsOnDiscounted: boolean;
  targets: CouponTargetLabels;
};

/** O que vai no corpo do POST/PUT (o `SaveCouponDto`). */
export type CouponPayload = {
  code: string;
  description: string | null;
  isActive: boolean;
  kind: CouponKind;
  value: number;
  maxDiscountCents: number | null;
  minSubtotalCents: number | null;
  startsAt: string | null;
  endsAt: string | null;
  maxUses: number | null;
  maxUsesPerUser: number | null;
  gameIds: string[];
  tabIds: string[];
  productIds: string[];
  allowCoins: boolean;
  rewardsOnDiscounted: boolean;
};

export type AdminCouponPage = { items: AdminCoupon[]; total: number; page: number; pageCount: number };

type Raw = Record<string, unknown>;

const ID_RE = /^[A-Za-z0-9_-]{1,100}$/;

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function intOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

function ids(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string" && ID_RE.test(id)) : [];
}

function isoOrNull(value: unknown): string | null {
  if (typeof value !== "string" || value === "") return null;
  return Number.isNaN(new Date(value).getTime()) ? null : value;
}

function productOption(raw: unknown): CouponProductOption | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Raw;
  const id = str(row.id);
  if (!ID_RE.test(id)) return null;
  return {
    id,
    name: str(row.name) || "(sem nome)",
    gameName: str(row.gameName),
    server: str(row.server) || null,
    tab: str(row.tab) || null,
  };
}

/** Lista de produtos da busca → opções válidas. */
export function toProductOptions(raw: unknown): CouponProductOption[] {
  return Array.isArray(raw) ? raw.map(productOption).filter((row): row is CouponProductOption => row !== null) : [];
}

/** Jogos com abas (opções de alcance). */
export function toTargetGames(raw: unknown): CouponTargetGame[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Raw;
    const id = str(row.id);
    if (!ID_RE.test(id)) return [];
    const tabs = Array.isArray(row.tabs)
      ? row.tabs.flatMap((tab) => {
          if (!tab || typeof tab !== "object") return [];
          const t = tab as Raw;
          const tabId = str(t.id);
          return ID_RE.test(tabId) ? [{ id: tabId, label: str(t.label) || "(aba)" }] : [];
        })
      : [];
    return [{ id, name: str(row.name) || "(jogo)", tabs }];
  });
}

/** Resposta do backend → cupom. `null` = formato inesperado. */
export function toAdminCoupon(raw: unknown): AdminCoupon | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Raw;
  const id = str(row.id);
  const kind = row.kind === "PERCENT" || row.kind === "FIXED" ? row.kind : null;
  const value = intOrNull(row.value);
  if (!ID_RE.test(id) || !kind || value === null) return null;

  const targets = (row.targets && typeof row.targets === "object" ? row.targets : {}) as Raw;
  return {
    id,
    code: str(row.code),
    description: str(row.description),
    isActive: row.isActive === true,
    kind,
    value,
    maxDiscountCents: intOrNull(row.maxDiscountCents),
    minSubtotalCents: intOrNull(row.minSubtotalCents),
    startsAt: isoOrNull(row.startsAt),
    endsAt: isoOrNull(row.endsAt),
    maxUses: intOrNull(row.maxUses),
    maxUsesPerUser: intOrNull(row.maxUsesPerUser),
    usedCount: intOrNull(row.usedCount) ?? 0,
    gameIds: ids(row.gameIds),
    tabIds: ids(row.tabIds),
    productIds: ids(row.productIds),
    allowCoins: row.allowCoins === true,
    rewardsOnDiscounted: row.rewardsOnDiscounted === true,
    targets: {
      games: Array.isArray(targets.games)
        ? targets.games.flatMap((game) => {
            const g = (game ?? {}) as Raw;
            return ID_RE.test(str(g.id)) ? [{ id: str(g.id), name: str(g.name) }] : [];
          })
        : [],
      tabs: Array.isArray(targets.tabs)
        ? targets.tabs.flatMap((tab) => {
            const t = (tab ?? {}) as Raw;
            return ID_RE.test(str(t.id)) ? [{ id: str(t.id), label: str(t.label), gameName: str(t.gameName) }] : [];
          })
        : [],
      products: toProductOptions(targets.products),
    },
  };
}

export function toAdminCouponPage(raw: unknown): AdminCouponPage | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Raw;
  const items = Array.isArray(row.items)
    ? row.items.map(toAdminCoupon).filter((coupon): coupon is AdminCoupon => coupon !== null)
    : [];
  return {
    items,
    total: intOrNull(row.total) ?? items.length,
    page: intOrNull(row.page) ?? 1,
    pageCount: Math.max(1, intOrNull(row.pageCount) ?? 1),
  };
}

// ── Conversões da tela ──────────────────────────────────────────────────────

/** "10" / "12,5" / "12.5%" → pontos-base (1000 / 1250). Lixo → `null`. */
export function parsePercentBps(text: string): number | null {
  const clean = text.replace("%", "").trim().replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(clean)) return null;
  const bps = Math.round(Number(clean) * 100);
  return Number.isSafeInteger(bps) ? bps : null;
}

/** 1250 → "12,5". */
export function formatPercentInput(bps: number): string {
  return (bps / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2, useGrouping: false });
}

/** "100" / "1.000" → 100 / 1000. Vazio → `null` (sem limite). Lixo → NaN. */
export function parseOptionalInt(text: string): number | null {
  const clean = text.replace(/\./g, "").trim();
  if (clean === "") return null;
  return /^\d{1,8}$/.test(clean) ? Number(clean) : Number.NaN;
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "10%" ou "R$ 20,00". */
export function discountLabel(coupon: Pick<AdminCoupon, "kind" | "value">): string {
  return coupon.kind === "PERCENT" ? `${formatPercentInput(coupon.value)}%` : formatCents(coupon.value);
}

const DATE = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** ISO → "12/10/26 18:00" no fuso de São Paulo (quem opera a loja está no Brasil). */
export function formatDateTime(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : DATE.format(date).replace(",", "");
}

/** "Sem validade", "Até 12/10/26 18:00", "De … até …", "A partir de …". */
export function validityLabel(coupon: Pick<AdminCoupon, "startsAt" | "endsAt">): string {
  const from = formatDateTime(coupon.startsAt);
  const to = formatDateTime(coupon.endsAt);
  if (from && to) return `De ${from} até ${to}`;
  if (to) return `Até ${to}`;
  if (from) return `A partir de ${from}`;
  return "Sem validade";
}

/** "3 / 100" ou "3 usos". */
export function usageLabel(coupon: Pick<AdminCoupon, "usedCount" | "maxUses">): string {
  return coupon.maxUses !== null
    ? `${coupon.usedCount} / ${coupon.maxUses}`
    : `${coupon.usedCount} uso${coupon.usedCount === 1 ? "" : "s"}`;
}

/** "Loja toda" ou "2 jogos · 1 aba · 3 produtos". */
export function scopeLabel(coupon: Pick<AdminCoupon, "gameIds" | "tabIds" | "productIds">): string {
  const parts: string[] = [];
  const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
  if (coupon.gameIds.length) parts.push(plural(coupon.gameIds.length, "jogo", "jogos"));
  if (coupon.tabIds.length) parts.push(plural(coupon.tabIds.length, "aba", "abas"));
  if (coupon.productIds.length) parts.push(plural(coupon.productIds.length, "produto", "produtos"));
  return parts.length ? parts.join(" · ") : "Loja toda";
}

/**
 * Situação para a pílula da lista: desligado, agendado, expirado, esgotado ou
 * valendo. `now` é parâmetro para o teste.
 */
export function couponStatus(
  coupon: Pick<AdminCoupon, "isActive" | "startsAt" | "endsAt" | "maxUses" | "usedCount">,
  now = Date.now(),
): { label: string; tone: "on" | "off" | "wait" } {
  if (!coupon.isActive) return { label: "Desligado", tone: "off" };
  if (coupon.endsAt && new Date(coupon.endsAt).getTime() < now) return { label: "Expirado", tone: "off" };
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return { label: "Esgotado", tone: "off" };
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) return { label: "Agendado", tone: "wait" };
  return { label: "Valendo", tone: "on" };
}

/**
 * `datetime-local` ("2026-10-12T18:00", sem fuso) → ISO. O campo é lido no FUSO
 * DO NAVEGADOR de quem cadastra (o `new Date` do JS faz isso) — quem opera a
 * loja está no Brasil, e é o horário que ela vê na tela que vale.
 */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** ISO → valor do `datetime-local` no fuso do navegador. */
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * O que está errado no formulário, ou `null`. A mesma régua do backend
 * (`couponRuleProblem` é o arquivo espelhado); o backend confere de novo.
 */
export function couponPayloadProblem(payload: CouponPayload): string | null {
  const code = normalizeCouponCode(payload.code);
  if (!COUPON_CODE_PATTERN.test(code)) {
    return 'O código precisa ter de 3 a 40 caracteres: letras, números, "-" ou "_".';
  }
  const rule = couponRuleProblem({
    kind: payload.kind,
    value: payload.value,
    maxDiscountCents: payload.maxDiscountCents,
    minSubtotalCents: payload.minSubtotalCents,
  });
  if (rule) return rule;
  for (const limit of [payload.maxUses, payload.maxUsesPerUser]) {
    if (limit !== null && (!Number.isSafeInteger(limit) || limit < 1)) {
      return "Os limites de uso precisam ser números inteiros a partir de 1 (vazio = sem limite).";
    }
  }
  if (payload.maxUses !== null && payload.maxUsesPerUser !== null && payload.maxUsesPerUser > payload.maxUses) {
    return "O limite por cliente não pode passar do limite total.";
  }
  if (payload.startsAt && payload.endsAt && new Date(payload.endsAt).getTime() <= new Date(payload.startsAt).getTime()) {
    return "O fim da validade precisa ser depois do início.";
  }
  if ((payload.description ?? "").length > 200) return "A descrição pode ter até 200 caracteres.";
  return null;
}

/** Frase da prévia: "10% de desconto, máx. R$ 50,00, a partir de R$ 100,00 · válido até … · 3 de 100 usos". */
export function couponSummary(payload: CouponPayload, usedCount = 0): string {
  const parts = [
    payload.kind === "PERCENT"
      ? `${formatPercentInput(payload.value)}% de desconto`
      : `${formatCents(payload.value)} de desconto`,
  ];
  if (payload.kind === "PERCENT" && payload.maxDiscountCents !== null) parts.push(`máx. ${formatCents(payload.maxDiscountCents)}`);
  if (payload.minSubtotalCents !== null) parts.push(`a partir de ${formatCents(payload.minSubtotalCents)}`);
  const head = parts.join(", ");

  const tail: string[] = [];
  const to = formatDateTime(payload.endsAt);
  const from = formatDateTime(payload.startsAt);
  if (from) tail.push(`começa em ${from}`);
  tail.push(to ? `válido até ${to}` : "sem data de fim");
  tail.push(payload.maxUses !== null ? `${usedCount} de ${payload.maxUses} usos` : `${usedCount} uso${usedCount === 1 ? "" : "s"}, sem limite total`);
  if (payload.maxUsesPerUser !== null) tail.push(`${payload.maxUsesPerUser} por cliente`);
  return `${head} · ${tail.join(" · ")}`;
}
