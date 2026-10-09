import { describe, expect, it } from "vitest";
import { GAME_SECTIONS } from "@/features/game/sections";
import { sitePage } from "@/features/site/sections";
import { gameSectionTarget } from "./gameSectionTarget";

describe("gameSectionTarget", () => {
  it("toda seção da página de jogo tem destino (nenhuma cai no Builder genérico)", () => {
    for (const section of GAME_SECTIONS) {
      expect(gameSectionTarget(section.key, "g1"), section.key).not.toBeNull();
    }
  });

  it("referências, notícias e dúvidas editam AQUI as sessões comuns que existem no catálogo", () => {
    const keys = new Set(sitePage("games")?.sections.map((section) => section.key));
    for (const key of ["references", "news"]) {
      const target = gameSectionTarget(key, "g1");
      expect(target?.kind, key).toBe("shared");
      if (target?.kind === "shared") for (const sectionKey of target.sectionKeys) expect(keys.has(sectionKey)).toBe(true);
    }
    const faq = gameSectionTarget("faq", "g1", "path-of-exile");
    if (faq?.kind !== "faq") throw new Error("faq");
    expect(keys.has(faq.orbsKey ?? "")).toBe(true);
  });

  it("banner vai direto à etapa do Builder; produtos às abas da Central", () => {
    expect(gameSectionTarget("banner", "g 1")).toEqual({
      kind: "links",
      links: [{ label: "Trocar banner", href: "/admin/builder/g%201?etapa=banner" }],
    });
    const catalog = gameSectionTarget("catalog", "g1");
    expect(catalog?.kind === "links" && catalog.links[0].href).toContain("/admin/jogos/g1");
  });

  it("Dúvidas = DESCRIÇÃO do jogo (sem as dúvidas comuns); Orbs só em PoE", () => {
    expect(gameSectionTarget("faq", "g1", "diablo")).toEqual({
      kind: "faq",
      descriptionHref: "/admin/builder/g1?etapa=descricao",
      orbsKey: null,
    });
    const poe = gameSectionTarget("faq", "g1", "path-of-exile-2");
    expect(poe?.kind === "faq" && poe.orbsKey).toBe("duvidas-orbs");
  });

  it("chave antiga \"description\" (ordens salvas antes de 2026-10-06) leva à etapa Descrição", () => {
    expect(gameSectionTarget("description", "g1")).toEqual({
      kind: "links",
      links: [{ label: "Descrição do jogo", href: "/admin/builder/g1?etapa=descricao" }],
    });
  });

  it("vídeo e reviews da home levam à Home", () => {
    expect(gameSectionTarget("homeVideo", "g1")).toEqual({ kind: "home", source: "video" });
    expect(gameSectionTarget("homeReviews", "g1")).toEqual({ kind: "home", source: "reviews" });
  });
});
