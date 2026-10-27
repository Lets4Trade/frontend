import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/serverApi", () => ({ apiGet: vi.fn() }));

import { toOrderDetails, toPurchase, toTrack, type ApiOrderItem, type ApiPurchase } from "./ordersService";
import { noteIndex, stepStates } from "./OrderStatusTracker";

describe("toOrderDetails", () => {
  it("formata linhas e horas do pedido de serviço", () => {
    const details = toOrderDetails({
      kind: "SERVICE",
      lines: [
        { label: "Nível 1 → 50", cents: 25000 },
        { label: "Prioridade", cents: 2414 },
        { label: 3, cents: 1 },
      ],
      hours: 19,
    });
    expect(details?.lines.map((line) => line.label)).toEqual(["Nível 1 → 50", "Prioridade"]);
    expect(details?.lines[0].price).toMatch(/250,00/);
    expect(details?.hours).toBe("19,00");
  });

  it("sem detalhes (catálogo ou formato estranho) = null", () => {
    expect(toOrderDetails(undefined)).toBeNull();
    expect(toOrderDetails("x")).toBeNull();
    expect(toOrderDetails({ lines: [] })).toBeNull();
  });
});


function apiItem(overrides: Partial<ApiOrderItem> = {}): ApiOrderItem {
  return { id: "i1", productName: "Gold", platform: "SC", quantity: "1x", totalPrice: "10.10", ...overrides };
}

function apiPurchase(overrides: Partial<ApiPurchase> = {}): ApiPurchase {
  return {
    id: "o1",
    reference: "V1",
    currency: "BRL",
    totalPrice: "10.10",
    status: "APROVADO",
    createdAt: "2026-10-15T12:00:00.000Z",
    items: [apiItem()],
    ...overrides,
  };
}

describe("toTrack — a trilha sai da situação (2026-10-15)", () => {
  it("cada situação anda a trilha; entregue conclui tudo", () => {
    expect(toTrack({ status: "PENDENTE" })).toEqual({ step: "feito", state: "active" });
    expect(toTrack({ status: "APROVADO" })).toEqual({ step: "aprovado", state: "active" });
    expect(toTrack({ status: "EM_ANDAMENTO" })).toEqual({ step: "entrega", state: "active" });
    expect(toTrack({ status: "ENTREGUE" })).toEqual({ step: "finalizado", state: "done" });
    expect(toTrack({ status: "???" })).toEqual({ step: "feito", state: "active" });
  });

  it("cancelado marca a última etapa alcançada, pelas datas", () => {
    expect(toTrack({ status: "CANCELADO" })).toEqual({ step: "feito", state: "canceled" });
    expect(toTrack({ status: "CANCELADO", approvedAt: "2026-10-15T12:00:00Z" })).toEqual({ step: "aprovado", state: "canceled" });
    expect(
      toTrack({ status: "CANCELADO", approvedAt: "x", inDeliveryAt: "x", deliveredAt: "2026-10-15T12:00:00Z" }),
    ).toEqual({ step: "finalizado", state: "canceled" });
  });
});

describe("stepStates", () => {
  it("ativo: anteriores concluídas, a atual preenchida", () => {
    expect(stepStates({ step: "entrega", state: "active" })).toEqual(["done", "done", "current", "pending"]);
  });
  it("entregue: todas concluídas", () => {
    expect(stepStates({ step: "finalizado", state: "done" })).toEqual(["done", "done", "done", "done"]);
  });
  it("cancelado: X na etapa seguinte à alcançada (ou na última)", () => {
    expect(stepStates({ step: "feito", state: "canceled" })).toEqual(["done", "canceled", "pending", "pending"]);
    expect(stepStates({ step: "finalizado", state: "canceled" })).toEqual(["done", "done", "done", "canceled"]);
  });
});

describe("noteIndex — onde o status personalizado entra na trilha (2026-10-16)", () => {
  it("na etapa atual; na última quando entregue; no X quando cancelado", () => {
    expect(noteIndex({ step: "entrega", state: "active" })).toBe(2);
    expect(noteIndex({ step: "finalizado", state: "done" })).toBe(3);
    expect(noteIndex({ step: "aprovado", state: "canceled" })).toBe(2);
  });
});

describe("toPurchase — pedido com vários itens (2026-10-16)", () => {
  it("totais do PEDIDO (preço, desconto = coins + cupom, pago) e o desconto de cada item", () => {
    const purchase = toPurchase(
      apiPurchase({
        totalPrice: "0.30",
        discountCents: 5,
        couponCode: "BEMVINDO",
        couponCents: 3,
        items: [
          apiItem({ id: "a", totalPrice: "0.10", discountCents: 5 }),
          apiItem({ id: "b", totalPrice: "0.20", couponCents: 3, gameName: "D4" }),
        ],
      }),
    );
    expect(purchase?.items.map((item) => [item.id, item.gameName])).toEqual([
      ["a", null],
      ["b", "D4"],
    ]);
    expect(purchase?.price).toMatch(/0,30/);
    expect(purchase?.discount).toMatch(/0,08/);
    expect(purchase?.paid).toMatch(/0,22/);
    expect(purchase?.coupon).toEqual({ code: "BEMVINDO", amount: expect.stringMatching(/0,03/) });
    expect(purchase?.items[0].discount).toMatch(/0,05/);
    expect(purchase?.items[0].paid).toMatch(/0,05/);
    expect(purchase?.items[1].discount).toMatch(/0,03/);
  });

  it("pago no crédito: a taxa do cartão aparece e soma ao pago (2026-10-27)", () => {
    const purchase = toPurchase(
      apiPurchase({ totalPrice: "100.00", cardFeeCents: 500, items: [apiItem({ id: "a", totalPrice: "100.00" })] }),
    );
    expect(purchase?.fee).toMatch(/5,00/);
    expect(purchase?.paid).toMatch(/105,00/);
    expect(toPurchase(apiPurchase({ totalPrice: "100.00", items: [apiItem({ totalPrice: "100.00" })] }))?.fee).toBeNull();
  });

  it("UMA situação e UMA trilha para o pedido; datas no fuso de São Paulo, com hora", () => {
    const purchase = toPurchase(apiPurchase({ approvedAt: "2026-10-15T13:05:00.000Z" }));
    expect(purchase?.status).toBe("aprovado");
    expect(purchase?.track).toEqual({ step: "aprovado", state: "active" });
    expect(purchase?.stepDates).toEqual({ feito: "15/10 09:00", aprovado: "15/10 10:05" });
    expect(purchase?.delivery).toBeNull();
  });

  it("status de entrega personalizado: nome, cor da paleta (fora dela = cinza) e quando", () => {
    const purchase = toPurchase(
      apiPurchase({
        status: "EM_ANDAMENTO",
        deliveryStatus: { id: "ds1", label: " Farmando ", color: "blue" },
        deliveryStatusAt: "2026-10-16T18:30:00.000Z",
      }),
    );
    expect(purchase?.delivery).toEqual({ id: "ds1", label: "Farmando", color: "blue", date: "16/10 15:30" });
    expect(toPurchase(apiPurchase({ deliveryStatus: { id: "x", label: "Y", color: "url(javascript:1)" } }))?.delivery?.color).toBe(
      "gray",
    );
    expect(toPurchase(apiPurchase({ deliveryStatus: { label: "sem id" } }))?.delivery).toBeNull();
  });

  it("pedido sem itens some (null)", () => {
    expect(toPurchase(apiPurchase({ items: [] }))).toBeNull();
  });
});
