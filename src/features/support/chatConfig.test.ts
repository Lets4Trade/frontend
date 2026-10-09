import { describe, expect, it } from "vitest";
import { CHAT_DEFAULTS, chatConfig } from "./chatConfig";

const section = (extras: Record<string, string> = {}, base: Partial<{ title: string; subtitle: string; imageUrl: string }> = {}) => ({
  title: base.title ?? "",
  subtitle: base.subtitle ?? "",
  imageUrl: base.imageUrl,
  extra: (name: string, fallback: string) => extras[name] || fallback,
});

describe("chatConfig", () => {
  it("sem nada no painel: direita, online, balão visível e textos padrão", () => {
    expect(chatConfig(section())).toEqual({
      iconUrl: undefined,
      title: CHAT_DEFAULTS.title,
      text: CHAT_DEFAULTS.text,
      side: "right",
      online: true,
      showBalloon: true,
      offlineText: CHAT_DEFAULTS.offline,
    });
  });

  it("usa o que o admin escolheu", () => {
    const config = chatConfig(
      section(
        { lado: "esquerda", status: "offline", balao: "esconder", offline: "Volte às 9h" },
        { title: "Oi!", subtitle: "Bora conversar", imageUrl: "https://cdn/x.webp" },
      ),
    );
    expect(config).toEqual({
      iconUrl: "https://cdn/x.webp",
      title: "Oi!",
      text: "Bora conversar",
      side: "left",
      online: false,
      showBalloon: false,
      offlineText: "Volte às 9h",
    });
  });

  it("valor estranho no banco cai no padrão (nunca num estado quebrado)", () => {
    const config = chatConfig(section({ lado: "cima", status: "talvez", balao: "???" }));
    expect([config.side, config.online, config.showBalloon]).toEqual(["right", true, true]);
  });
});
