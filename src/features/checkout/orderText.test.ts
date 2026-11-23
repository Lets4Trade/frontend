import { describe, expect, it } from "vitest";
import type { CartItem } from "@/features/cart/store";
import { orderText as build, type OrderTextInput } from "./orderText";

/** O `Intl` separa "R$" do valor com espaço não separável; o teste lê com espaço comum. */
const orderText = (input: OrderTextInput) => build(input).replace(/ /g, " ");

const base = { productId: "p", image: undefined, addedAt: "2026-11-22T00:00:00Z" } as const;

const gold: CartItem = {
  ...base,
  id: "a",
  gameSlug: "path-of-exile-2",
  name: "Gold PoE 2",
  platform: "Standard",
  unitPriceCents: 5,
  quantity: 10,
};

const boost: CartItem = {
  ...base,
  id: "b",
  gameSlug: "last-epoch",
  name: "Level *1-90*\nrápido",
  platform: "Last Epoch",
  unitPriceCents: 4590,
  quantity: 1,
  summary: "Nível 1 → 90 · Prioridade",
  hours: 12,
};

describe("orderText", () => {
  it("leva itens, valores e pagamento no formato do WhatsApp", () => {
    const text = orderText({
      items: [gold, boost],
      gameNames: { "path-of-exile-2": "Path of Exile 2", "last-epoch": "Last Epoch" },
      customerName: "Maria",
      coupon: { code: "BEMVINDO", cents: 500 },
      coinsCents: 100,
      feeCents: 0,
      totalCents: 4040,
      method: "pix",
      installments: 1,
      notes: "Entregar à noite",
    });

    expect(text).toContain("*Pedido pelo site — Lets4Trade*\nCliente: Maria");
    expect(text).toContain("1. *Gold PoE 2* — Path of Exile 2\n   Servidor: Standard\n   Quantidade: 10\n   Valor: R$ 0,50");
    // Marcadores e quebra de linha do nome não bagunçam a mensagem; servidor
    // igual ao nome do jogo não se repete.
    expect(text).toContain("2. *Level 1-90 rápido* — Last Epoch\n   Escolha: Nível 1 → 90 · Prioridade");
    expect(text).toContain("Prazo estimado: ~12,00 h");
    expect(text).toContain("Cupom: BEMVINDO (− R$ 5,00)\nLets Coins: − R$ 1,00\n*Total: R$ 40,40*\nPagamento: PIX");
    expect(text).toContain("Observações: Entregar à noite");
  });

  it("cartão parcelado mostra a taxa e as parcelas; sem cupom/coins não há linha vazia", () => {
    const text = orderText({
      items: [gold],
      gameNames: {},
      coinsCents: 0,
      feeCents: 3,
      totalCents: 53,
      method: "credit",
      installments: 3,
    });
    expect(text).toContain("1. *Gold PoE 2*\n");
    expect(text).toContain("Taxa do cartão: R$ 0,03\n*Total: R$ 0,53*\nPagamento: Cartão de crédito em 3x");
    expect(text).not.toContain("Cupom");
    expect(text).not.toContain("Cliente");
    expect(text).not.toContain("Observações");
  });
});
