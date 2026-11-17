import { describe, expect, it } from "vitest";
import { consultHref, consultMessage } from "./consult";

describe("consult (Consulte aqui, 2026-11-17)", () => {
  it("mensagem com produto, jogo e servidor; sem servidor, a parte some", () => {
    expect(consultMessage({ productName: "Arma X", gameName: "ARC Raiders", serverLabel: "PC" })).toBe(
      "Salve, tenho interesse em Arma X do jogo ARC Raiders do servidor PC",
    );
    expect(consultMessage({ productName: "Arma X", gameName: "ARC Raiders", serverLabel: "  " })).toBe(
      "Salve, tenho interesse em Arma X do jogo ARC Raiders",
    );
  });

  it("link: só sobre a base wa.me montada, com o texto codificado", () => {
    expect(consultHref("https://wa.me/5511912345678", "A & B #1")).toBe(
      "https://wa.me/5511912345678?text=A%20%26%20B%20%231",
    );
    expect(consultHref(undefined, "x")).toBeUndefined();
    expect(consultHref("javascript:alert(1)", "x")).toBeUndefined();
    expect(consultHref("https://wa.me/5511912345678?text=oi", "x")).toBeUndefined();
  });
});
