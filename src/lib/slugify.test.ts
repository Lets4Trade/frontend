import { describe, expect, it } from "vitest";
import { slugify, slugifyDraft } from "./slugify";

describe("slugify (espelho do backend)", () => {
  it.each([
    ["Path of Exile 2", "path-of-exile-2"],
    ["Pokémon: Edição Ç", "pokemon-edicao-c"],
    ["  --Diablo IV!!  ", "diablo-iv"],
    ["!!!", ""],
    ["a".repeat(100), "a".repeat(80)],
  ])("%j → %j", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe("slugifyDraft (enquanto digita)", () => {
  it("mantém o hífen do fim para dar para continuar digitando", () => {
    expect(slugifyDraft("meu-")).toBe("meu-");
    expect(slugifyDraft("Meu Jogo ")).toBe("meu-jogo-");
  });

  it("mesma limpeza do slugify no resto", () => {
    expect(slugifyDraft("--Pokémon!!x")).toBe("pokemon-x");
  });
});
