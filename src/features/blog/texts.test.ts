import { describe, expect, it } from "vitest";
import { gameListTitle } from "./texts";

describe("gameListTitle (textos do blog editáveis, 2026-10-16)", () => {
  it("modelo em maiúsculas põe o nome em maiúsculas", () => {
    expect(gameListTitle("POSTS DE {jogo}", "Diablo IV")).toBe("POSTS DE DIABLO IV");
    expect(gameListTitle("{jogo} NOTÍCIAS", "Path of Exile 2")).toBe("PATH OF EXILE 2 NOTÍCIAS");
  });

  it("modelo com minúsculas mantém o nome como é", () => {
    expect(gameListTitle("Novidades de {jogo}", "Diablo IV")).toBe("Novidades de Diablo IV");
  });

  it("sem {jogo}, o nome entra no fim", () => {
    expect(gameListTitle("POSTS", "Last Epoch")).toBe("POSTS LAST EPOCH");
  });
});
