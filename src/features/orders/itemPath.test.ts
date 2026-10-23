import { describe, expect, it } from "vitest";
import { itemPath } from "./itemPath";

/** "Jogo / Aba / Servidor / Categoria / Subcategoria" (2026-10-23). */

describe("itemPath", () => {
  it("o exemplo do usuário, com a aba em caixa alta vindo do cadastro", () => {
    expect(itemPath({ gameName: "Path of Exile 2", tabLabel: "MOEDAS", platform: "Forbidden Rites" })).toBe(
      "Path of Exile 2 / Moedas / Forbidden Rites",
    );
  });

  it("com categoria e subcategoria", () => {
    expect(
      itemPath({
        gameName: "Path of Exile 2",
        tabLabel: "Moedas",
        platform: "Forbidden Rites",
        categoryLabel: "Orbes",
        subcategoryLabel: "Raras",
      }),
    ).toBe("Path of Exile 2 / Moedas / Forbidden Rites / Orbes / Raras");
  });

  it("pedido antigo (sem aba) = Jogo / Servidor; sem servidor o jogo não repete", () => {
    expect(itemPath({ gameName: "Diablo", platform: "Eternal Softcore" })).toBe("Diablo / Eternal Softcore");
    expect(itemPath({ gameName: "ARC Raiders", tabLabel: "ITENS", platform: "ARC Raiders" })).toBe("ARC Raiders / Itens");
  });

  it("peças vazias somem", () => {
    expect(itemPath({ gameName: null, tabLabel: " ", platform: "Global", categoryLabel: "" })).toBe("Global");
  });
});
