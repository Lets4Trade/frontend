import { toOrderGift } from "@/features/gifts/orderGift";
import { itemPath } from "./itemPath";
import { apiGet } from "@/lib/serverApi";
import { toDeliveryStatus } from "./deliveryStatus";
import { toOrderDetails } from "./details";
import type { OrderItem, OrderStatus, OrderTrack, Purchase } from "./types";

// Pura (sem `serverApi`): o detalhe do painel, que é client, também usa.
export { toOrderDetails };

/**
 * Leitura dos pedidos do usuário autenticado.
 *
 * ── Contrato (../backend/src/app/orders) ────────────────────────────────────
 *   GET /orders/purchases?page&limit → { data: { items: pedidos, page, limit, total, pageCount } }
 *   401                              → sem sessão
 *
 * Desde 2026-10-16 cada pedido é uma COMPRA com vários itens e uma situação só
 * (antes, um pedido por item, agrupados aqui pelo pagamento).
 *
 * A tradução para o formato da tela mora AQUI, na borda, e não no componente:
 * o backend manda enum em maiúsculas, preço como string decimal e data em ISO,
 * porque nenhuma dessas três coisas é decisão dele. Fuso e formato de moeda são
 * de quem exibe.
 */

export type ApiOrderItem = {
  id: string;
  productName: string;
  productImageUrl?: string | null;
  platform: string;
  quantity: string;
  gameName?: string | null;
  gameImageUrl?: string | null;
  /** Caminho na loja, congelado (2026-10-23). Ausentes em pedido antigo. */
  tabLabel?: string | null;
  categoryLabel?: string | null;
  subcategoryLabel?: string | null;
  totalPrice: string;
  /** Descontos DESTE item. Ausentes quando zero — o backend apaga campos zerados. */
  coinsSpent?: number;
  discountCents?: number;
  couponCents?: number;
  /**
   * Só item de SERVIÇO (contrato game-tabs): a escolha e a conta do preço,
   * gravadas pelo backend. `unknown` de propósito — lido por `toOrderDetails`.
   */
  details?: unknown;
  /** Brinde congelado (2026-10-12) — lido por `toOrderGift`. */
  gift?: unknown;
};

/** O pedido como a API manda: cabeçalho, situação e itens. */
export type ApiPurchase = {
  id: string;
  reference: string;
  currency?: string;
  createdAt: string;
  /** Preço CHEIO do pedido e os descontos (somas dos itens). */
  totalPrice: string;
  coinsSpent?: number;
  discountCents?: number;
  couponCode?: string | null;
  couponCents?: number;
  /** Taxa do cartão de crédito da cobrança (2026-10-27). Ausente = zero. */
  cardFeeCents?: number;
  status: string;
  /** Quando entrou em cada etapa (ISO). Ausentes = sem data conhecida. */
  approvedAt?: string | null;
  inDeliveryAt?: string | null;
  deliveredAt?: string | null;
  canceledAt?: string | null;
  /** Status de entrega personalizado (2026-10-16) — lido por `toDeliveryStatus`. */
  deliveryStatus?: unknown;
  deliveryStatusAt?: string | null;
  items: ApiOrderItem[];
  /** Comprovantes de entrega (2026-10-23): só id e data; a imagem tem rota própria. */
  deliveryProofs?: { id?: unknown; createdAt?: unknown }[];
};

type ApiPurchasePage = {
  items: ApiPurchase[];
  page: number;
  limit: number;
  total: number;
  pageCount: number;
};

export type PurchasesResult =
  | { ok: true; purchases: Purchase[]; total: number; page: number; pageCount: number }
  | { ok: false; reason: "unauthenticated" | "error" };

/**
 * Uma PÁGINA de pedidos do usuário.
 *
 * `page` é saneado AQUI e não confiado à URL: vem de `?pagina=` e um valor
 * absurdo (0, -1, "abc") viraria `skip` negativo ou `NaN` no banco.
 */
export async function getMyPurchases(page = 1, limit = 10): Promise<PurchasesResult> {
  const current = Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : 1;
  const result = await apiGet<ApiPurchasePage>(`/orders/purchases?page=${current}&limit=${limit}`);
  if (!result.ok) return { ok: false, reason: result.reason };

  const items = Array.isArray(result.data.items) ? result.data.items : [];
  const total = typeof result.data.total === "number" ? result.data.total : items.length;
  return {
    ok: true,
    purchases: items.map(toPurchase).filter((purchase): purchase is Purchase => purchase !== null),
    total,
    page: typeof result.data.page === "number" ? result.data.page : current,
    pageCount:
      typeof result.data.pageCount === "number"
        ? result.data.pageCount
        : Math.max(1, Math.ceil(total / limit)),
  };
}

/**
 * Pedido da API → tela. Contas em CENTAVOS inteiros (o preço vem como string
 * decimal): subtrair reais em ponto flutuante erra o centavo. Pedido sem item
 * (resposta inesperada) vira `null` e some da lista.
 */
