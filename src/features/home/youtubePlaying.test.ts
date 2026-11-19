import { describe, expect, it } from "vitest";
import { isYoutubePlaying } from "./InlineAutoplayVideo";

// O player só aparece por cima da capa quando o YouTube diz "tocando"
// (2026-11-18: sem a piscada da capa para o vazio).
describe("isYoutubePlaying", () => {
  it("infoDelivery com playerState 1 e onStateChange 1 = tocando", () => {
    expect(isYoutubePlaying(JSON.stringify({ event: "infoDelivery", info: { playerState: 1 } }))).toBe(true);
    expect(isYoutubePlaying(JSON.stringify({ event: "onStateChange", info: 1 }))).toBe(true);
  });

  it("carregando, pausado, lixo e mensagem que não é JSON = não", () => {
    expect(isYoutubePlaying(JSON.stringify({ event: "infoDelivery", info: { playerState: 3 } }))).toBe(false);
    expect(isYoutubePlaying(JSON.stringify({ event: "onStateChange", info: 2 }))).toBe(false);
    expect(isYoutubePlaying(JSON.stringify({ event: "initialDelivery", info: {} }))).toBe(false);
    expect(isYoutubePlaying("não é json")).toBe(false);
    expect(isYoutubePlaying(null)).toBe(false);
  });
});
