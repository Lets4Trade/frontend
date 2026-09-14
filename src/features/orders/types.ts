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

/** Situação exibida na pílula colorida ao lado do botão de chat. */
export type OrderStatus =
  | "pendente"
  | "aprovado"
  | "em_andamento"
  | "entregue"
  | "cancelado";

export type Order = {
  id: string;
  /** Código curto que o cliente vê e cita no suporte — é a chave da rota do pedido. */
  reference: string;
  productName: string;
  /** Caminho da imagem do produto. */
  image: string;
  platform: string;
  quantity: string;
  /** Já formatado em BRL pelo servidor ou por `Intl.NumberFormat` na borda. */
  price: string;
  /**
   * Abatimento pago com Lets Coins, já formatado. `null` quando não houve.
   *
   * Separado de `price` porque `price` é o preço CONGELADO do produto: o que a
   * pessoa pagou é a diferença dos dois, e juntá-los faria o histórico dizer
   * que o produto custava menos do que custava.
   */
  discount: string | null;
  /** Quantas coins pagaram esse abatimento. Zero quando não houve. */
  coinsSpent: number;
  /** `price - discount`, já formatado: o que a pessoa de fato pagou. */
  paid: string;
  /** Data já formatada (dd/mm/aa), como no design. */
  date: string;
  status: OrderStatus;
  /** Etapa ATUAL do pedido. As anteriores contam como concluídas. */
  currentStep: OrderStepKey;
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
