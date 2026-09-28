import { beforeEach, describe, expect, it } from "vitest";
import { cartLineId, hashString, selectionKey } from "./lineId";
import { useCart, type CartItem } from "./store";

const base = {
  productId: "p1",
  gameSlug: "poe2",
  name: "Boost",
  platform: "SC",
  unitPriceCents: 1000,
};

describe("cartLineId", () => {
  it("catálogo mantém o formato antigo produto::servidor", () => {
    expect(cartLineId("p1", "SC")).toBe("p1::SC");
  });

  it("serviço: hash estável e independente da ordem dos adicionais", () => {
    const a = cartLineId("p1", "SC", { levelFrom: 1, levelTo: 50, addonIds: ["b", "a"] });
    const b = cartLineId("p1", "SC", { addonIds: ["a", "b"], levelTo: 50, levelFrom: 1 });
    expect(a).toBe(b);
    expect(a).toMatch(/^p1::SC::[0-9a-f]{8}$/);
    expect(cartLineId("p1", "SC", { levelFrom: 1, levelTo: 51 })).not.toBe(a);
    expect(hashString(selectionKey({}))).toHaveLength(8);
  });
});

describe("useCart com serviço", () => {
  beforeEach(() => {
    useCart.setState({ items: [], isOpen: false });
  });

  it("linha de serviço fica sempre em 1 e a mesma escolha substitui", () => {
    const selection = { levelFrom: 1, levelTo: 50 };
    useCart.getState().add({ ...base, selection, summary: "Nível 1 → 50" }, 3);
    useCart.getState().add({ ...base, unitPriceCents: 1200, selection, summary: "Nível 1 → 50" });
    const items = useCart.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ quantity: 1, unitPriceCents: 1200, summary: "Nível 1 → 50" });

    useCart.getState().setQuantity(items[0].id, 5);
    expect(useCart.getState().items[0].quantity).toBe(1);

    useCart.getState().add({ ...base, selection: { levelFrom: 1, levelTo: 60 } });
    expect(useCart.getState().items).toHaveLength(2);
  });

  it("catálogo continua somando", () => {
    useCart.getState().add(base, 2);
    useCart.getState().add(base, 3);
    expect(useCart.getState().items).toEqual([expect.objectContaining({ id: "p1::SC", quantity: 5 })]);
  });

  it("carrinho salvo por versão antiga (sem selection) carrega", async () => {
    const legacy: CartItem = {
      ...base,
      id: "p1::SC",
      quantity: 2,
      addedAt: "2026-09-01T00:00:00.000Z",
    };
    window.localStorage.setItem("l4t-cart", JSON.stringify({ state: { items: [legacy] }, version: 1 }));
    await useCart.persist.rehydrate();
    const items = useCart.getState().items;
    expect(items).toEqual([legacy]);
    expect(items[0].selection).toBeUndefined();
  });
});
