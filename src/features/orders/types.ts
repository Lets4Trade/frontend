import type { OrderGift } from "@/features/gifts/orderGift";
import type { DeliveryStatusView } from "./deliveryStatus";

/**
 * Etapas do pedido, na ordem em que aparecem no tracker (Figma 2073:1612).
 * A ordem do array É a ordem visual — não reordene sem olhar o design.
 */
export const ORDER_STEPS = [
  { key: "feito", label: "Pedido Feito" },
  { key: "aprovado", label: "Pedido Aprovado" },
  { key: "entrega", label: "Em Processo\nde Entrega" },
  { key: "finalizado", label: "Finalizado" },
] as const;

export type OrderStepKey = (typeof ORDER_STEPS)[number]["key"];

/**
 * Posição na trilha (2026-10-15). Era um campo próprio (`step`) que o backend
 * nunca atualizava; agora sai da situação:
 *   pendente → feito · aprovado → aprovado · em_andamento → entrega (ativas)
 *   entregue → finalizado com TODAS as etapas concluídas (`done`)
 *   cancelado → a última etapa alcançada, marcada com o X vermelho (`canceled`)
 */
export type OrderTrack = {
  step: OrderStepKey;
  state: "active" | "done" | "canceled";
};

/** Situação exibida na pílula colorida ao lado do botão de chat. */
export type OrderStatus =
  | "pendente"
  | "aprovado"
  | "em_andamento"
  | "entregue"
  | "cancelado";

/**
 * Um PRODUTO do pedido (2026-10-16). Até então cada produto era um pedido, com
 * situação e trilha próprias; agora a situação é do pedido inteiro (`Purchase`).
 */
export type OrderItem = {
  id: string;
  productName: string;
  platform: string;
  quantity: string;
  /** Jogo do produto, congelado na compra. */
  gameName: string | null;
  /** Arte do produto e do jogo, congeladas (caminhos do backend). Nulas = sem arte. */
  productImageUrl: string | null;
  gameImageUrl: string | null;
  /** Preço CHEIO do item, já formatado em BRL. */
  price: string;
  /**
   * Abatimento DESTE item (coins + cupom), já formatado. `null` quando não houve.
   *
   * Separado de `price` porque `price` é o preço CONGELADO do produto: juntar
   * os dois faria o histórico dizer que o produto custava menos do que custava.
   */
  discount: string | null;
  /** `price - discount`, já formatado: o que a pessoa pagou por este item. */
  paid: string;
  /**
   * Só item de SERVIÇO: a conta do preço ("Nível 1 → 50" R$ 250,00,
   * "Prioridade" R$ 24,14) e as horas estimadas, já formatadas. `null` =
   * catálogo — a tela mostra só a quantidade.
   */
  details?: { lines: { label: string; price: string }[]; hours: string | null } | null;
  /** Brinde do jogo que vai com este item (2026-10-12). Ausente = nenhum. */
  gift?: OrderGift | null;
};

/**
 * O PEDIDO (2026-10-16): uma compra com vários itens, UMA situação, UMA trilha
 * e uma entrega. O nome do tipo ficou `Purchase` porque já era o agrupamento
 * da tela de "Meus pedidos" desde 2026-10-15.
 */
export type Purchase = {
  id: string;
  /** Código que o cliente vê e cita no suporte — é a rota da tela do pedido. */
  reference: string;
  /** dd/mm/aa. */
  date: string;
  status: OrderStatus;
  /** Onde o pedido está na trilha — DERIVADO da situação (ver `OrderTrack`). */
  track: OrderTrack;
  /**
   * Quando o pedido entrou em cada etapa, já formatado ("15/10 14:32"), e a
   * data do cancelamento. Etapa sem data (pedido antigo, etapa pulada) fica
   * ausente e a trilha não mostra nada embaixo dela.
   */
  stepDates: Partial<Record<OrderStepKey | "cancelado", string>>;
  /**
   * Status de entrega personalizado ("Farmando"), quando a equipe pôs um: vai
   * na pílula e no lugar do nome da etapa atual da trilha. `date` = quando.
   */
  delivery: (DeliveryStatusView & { date: string | null }) | null;
  items: OrderItem[];
  /** Totais do pedido, já formatados. */
  price: string;
  discount: string | null;
  paid: string;
  /** Cupom do pedido: código e quanto abateu no total. */
  coupon: { code: string; amount: string } | null;
};

/**
 * Cores da pílula de situação — as do arquivo do painel (2546:1136).
 *
 * Esta tabela é a ÚNICA fonte, usada tanto pelo card do cliente quanto pela
 * tabela de "Vendas e pedidos".
 *
 * ⚠️ Eu tinha aproximado estes valores, anotando que a diferença "ninguém
 * enxerga". Enxerga: #00cb45 contra o #00f55f do arquivo é um verde visivelmente
 * mais apagado, e o vermelho idem. Agora são os do arquivo, dígito por dígito.
 *
 * "Entregue" é a única que o arquivo NÃO desenha — ele mostra Aprovado,
 * Pendente, Em andamento e Cancelado. Segue a fórmula das outras: texto saturado
 * sobre a mesma matiz bem escurecida.
 */
export const ORDER_STATUS_STYLES: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  pendente: {
    label: "Pendente",
    className: "bg-[#424111] text-[#ffd400]",
  },
  aprovado: {
    label: "Aprovado",
    className: "bg-[#0f361e] text-[#00f55f]",
  },
  // Acrescentado com o painel de vendas (2026-09-10).
  em_andamento: {
    label: "Em andamento",
    className: "bg-[#00214d] text-[#06b4ff]",
  },
  entregue: {
    label: "Entregue",
    className: "bg-[#0f2f3d] text-[#3db9cf]",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-[#350507] text-[#ff2828]",
  },
};
