import { describe, expect, it } from "vitest";
import { HERO_GAMES, buildHeroSlides } from "./heroGames";

describe("buildHeroSlides", () => {
  it("arte NOVA: caixa do personagem do Figma (1075:4915), inteira e com halo", () => {
    const [slide] = buildHeroSlides([{ id: "a", title: "Novo", image: "http://x/uploads/sections/3f2a.webp" }]);
    expect(slide.char).toEqual({ left: 10, top: 130, width: 315.712, height: 419.156, blur: 9.5, contain: true });
    // Termina na linha divisória do card (549).
    expect(Math.round(slide.char.top + slide.char.height)).toBe(549);
  });

  it("arte ORIGINAL da semente continua com a geometria medida", () => {
    const [slide] = buildHeroSlides([
      { id: "b", title: "", image: "http://x/uploads/sections/seed-images-games-char-1-webp.webp" },
    ]);
    expect(slide.char).toEqual(HERO_GAMES[0].char);
    expect(slide.name).toBe("Diablo");
  });

  it("slide sem arte é descartado", () => {
    expect(buildHeroSlides([{ id: "c", title: "Vazio" }])).toEqual([]);
  });
});
