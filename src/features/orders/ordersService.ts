import { toOrderGift } from "@/features/gifts/orderGift";
import { apiGet } from "@/lib/serverApi";
import type { Order, OrderStatus, OrderTrack, Purchase } from "./types";

/**
 * Leitura dos pedidos do usuário autenticado.
 *
 * ── Contrato (../backend/src/app/orders) ────────────────────────────────────
 *   GET /orders/purchases?page&limit → { data: { items: compras, page, limit, total, pageCount } }
 *   401                              → sem sessão
 *
 * Desde 2026-10-15 a tela lista COMPRAS (itens do mesmo carrinho juntos), não
 * pedidos soltos — ver `Purchase`.
 *
 * A tradução para o formato da tela mora AQUI, na borda, e não no componente:
 * o backend manda enum em maiúsculas, preço como string decimal e data em ISO,
 * porque nenhuma dessas três coisas é decisão dele. Fuso e formato de moeda são
 * de quem exibe.
 */

export type ApiOrder = {
  id: string;
  reference: string;
  productName: string;
  productImageUrl?: string | null;
  platform: string;
  quantity: string;
  totalPrice: string;
  currency: string;
  /** Desconto pago com Lets Coins. Ausente quando não houve resgate — o
   *  backend apaga campos zerados da resposta. */
  coinsSpent?: number;
  discountCents?: number;
  status: string;
  /** Legado: a trilha sai de `status` + datas (a coluna nunca mudava). */
  step?: string;
  /** Quando entrou em cada etapa (ISO). Ausentes = sem data conhecida. */
  approvedAt?: string | null;
  inDeliveryAt?: string | null;
  deliveredAt?: string | null;
  canceledAt?: string | null;
  createdAt: string;
  /**
   * Só pedido de SERVIÇO (contrato game-tabs): a escolha e a conta do preço,
   * gravadas pelo backend. `unknown` de propósito — lido por `toOrderDetails`.
   */
  details?: unknown;
  /** Brinde congelado (2026-10-12) — lido por `toOrderGift`. */
  gift?: unknown;
  /** Cupom (2026-10-12). Ausentes sem cupom (o backend apaga zero/nulo). */
  couponCode?: string | null;
  couponCents?: number;
};

export type ApiPurchase = {
  id: string;
  reference: string;
  createdAt: string;
  orders: ApiOrder[];
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
 * Uma PÁGINA de compras do usuário.
 *
 * A página é de COMPRAS, não de itens: paginar por item cortaria um carrinho
 * ao meio entre duas páginas.
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
 * Compra da API → tela. As somas são feitas em CENTAVOS inteiros (o preço vem
 * como string decimal): somar reais em ponto flutuante erra o centavo.
 * Compra sem item (resposta inesperada) vira `null` e some da lista.
 */
export function toPurchase(api: ApiPurchase): Purchase | null {
  const orders = Array.isArray(api.orders) ? api.orders : [];
  if (orders.length === 0) return null;

  const currency = orders[0].currency || "BRL";
  let priceCents = 0;
  let coinsCents = 0;
  let couponCents = 0;
  for (const order of orders) {
    priceCents += toCents(order.totalPrice);
    coinsCents += order.discountCents || 0;
    couponCents += order.couponCents || 0;
  }
  const couponCode = orders.find((order) => order.couponCode)?.couponCode ?? null;

  return {
    id: api.id,
    reference: api.reference,
    date: formatDate(api.createdAt),
    items: orders.map(toOrder),
    price: formatCents(priceCents, currency),
    discount: coinsCents + couponCents > 0 ? formatCents(coinsCents + couponCents, currency) : null,
    paid: formatCents(Math.max(0, priceCents - coinsCents - couponCents), currency),
    coupon: couponCode && couponCents > 0 ? { code: couponCode, amount: formatCents(couponCents, currency) } : null,
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

export function toOrder(api: ApiOrder): Order {
  return {
    id: api.id,
    reference: api.reference,
    productName: api.productName,
    platform: api.platform,
    quantity: api.quantity,
    price: formatPrice(api.totalPrice, api.currency),
    // O card mostra o preço do PRODUTO; o abatimento vai numa linha própria,
    // como no comprovante. Um preço já líquido faria o histórico mentir sobre
    // quanto o produto custava no dia.
    // "Desconto" = coins + cupom (2026-10-12); o cupom também sai em `coupon`.
    discount:
      (api.discountCents || 0) + (api.couponCents || 0) > 0
        ? formatPrice((((api.discountCents || 0) + (api.couponCents || 0)) / 100).toFixed(2), api.currency)
        : null,
    coinsSpent: api.coinsSpent || 0,
    paid: formatPrice(
      (
        Math.max(0, Math.round(Number(api.totalPrice) * 100) - (api.discountCents || 0) - (api.couponCents || 0)) / 100
      ).toFixed(2),
      api.currency,
    ),
    coupon:
      api.couponCode && (api.couponCents || 0) > 0
        ? { code: api.couponCode, amount: formatPrice(((api.couponCents || 0) / 100).toFixed(2), api.currency) }
        : null,
    date: formatDate(api.createdAt),
    status: toStatus(api.status),
    track: toTrack(api),
    stepDates: toStepDates(api),
    details: toOrderDetails(api.details, api.currency),
    gift: toOrderGift(api.gift),
  };
}

/**
 * `Order.details` → o que a tela mostra: as linhas da conta e as horas. Tudo
 * conferido campo a campo — é JSON do banco, e um formato inesperado vira
 * "sem detalhes" (a tela cai na quantidade), nunca um erro na página.
 */
export function toOrderDetails(raw: unknown, currency = "BRL"): Order["details"] {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as { lines?: unknown; hours?: unknown };

  const lines = Array.isArray(value.lines)
    ? value.lines
        .filter(
          (line): line is { label: string; cents: number } =>
            !!line &&
            typeof (line as { label?: unknown }).label === "string" &&
            Number.isFinite((line as { cents?: unknown }).cents),
        )
        .slice(0, 30)
        .map((line) => ({
          label: line.label.slice(0, 120),
          price: formatPrice((line.cents / 100).toFixed(2), currency),
        }))
    : [];
  const hours =
    typeof value.hours === "number" && Number.isFinite(value.hours) && value.hours > 0
      ? value.hours.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : null;

  return lines.length > 0 || hours ? { lines, hours } : null;
}

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
export function toTrack(api: Pick<ApiOrder, "status" | "approvedAt" | "inDeliveryAt" | "deliveredAt">): OrderTrack {
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

function toStepDates(api: ApiOrder): Order["stepDates"] {
  const dates: Order["stepDates"] = {};
  const entries: [keyof Order["stepDates"], string | null | undefined][] = [
    ["feito", api.createdAt],
    ["aprovado", api.approvedAt],
    ["entrega", api.inDeliveryAt],
    ["finalizado", api.deliveredAt],
    ["cancelado", api.canceledAt],
  ];
  for (const [key, iso] of entries) {
    if (!iso) continue;
    const date = new Date(iso);
    if (!Number.isNaN(date.getTime())) dates[key] = stepDateFormatter.format(date).replace(",", "");
  }
  return dates;
}
