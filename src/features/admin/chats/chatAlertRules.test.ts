import { describe, expect, it } from "vitest";
import { isClientMessage, isViewingConversation, previewOf, titleWithCount } from "./chatAlertRules";

describe("aviso de mensagem nova no painel", () => {
  it("só mensagem do CLIENTE avisa", () => {
    expect(isClientMessage({ author: "CLIENTE" })).toBe(true);
    expect(isClientMessage({ author: "SUPORTE" })).toBe(false);
    expect(isClientMessage({ author: "SISTEMA" })).toBe(false);
    expect(isClientMessage(null)).toBe(false);
  });

  it("olhando a conversa (aberta e com a aba à vista) não avisa", () => {
    const at = (pathname: string, search = "") => ({ pathname, search });
    expect(isViewingConversation("c1", at("/admin/chats", "?conversa=c1"), false)).toBe(true);
    // Aba em segundo plano, outra conversa, lista sem conversa ou outra tela: avisa.
    expect(isViewingConversation("c1", at("/admin/chats", "?conversa=c1"), true)).toBe(false);
    expect(isViewingConversation("c1", at("/admin/chats", "?conversa=c2"), false)).toBe(false);
    expect(isViewingConversation("c1", at("/admin/chats"), false)).toBe(false);
    expect(isViewingConversation("c1", at("/admin/pedidos", "?conversa=c1"), false)).toBe(false);
  });

  it("número no título da aba, sem acumular prefixo", () => {
    expect(titleWithCount("Chats — Painel", 2)).toBe("(2) Chats — Painel");
    expect(titleWithCount("(2) Chats — Painel", 3)).toBe("(3) Chats — Painel");
    expect(titleWithCount("(3) Chats — Painel", 0)).toBe("Chats — Painel");
    expect(titleWithCount("Painel", 150)).toBe("(99+) Painel");
    expect(titleWithCount("(99+) Painel", 1)).toBe("(1) Painel");
  });

  it("prévia numa linha e curta", () => {
    expect(previewOf("oi\n\n  tudo bem?")).toBe("oi tudo bem?");
    expect(previewOf("x".repeat(100), 10)).toBe("xxxxxxxxx…");
  });
});
