import { describe, expect, it } from "vitest";
import { parseDiscord, parseWhatsApp } from "./contacts";

/**
 * Os canais vêm de um campo do painel e viram `href` no checkout. O texto do
 * campo nunca pode chegar ao link como veio.
 */
describe("parseWhatsApp", () => {
  it("monta wa.me só com os dígitos, e mostra o que foi digitado", () => {
    expect(parseWhatsApp("+55 (11) 91234-5678")).toEqual({
      value: "+55 (11) 91234-5678",
      href: "https://wa.me/5511912345678",
    });
  });

  it("vazio não é canal", () => {
    expect(parseWhatsApp("   ")).toBeUndefined();
  });

  it("número com dígitos de menos ou demais aparece, mas não vira link quebrado", () => {
    expect(parseWhatsApp("1234")).toEqual({ value: "1234" });
    expect(parseWhatsApp("1234567890123456")).toEqual({ value: "1234567890123456" });
  });

  it("nunca repassa esquema do campo para o link", () => {
    const channel = parseWhatsApp("javascript:alert(5511912345678)");
    expect(channel?.href).toBe("https://wa.me/5511912345678");
  });
});

describe("parseDiscord", () => {
  it("convite do Discord vira link", () => {
    expect(parseDiscord("https://discord.gg/lets4trade")?.href).toBe(
      "https://discord.gg/lets4trade",
    );
    expect(parseDiscord("https://discord.com/invite/abc-123")?.href).toBe(
      "https://discord.com/invite/abc-123",
    );
  });

  it("usuário aparece como texto, sem link", () => {
    expect(parseDiscord("lets4trade")).toEqual({ value: "lets4trade" });
  });

  it.each([
    "http://discord.gg/lets4trade",
    "https://discord.gg.evil.example/x",
    "https://evil.example/discord.gg/x",
    "javascript:alert(1)",
    "https://discord.gg/lets4trade?next=https://evil.example",
  ])("não vira link: %s", (raw) => {
    expect(parseDiscord(raw)?.href).toBeUndefined();
  });
});
