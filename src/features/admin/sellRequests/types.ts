import { PLATAFORMAS, SERVIDORES, TIPOS_PRODUTO } from "@/features/sell/schema";

/**
 * Propostas de "Venda pra nós" no painel (2026-10-23) — tipos, rótulos e a
 * leitura saneada da API. Módulo PURO (servidor e cliente).
 *
 *   GET   /admin/sell-requests?status=&search=&page=&limit= → { items, total, page, limit, pageCount, newCount }
 *   PATCH /admin/sell-requests/:id { status }
 */

export type SellRequestStatus = "NEW" | "CONTACTED" | "CLOSED" | "REJECTED";

export const SELL_REQUEST_STATUSES: ReadonlyArray<{ value: SellRequestStatus; label: string; className: string }> = [
  { value: "NEW", label: "Nova", className: "bg-brand-orange/15 text-brand-orange" },
  { value: "CONTACTED", label: "Em contato", className: "bg-[#3b82f6]/15 text-[#93c5fd]" },
  { value: "CLOSED", label: "Fechada", className: "bg-[#22c55e]/15 text-[#4ade80]" },
  { value: "REJECTED", label: "Recusada", className: "bg-white/10 text-white/60" },
];

export type SellRequest = {
  id: string;
  gameName: string;
  platform: string;
  server: string;
  productType: string;
  discord: string;
  whatsapp: string;
  description: string;
  status: SellRequestStatus;
  createdAt: string;
  /** Quem enviou logado; nulo = visitante sem conta. */
  user: { id: string; name: string } | null;
};

export type SellRequestPage = {
  items: SellRequest[];
  total: number;
  page: number;
  pageCount: number;
  newCount: number;
};

/** Parâmetros na URL: pt-BR, como o resto do painel; página 1 sem parâmetro. */
export const SELL_PARAM = { status: "situacao", search: "busca", page: "pagina" } as const;

export function parseStatus(raw: unknown): SellRequestStatus | null {
  return SELL_REQUEST_STATUSES.some((status) => status.value === raw) ? (raw as SellRequestStatus) : null;
}

export function statusMeta(status: SellRequestStatus) {
  return SELL_REQUEST_STATUSES.find((item) => item.value === status) ?? SELL_REQUEST_STATUSES[0];
}

/**
 * `steam` → "Steam" para as propostas ANTIGAS (gravadas com o código da lista).
 * Desde 2026-10-28 os campos são texto livre e aparecem como vieram.
 */
function labelOf(list: readonly { value: string; label: string }[], value: string): string {
  return list.find((option) => option.value === value)?.label ?? value;
}

export const platformLabel = (value: string) => labelOf(PLATAFORMAS, value);
export const serverLabel = (value: string) => labelOf(SERVIDORES, value);
export const productTypeLabel = (value: string) => labelOf(TIPOS_PRODUTO, value);

const str = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "");

export function toSellRequest(raw: unknown): SellRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const status = parseStatus(row.status);
  if (typeof row.id !== "string" || !status) return null;
  const user = row.user && typeof row.user === "object" ? (row.user as Record<string, unknown>) : null;
  const userName = user
    ? str(user.username, 60) || [str(user.firstName, 60), str(user.lastName, 60)].filter(Boolean).join(" ")
    : "";
  return {
    id: row.id,
    gameName: str(row.gameName, 120) || "—",
    // 60: texto livre desde 2026-10-28 (antes, códigos de até 20).
    platform: str(row.platform, 60),
    server: str(row.server, 60),
    productType: str(row.productType, 60),
    discord: str(row.discord, 64),
    whatsapp: str(row.whatsapp, 25),
    description: str(row.description, 1000),
    status,
    createdAt: str(row.createdAt, 40),
    user: user && typeof user.id === "string" ? { id: user.id, name: userName || "Conta sem nome" } : null,
  };
}

export function toSellRequestPage(raw: unknown): SellRequestPage | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const num = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return {
    items: Array.isArray(data.items) ? data.items.map(toSellRequest).filter((item): item is SellRequest => !!item) : [],
    total: num(data.total, 0),
    page: num(data.page, 1),
    pageCount: Math.max(1, num(data.pageCount, 1)),
    newCount: num(data.newCount, 0),
  };
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function formatSentAt(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date).replace(",", " às");
}
