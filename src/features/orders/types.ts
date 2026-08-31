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
export type OrderStatus = "pendente" | "aprovado" | "entregue" | "cancelado";

export type Order = {
  id: string;
  productName: string;
  /** Caminho da imagem do produto. */
  image: string;
  platform: string;
  quantity: string;
  /** Já formatado em BRL pelo servidor ou por `Intl.NumberFormat` na borda. */
  price: string;
  /** Data já formatada (dd/mm/aa), como no design. */
  date: string;
  status: OrderStatus;
  /** Etapa ATUAL do pedido. As anteriores contam como concluídas. */
  currentStep: OrderStepKey;
};

/**
 * Cores da pílula de situação. O design só mostra "Pendente" (#ffd400 sobre
 * #424111); as outras seguem a mesma fórmula — texto saturado sobre um fundo
 * que é a mesma matiz bem escurecida.
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
    className: "bg-[#0f3d1c] text-[#00cb45]",
  },
  entregue: {
    label: "Entregue",
    className: "bg-[#0f2f3d] text-[#3db9cf]",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-[#3d1214] text-[#e0434a]",
  },
};
