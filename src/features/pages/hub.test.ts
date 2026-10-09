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

  it("uma linha por página: Home só uma vez, sem Configurações; sem jogos, sem grupo de jogos", () => {
    expect(cards.filter((card) => card.title.startsWith("Home"))).toHaveLength(1);
    expect(cards.some((card) => card.href.includes("jogo-"))).toBe(false);
    expect(cards.some((card) => card.href === "/admin/configuracoes")).toBe(false);
  });

  it("lista a página de cada jogo, abrindo o editor que existe para ele (2026-10-09)", () => {
    const games = [
      { id: "g1", name: "Diablo", slug: "diablo" },
      { id: "g2", name: "Path of Exile 2", slug: "path-of-exile-2" },
    ];
    const group = hubGroups(games).find((item) => item.title === "Páginas dos jogos");
    expect(group?.cards.map((card) => card.title)).toEqual(["Diablo", "Path of Exile 2"]);
    for (const card of group?.cards ?? []) {
      const slug = new URL(card.href, "http://x").searchParams.get("pagina")!;
      expect(builderPage(slug, games)?.slug, slug).toBe(slug);
    }
  });

  it("Home abre direto em Textos e imagens", () => {
    expect(cards.find((card) => card.title === "Home")?.href).toBe("/admin/paginas/desenho?pagina=home");
  });
});
