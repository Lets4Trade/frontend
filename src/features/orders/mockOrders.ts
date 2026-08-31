import type { Order } from "./types";

/**
 * Dados de exemplo com o conteúdo que o design mostra. Some assim que o
 * endpoint de pedidos existir — ver .claude/context/open-questions.md.
 */
export const MOCK_ORDERS: Order[] = [
  {
    id: "1",
    productName: "Nome do produto",
    image: "/images/orders/produto-1.png",
    platform: "Eternal Softcore",
    quantity: "500M",
    price: "R$500,00",
    date: "17/03/26",
    status: "pendente",
    currentStep: "aprovado",
  },
  {
    id: "2",
    productName: "Nome do produto",
    image: "/images/orders/produto-2.png",
    platform: "Eternal Softcore",
    quantity: "500M",
    price: "R$500,00",
    date: "17/03/26",
    status: "pendente",
    currentStep: "aprovado",
  },
  {
    id: "3",
    productName: "Nome do produto",
    image: "/images/orders/produto-3.png",
    platform: "Eternal Softcore",
    quantity: "500M",
    price: "R$500,00",
    date: "17/03/26",
    status: "pendente",
    currentStep: "aprovado",
  },
];
