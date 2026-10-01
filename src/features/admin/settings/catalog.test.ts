import { describe, expect, it } from "vitest";
import { sitePage } from "@/features/site/sections";
import { SETTINGS_GROUPS, SETTINGS_PAGE, settingsHref, settingsNotices } from "./catalog";

describe("SETTINGS_GROUPS", () => {
  it("só aponta para sessões que existem no catálogo", () => {
    const layout = sitePage(SETTINGS_PAGE);
    const known = new Set(layout?.sections.map((section) => section.key));
    for (const group of SETTINGS_GROUPS) {
      for (const suffix of group.sections) expect(known.has(suffix), suffix).toBe(true);
    }
  });

  it("leva cada sessão de configuração ao cartão certo", () => {
    expect(settingsHref("contatos")).toBe("/admin/configuracoes#atendimento");
    expect(settingsHref("icone")).toBe("/admin/configuracoes#marca");
    expect(settingsHref("header-selo")).toBeNull();
  });
});

describe("settingsNotices", () => {
  it("avisa que o WhatsApp vazio esconde o botão", () => {
    const notices = settingsNotices([]);
    expect(notices.atendimento[0]).toMatchObject({ level: "warn" });
    expect(notices.atendimento[0].text).toContain("WhatsApp vazio");
  });

  it("avisa número inválido e aceita número válido", () => {
    expect(settingsNotices([{ key: "layout:contatos", title: "1234" }]).atendimento[0].text).toContain("inválido");
    const ok = settingsNotices([{ key: "layout:contatos", title: "+55 (19) 99216-7350", subtitle: "lets4trade" }]);
    expect(ok.atendimento).toEqual([]);
  });

  it("lista os dados da empresa que faltam numa frase só", () => {
    const notices = settingsNotices([{ key: "layout:footer-empresa", title: "50.109.140/0001-70" }]);
    expect(notices.empresa).toEqual([{ level: "info", text: "Sem telefone e e-mail: não aparecem no rodapé." }]);
  });

  it("aponta e-mail inválido", () => {
    const notices = settingsNotices([
      { key: "layout:footer-empresa", title: "1", subtitle: "+55 19 99216-7350", footnote: "nao-e-email" },
    ]);
    expect(notices.empresa).toEqual([{ level: "warn", text: "E-mail inválido: aparece sem link no rodapé." }]);
  });

  it("logo e ícone ausentes são só informação", () => {
    const notices = settingsNotices([{ key: "layout:marca", imageUrl: "https://cdn.lets4trade.com.br/logo.png" }]);
    expect(notices.marca).toEqual([{ level: "info", text: "Usando o ícone padrão na aba do navegador." }]);
  });
});

describe("sessões do layout", () => {
  it("cada uma tem UM lugar no painel: Cabeçalho, Rodapé ou Configurações", async () => {
    const { STATIC_PAGES } = await import("@/features/pages/registry");
    const { SETTINGS_SECTION_KEYS } = await import("./catalog");
    const owners = new Map<string, number>();
    for (const page of STATIC_PAGES) {
      if (page.kind !== "content" || page.catalogPage !== SETTINGS_PAGE) continue;
      for (const key of page.sectionKeys ?? []) owners.set(key, (owners.get(key) ?? 0) + 1);
    }
    for (const key of SETTINGS_SECTION_KEYS) owners.set(key, (owners.get(key) ?? 0) + 1);

    const all = sitePage(SETTINGS_PAGE)?.sections.map((section) => section.key) ?? [];
    expect(all.length).toBeGreaterThan(0);
    for (const key of all) expect(owners.get(key), key).toBe(1);
    expect([...owners.keys()].sort()).toEqual([...all].sort());
  });
});
