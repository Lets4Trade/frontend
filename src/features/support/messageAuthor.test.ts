import { describe, expect, it } from "vitest";
import { startsStaffRun, toChatMessage, type ApiChatMessage } from "./types";

/** Rosto e nome de quem respondeu pela equipe (2026-10-23). */

const base: ApiChatMessage = {
  id: "m1",
  conversationId: "c1",
  author: "SUPORTE",
  authorName: " Ana ",
  authorAvatarUrl: "/uploads/avatars/discord-123456789012345678.webp?v=17",
  body: "Oi!",
  createdAt: "2026-10-23T15:00:00Z",
};

describe("toChatMessage — autor", () => {
  it("resposta da equipe traz nome e foto saneados", () => {
    expect(toChatMessage(base)).toMatchObject({
      from: "suporte",
      authorName: "Ana",
      authorAvatarUrl: "/uploads/avatars/discord-123456789012345678.webp?v=17",
    });
  });

  it("foto de fora do nosso backend é descartada; campos ausentes não viram string vazia", () => {
    const external = toChatMessage({ ...base, authorAvatarUrl: "https://cdn.discordapp.com/a.png" });
    expect(external.authorAvatarUrl).toBeUndefined();
    const bare = toChatMessage({ ...base, authorName: null, authorAvatarUrl: undefined });
    expect(bare).not.toHaveProperty("authorName");
    expect(bare).not.toHaveProperty("authorAvatarUrl");
  });

  it("mensagem do cliente nunca carrega autor da equipe", () => {
    const client = toChatMessage({ ...base, author: "CLIENTE" });
    expect(client).not.toHaveProperty("authorName");
    expect(client).not.toHaveProperty("authorAvatarUrl");
  });
});

describe("startsStaffRun", () => {
  const ana = toChatMessage(base);
  const ana2 = toChatMessage({ ...base, id: "m2" });
  const bia = toChatMessage({ ...base, id: "m3", authorName: "Bia", authorAvatarUrl: null });
  const client = toChatMessage({ ...base, id: "m4", author: "CLIENTE" });
  const nextDay = toChatMessage({ ...base, id: "m5", createdAt: "2026-10-24T15:00:00Z" });

  it("rosto só no começo de cada sequência do mesmo atendente", () => {
    expect(startsStaffRun(ana, undefined)).toBe(true);
    expect(startsStaffRun(ana2, ana)).toBe(false);
    expect(startsStaffRun(bia, ana2)).toBe(true);
    expect(startsStaffRun(ana, client)).toBe(true);
    expect(startsStaffRun(nextDay, ana)).toBe(true);
    expect(startsStaffRun(client, ana)).toBe(false);
  });
});