export function toPurchase(api: ApiPurchase): Purchase | null {
  const items = Array.isArray(api.items) ? api.items : [];
  if (items.length === 0) return null;

  const currency = api.currency || "BRL";
  const priceCents = toCents(api.totalPrice);
  const coinsCents = api.discountCents || 0;
  const couponCents = api.couponCents || 0;
  const feeCents = api.cardFeeCents || 0;
  const delivery = toDeliveryStatus(api.deliveryStatus);

  return {
    id: api.id,
    reference: api.reference,
    date: formatDate(api.createdAt),
    status: toStatus(api.status),
    track: toTrack(api),
    stepDates: toStepDates(api),
    delivery: delivery ? { ...delivery, date: formatStepDate(api.deliveryStatusAt) } : null,
    items: items.map((item) => toItem(item, currency)),
    price: formatCents(priceCents, currency),
    // "Desconto" = coins + cupom (2026-10-12); o cupom também sai em `coupon`.
    discount: coinsCents + couponCents > 0 ? formatCents(coinsCents + couponCents, currency) : null,
    // A taxa do crédito SOMA ao que foi pago (2026-10-27): o mesmo valor da cobrança.
    fee: feeCents > 0 ? formatCents(feeCents, currency) : null,
    paid: formatCents(Math.max(0, priceCents - coinsCents - couponCents) + feeCents, currency),
    coupon: api.couponCode && couponCents > 0 ? { code: api.couponCode, amount: formatCents(couponCents, currency) } : null,
    deliveryProofs: (Array.isArray(api.deliveryProofs) ? api.deliveryProofs : []).flatMap((proof) =>
      typeof proof?.id === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(proof.id)
        ? [{ id: proof.id, date: typeof proof.createdAt === "string" ? (formatStepDate(proof.createdAt) ?? "") : "" }]
        : [],
    ),
  };
}

export function toItem(api: ApiOrderItem, currency = "BRL"): OrderItem {
  const priceCents = toCents(api.totalPrice);
  const off = (api.discountCents || 0) + (api.couponCents || 0);
  return {
    id: api.id,
    productName: api.productName,
    platform: api.platform,
    quantity: api.quantity,
    gameName: api.gameName || null,
    path: itemPath(api),
    productImageUrl: api.productImageUrl || null,
    gameImageUrl: api.gameImageUrl || null,
    // O preço do PRODUTO; o abatimento vai numa linha própria, como no comprovante.
    price: formatCents(priceCents, currency),
    discount: off > 0 ? formatCents(off, currency) : null,
    paid: formatCents(Math.max(0, priceCents - off), currency),
    details: toOrderDetails(api.details, currency),
    gift: toOrderGift(api.gift),
  };
}

function toCents(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function formatCents(cents: number, currency: string) {
  return formatPrice((cents / 100).toFixed(2), currency);
}

/**
 * O fuso é FIXADO em São Paulo, e não deixado no do processo. O servidor Node
 * roda em UTC no container: sem isto um pedido feito às 21h de Brasília
 * apareceria com a data do dia seguinte.
 */
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function formatPrice(value: string, currency: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: currency || "BRL",
  });
}

function formatDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : dateFormatter.format(date);
}

/**
 * Enum do banco → chave da tela. Um valor desconhecido cai no mais conservador
 * de cada par: "pendente" não promete nada ao cliente, e "feito" não marca
 * etapas como concluídas sem saber se foram.
 */
const STATUS_MAP: Record<string, OrderStatus> = {
  PENDENTE: "pendente",
  APROVADO: "aprovado",
  EM_ANDAMENTO: "em_andamento",
  ENTREGUE: "entregue",
  CANCELADO: "cancelado",
};

function toStatus(value: string): OrderStatus {
  return STATUS_MAP[value] ?? "pendente";
}

/**
 * Situação → posição na trilha (2026-10-15). A etapa vem da SITUAÇÃO, que é o
 * que pagamento e painel atualizam; o antigo `step` do backend nunca mudava.
 *
 * Cancelado marca a última etapa que o pedido ALCANÇOU (pelas datas): um
 * pedido cancelado depois de aprovado mostra "aprovado" concluído e o X no
 * lugar da entrega — a diferença entre "não pagou" e "foi estornado".
 */
export function toTrack(
  api: Pick<ApiPurchase, "status" | "approvedAt" | "inDeliveryAt" | "deliveredAt">,
): OrderTrack {
  switch (toStatus(api.status)) {
    case "aprovado":
      return { step: "aprovado", state: "active" };
    case "em_andamento":
      return { step: "entrega", state: "active" };
    case "entregue":
      return { step: "finalizado", state: "done" };
    case "cancelado":
      return {
        step: api.deliveredAt
          ? "finalizado"
          : api.inDeliveryAt
            ? "entrega"
            : api.approvedAt
              ? "aprovado"
              : "feito",
        state: "canceled",
      };
    default:
      return { step: "feito", state: "active" };
  }
}

/** Mesmo fuso fixo da data do card, com a hora — "15/10 14:32". */
const stepDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function formatStepDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : stepDateFormatter.format(date).replace(",", "");
}

function toStepDates(api: ApiPurchase): Purchase["stepDates"] {
  const dates: Purchase["stepDates"] = {};
  const entries: [keyof Purchase["stepDates"], string | null | undefined][] = [
    ["feito", api.createdAt],
    ["aprovado", api.approvedAt],
    ["entrega", api.inDeliveryAt],
    ["finalizado", api.deliveredAt],
    ["cancelado", api.canceledAt],
  ];
  for (const [key, iso] of entries) {
    const formatted = formatStepDate(iso);
    if (formatted) dates[key] = formatted;
  }
  return dates;
}
