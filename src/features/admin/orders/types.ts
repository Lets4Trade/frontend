import {
  DELIVERY_COLOR_STYLES,
  toDeliveryStatus,
  type DeliveryStatusColor,
  type DeliveryStatusView,
} from "@/features/orders/deliveryStatus";
import { ORDER_STATUS_STYLES, type OrderStatus } from "@/features/orders/types";

/**
 * "Vendas e pedidos" (Figma 2546:1136) — tipos e formatação da tabela.
 *
 * A parte PURA, sem `serverApi`: o corpo da tabela é client component (edita
 * situação e atendente na linha), e importar a leitura aqui arrastaria
 * `next/headers` para o bundle do navegador. Mesma separação de
 * `admin/products/catalog.ts`.
 */

/** Uma linha da tabela, como o backend a devolve. */
/**
 * "Sem atendente" — sentinela usada nos DOIS sentidos da coluna Entregador:
 * como FILTRO ("mostre os que ninguém pegou") e como ESCOLHA na linha
 * ("desatribua este pedido").
 *
 * Precisa ser uma string não vazia: na URL, `?atendente=` some do endereço; no
 * `<Select.Item>` do Radix, a string vazia é reservada para "nada escolhido" e
 * o componente recusa o item. Nos dois casos a ausência de atendente é uma
 * escolha de verdade, e escolha de verdade precisa de valor próprio.
 */
export const UNASSIGNED = "sem-atendente";

/** Um produto do pedido (2026-10-16), como o backend o devolve. */
export type AdminOrderItem = {
  id: string;
  productName: string;
  /** Caminho servido pelo BACKEND, ou ausente. */
  productImageUrl?: string | null;
  platform: string;
  quantity: string;
  gameName?: string | null;
  gameImageUrl?: string | null;
  /** Caminho na loja (2026-10-23) — ver `features/orders/itemPath.ts`. */
  tabLabel?: string | null;
  categoryLabel?: string | null;
  subcategoryLabel?: string | null;
  /** STRING, não número: veio de um `Decimal` e não passa por float. */
  totalPrice: string;
  coinsSpent?: number;
  discountCents?: number;
  couponCents?: number;
  /** Escolha e conta do serviço — ler com `toOrderDetails`. */
  details?: unknown;
  /** Brinde do jogo congelado (2026-10-12) — ler com `toOrderGift`. */
  gift?: unknown;
  /** Código que este item tinha quando cada item era um pedido (antes de 2026-10-16). */
  legacyReference?: string | null;
};

/**
 * Uma linha da tabela: o PEDIDO (desde 2026-10-16, a compra inteira — vários
 * itens, uma situação, um entregador).
 */
export type AdminOrder = {
  id: string;
  reference: string;
  /** Preço CHEIO do pedido (soma dos itens). */
  totalPrice: string;
  currency: string;
  coinsSpent?: number;
  discountCents?: number;
  /** Cupom (2026-10-12): ausentes sem cupom. */
  couponCode?: string | null;
  couponCents?: number;
  /** Valor do enum do backend: PENDENTE, APROVADO, EM_ANDAMENTO… */
  status: string;
  step: string;
  createdAt: string;
  /** Status de entrega personalizado — ler com `toDeliveryStatus`. */
  deliveryStatus?: unknown;
  deliveryStatusAt?: string | null;
  items: AdminOrderItem[];
  /** Os jogos do pedido, sem repetir: a coluna "Jogo" e o emblema da linha. */
  games?: { name: string; imageUrl?: string | null }[];
  /** Abre a ficha em Usuários (2026-10-23). Ausente em resposta antiga. */
  customerId?: string;
  customerName: string;
  customerPhone?: string | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
};

/** Um status de entrega personalizado, como o cadastro devolve. */
export type AdminDeliveryStatus = {
  id: string;
  label: string;
  color: DeliveryStatusColor;
  /** A etapa em que conta: APROVADO, EM_ANDAMENTO, ENTREGUE ou CANCELADO. */
  base: string;
  position?: number;
  archivedAt?: string | null;
};

/**
 * As etapas que um status personalizado pode ter — sem PENDENTE, que é "ainda
 * não pagou" e só o pagamento muda.
 */
