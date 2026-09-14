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

export type AdminOrder = {
  id: string;
  reference: string;
  productName: string;
  /** Caminho servido pelo BACKEND, ou ausente. */
  productImageUrl?: string | null;
  platform: string;
  quantity: string;
  /** STRING, não número: veio de um `Decimal` e não passa por float. */
  totalPrice: string;
  currency: string;
  /** Ausente nos pedidos anteriores a 2026-09-10 — a coluna mostra um traço. */
  gameName?: string | null;
  /**
   * Arte do JOGO congelada no pedido — o emblema de 27px que fecha a linha.
   *
   * Opcional porque o backend apaga campos vazios da resposta, e porque pedido
   * anterior à coluna (ou de jogo já removido) não tem arte nenhuma.
   */
  gameImageUrl?: string | null;
  /** Valor do enum do backend: PENDENTE, APROVADO, EM_ANDAMENTO… */
  status: string;
  step: string;
  createdAt: string;
  customerName: string;
  customerPhone?: string | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
};

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
  if (Number.isNaN(date.getTime())) return "—";
  // O `Intl` devolve "17/04/26, 05:34"; o arquivo não tem a vírgula.
  return dateTimeFormatter.format(date).replace(",", "");
}

/** Célula vazia vira travessão — coluna em branco parece defeito de carga. */
export function orDash(value: string | null | undefined) {
  return value && value.trim() !== "" ? value : "—";
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
