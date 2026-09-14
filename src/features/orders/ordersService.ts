import { apiGet } from "@/lib/serverApi";
import type { Order, OrderStatus, OrderStepKey } from "./types";

/**
 * Leitura dos pedidos do usuário autenticado.
 *
 * ── Contrato (../backend/src/app/orders) ────────────────────────────────────
 *   GET /orders?page&limit → { data: { items, page, limit, total, pageCount } }
 *   401                    → sem sessão
 *
 * A tradução para o formato da tela mora AQUI, na borda, e não no componente:
 * o backend manda enum em maiúsculas, preço como string decimal e data em ISO,
 * porque nenhuma dessas três coisas é decisão dele. Fuso e formato de moeda são
 * de quem exibe.
 */

/** Placeholder quando o pedido não tem arte. O card do design sempre tem imagem. */
const IMAGE_FALLBACK = "/images/orders/produto-1.png";

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
  step: string;
  createdAt: string;
};

type ApiOrderPage = {
  items: ApiOrder[];
  page: number;
  limit: number;
  total: number;
  pageCount: number;
};

export type OrdersResult =
  | { ok: true; orders: Order[]; total: number; page: number; pageCount: number }
  | { ok: false; reason: "unauthenticated" | "error" };

/**
 * Uma PÁGINA de pedidos do usuário.
 *
 * O backend pagina desde o primeiro dia (`GET /orders?page&limit`, teto de 50),
 * mas esta função só pedia a primeira página e descartava `page`/`pageCount` —
 * na prática o cliente ficava preso nos 20 pedidos mais recentes e o 21º era
 * inalcançável pela interface. Quem compra sempre é justamente quem perde o
 * acesso ao histórico, que é o oposto do que a tela existe para fazer.
 *
 * `page` é saneado AQUI e não confiado à URL: vem de `?page=` e um valor
 * absurdo (0, -1, "abc") viraria `skip` negativo ou `NaN` no banco.
 */
export async function getMyOrders(page = 1, limit = 20): Promise<OrdersResult> {
  const current = Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : 1;
  const result = await apiGet<ApiOrderPage>(`/orders?page=${current}&limit=${limit}`);
  if (!result.ok) return { ok: false, reason: result.reason };

  const items = Array.isArray(result.data.items) ? result.data.items : [];
  const total = typeof result.data.total === "number" ? result.data.total : items.length;
  return {
    ok: true,
    orders: items.map(toOrder),
    total,
    page: typeof result.data.page === "number" ? result.data.page : current,
    // Quem manda no total de páginas é o backend; o cálculo local é só a
    // reserva para uma resposta antiga que não traga o campo.
    pageCount:
      typeof result.data.pageCount === "number"
        ? result.data.pageCount
        : Math.max(1, Math.ceil(total / limit)),
  };
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
    image: api.productImageUrl || IMAGE_FALLBACK,
    platform: api.platform,
    quantity: api.quantity,
    price: formatPrice(api.totalPrice, api.currency),
    // O card mostra o preço do PRODUTO; o abatimento vai numa linha própria,
    // como no comprovante. Um preço já líquido faria o histórico mentir sobre
    // quanto o produto custava no dia.
    discount:
      api.discountCents && api.discountCents > 0
        ? formatPrice((api.discountCents / 100).toFixed(2), api.currency)
        : null,
    coinsSpent: api.coinsSpent || 0,
    paid: formatPrice(
      (Math.max(0, Math.round(Number(api.totalPrice) * 100) - (api.discountCents || 0)) / 100).toFixed(2),
      api.currency,
    ),
    date: formatDate(api.createdAt),
    status: toStatus(api.status),
    currentStep: toStep(api.step),
  };
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

const STEP_MAP: Record<string, OrderStepKey> = {
  FEITO: "feito",
  APROVADO: "aprovado",
  ENTREGA: "entrega",
  FINALIZADO: "finalizado",
};

function toStatus(value: string): OrderStatus {
  return STATUS_MAP[value] ?? "pendente";
}

function toStep(value: string): OrderStepKey {
  return STEP_MAP[value] ?? "feito";
}