export const DELIVERY_STATUS_BASES = ["APROVADO", "EM_ANDAMENTO", "ENTREGUE", "CANCELADO"] as const;

/**
 * Valor do select de situação: o enum (PENDENTE…) ou `ds:<id>` para um status
 * personalizado. Prefixo porque os dois vivem na mesma lista, e um id nunca
 * pode ser confundido com um nome de situação.
 */
export const CUSTOM_PREFIX = "ds:";

export function statusValue(order: Pick<AdminOrder, "status" | "deliveryStatus">): string {
  const custom = toDeliveryStatus(order.deliveryStatus);
  return custom ? `${CUSTOM_PREFIX}${custom.id}` : order.status;
}

/** Rótulo e cor da pílula da linha: o personalizado, ou a situação padrão. */
export function orderPill(order: Pick<AdminOrder, "status" | "deliveryStatus">): { label: string; className: string } {
  const custom: DeliveryStatusView | null = toDeliveryStatus(order.deliveryStatus);
  if (custom) return { label: custom.label, className: DELIVERY_COLOR_STYLES[custom.color].className };
  return statusStyle(order.status);
}

/** "3 itens" / o nome do único produto — a coluna e o título do detalhe. */
export function itemsSummary(order: Pick<AdminOrder, "items">): string {
  const items = Array.isArray(order.items) ? order.items : [];
  if (items.length === 1) return items[0].productName;
  return `${items.length} itens`;
}

export type AdminOrderPage = {
  items: AdminOrder[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};

export type Attendant = {
  id: string;
  firstName: string;
  /** Ausente quando a conta não tem sobrenome — o backend apaga campo vazio. */
  lastName?: string | null;
};

/**
 * As situações que a tela oferece, na ordem de PROGRESSÃO do pedido.
 *
 * Escrita à mão e não derivada do enum do banco de propósito: no Postgres,
 * `EM_ANDAMENTO` foi acrescentado ao FIM do tipo (é como `ALTER TYPE … ADD
 * VALUE` funciona), então a ordem de lá é a de criação, não a do fluxo. Aqui a
 * lista é a que faz sentido para quem opera.
 */
export const ORDER_STATUSES = [
  "PENDENTE",
  "APROVADO",
  "EM_ANDAMENTO",
  "ENTREGUE",
  "CANCELADO",
] as const;

/** Enum do backend → chave da paleta compartilhada com "Meus Pedidos". */
const STATUS_KEYS: Record<string, OrderStatus> = {
  PENDENTE: "pendente",
  APROVADO: "aprovado",
  EM_ANDAMENTO: "em_andamento",
  ENTREGUE: "entregue",
  CANCELADO: "cancelado",
};

/**
 * Rótulo e cor de uma situação.
 *
 * Reusa `ORDER_STATUS_STYLES`, que é a MESMA paleta do card do cliente. Um
 * pedido "Aprovado" tem que ter a mesma cara nas duas telas — quem atende olha
 * as duas no mesmo dia.
 *
 * Valor desconhecido cai em "pendente", que é o mais conservador: não promete
 * nada que não se saiba.
 */
export function statusStyle(status: string) {
  return ORDER_STATUS_STYLES[STATUS_KEYS[status] ?? "pendente"];
}

/** Nome do atendente para o select. */
export function attendantName(attendant: Attendant) {
  return `${attendant.firstName} ${attendant.lastName ?? ""}`.trim();
}

/**
 * Data e hora como o arquivo escreve: "17/04/26 05:34".
 *
 * Fuso FIXO de São Paulo, e não o do navegador. É a mesma decisão da tabela de
 * usuários: quem opera a loja está no Brasil, e um servidor ou navegador em
 * UTC mostraria três horas a menos sem nada na tela avisando.
 */
const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  // O `Intl` devolve "17/04/26, 05:34"; o arquivo não tem a vírgula.
  return dateTimeFormatter.format(date).replace(",", "");
}

/** Célula vazia vira travessão — coluna em branco parece defeito de carga. */
export function orDash(value: string | null | undefined) {
  return value && value.trim() !== "" ? value : "-";
}

/** "499.80" → "R$ 499,80". Converte uma vez só, para exibir. */
export function formatMoney(value: string, currency: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `${currency} ${value}`;

  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: currency || "BRL",
  });
}
