import { describe, expect, it } from "vitest";
import { accountAvatar, defaultAvatar, parseGender } from "./gender";

/** Avatar padrão por gênero (2026-10-23). */

describe("defaultAvatar", () => {
  it("masculino, feminino e o neutro para não informado/sem gênero/lixo", () => {
    expect(defaultAvatar("MALE")).toBe("/images/avatar-male.png");
    expect(defaultAvatar("FEMALE")).toBe("/images/avatar-female.png");
    expect(defaultAvatar("UNDISCLOSED")).toBe("/images/avatar-unknown.png");
    expect(defaultAvatar(null)).toBe("/images/avatar-unknown.png");
    expect(defaultAvatar("male")).toBe("/images/avatar-unknown.png");
  });
});

describe("accountAvatar", () => {
  it("foto da conta vence o gênero; foto inválida cai no padrão do gênero", () => {
    expect(accountAvatar("https://api.lets4trade.com.br/uploads/avatars/u1.webp", "FEMALE")).toBe(
      "https://api.lets4trade.com.br/uploads/avatars/u1.webp",
    );
    expect(accountAvatar("", "FEMALE")).toBe("/images/avatar-female.png");
    expect(accountAvatar("javascript:alert(1)", "MALE")).toBe("/images/avatar-male.png");
    expect(accountAvatar(undefined, undefined)).toBe("/images/avatar-unknown.png");
  });
});

describe("parseGender", () => {
  it("só os três valores do backend", () => {
    expect([parseGender("MALE"), parseGender("FEMALE"), parseGender("UNDISCLOSED"), parseGender("X")]).toEqual([
      "MALE",
      "FEMALE",
      "UNDISCLOSED",
      null,
    ]);
  });
});
