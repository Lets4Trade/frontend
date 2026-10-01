import { describe, expect, it } from "vitest";
import { hubGroups } from "./hub";
import { builderPage } from "./registry";

describe("hubGroups", () => {
  const cards = hubGroups().flatMap((group) => group.cards);

  it("toda linha aponta para um editor que existe", () => {
    for (const card of cards) {
      if (card.href.startsWith("/admin/paginas/desenho")) continue;
      const slug = new URL(card.href, "http://x").searchParams.get("pagina")!;
      expect(builderPage(slug, []), slug).not.toBeNull();
    }
  });

  it("uma linha por página: Home só uma vez, sem jogos nem Configurações", () => {
    expect(cards.filter((card) => card.title.startsWith("Home"))).toHaveLength(1);
    expect(cards.some((card) => card.href.includes("jogo-"))).toBe(false);
    expect(cards.some((card) => card.href === "/admin/configuracoes")).toBe(false);
  });

  it("Home abre direto em Textos e imagens", () => {
    expect(cards.find((card) => card.title === "Home")?.href).toBe("/admin/paginas/desenho?pagina=home");
  });
});
