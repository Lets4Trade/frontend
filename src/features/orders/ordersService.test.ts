import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/serverApi", () => ({ apiGet: vi.fn() }));

import { toOrderDetails, toPurchase, toTrack, type ApiOrder } from "./ordersService";
import { stepStates } from "./OrderStatusTracker";

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


function apiOrder(overrides: Partial<ApiOrder> = {}): ApiOrder {
  return {
    id: "o1",
    reference: "V1",
    productName: "Gold",
    platform: "SC",
    quantity: "1x",
    totalPrice: "10.10",
    currency: "BRL",
    status: "APROVADO",
    createdAt: "2026-10-15T12:00:00.000Z",
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

describe("toPurchase", () => {
  it("soma em centavos: preço, desconto (coins + cupom) e pago; cupom da compra", () => {
    const purchase = toPurchase({
      id: "pay1",
      reference: "V1",
      createdAt: "2026-10-15T12:00:00.000Z",
      orders: [
        apiOrder({ id: "a", totalPrice: "0.10", discountCents: 5 }),
        apiOrder({ id: "b", totalPrice: "0.20", couponCode: "BEMVINDO", couponCents: 3 }),
      ],
    });
    expect(purchase?.items.map((item) => item.id)).toEqual(["a", "b"]);
    expect(purchase?.price).toMatch(/0,30/);
    expect(purchase?.discount).toMatch(/0,08/);
    expect(purchase?.paid).toMatch(/0,22/);
    expect(purchase?.coupon).toEqual({ code: "BEMVINDO", amount: expect.stringMatching(/0,03/) });
  });

  it("datas das etapas no fuso de São Paulo, com hora", () => {
    const purchase = toPurchase({
      id: "pay1",
      reference: "V1",
      createdAt: "2026-10-15T12:00:00.000Z",
      orders: [apiOrder({ approvedAt: "2026-10-15T13:05:00.000Z" })],
    });
    expect(purchase?.items[0].stepDates).toEqual({ feito: "15/10 09:00", aprovado: "15/10 10:05" });
  });

  it("compra sem itens some (null)", () => {
    expect(toPurchase({ id: "x", reference: "V", createdAt: "", orders: [] })).toBeNull();
  });
});
