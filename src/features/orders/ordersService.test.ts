import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/serverApi", () => ({ apiGet: vi.fn() }));

import { toOrderDetails } from "./ordersService";

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
