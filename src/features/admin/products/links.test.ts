import { describe, expect, it } from "vitest";
import type { AdminGame } from "@/features/admin/catalog";
import type { GameTab } from "@/features/admin/games/tabs/types";
import {
  EMPTY_PREFILL,
  editProductHref,
  newProductHref,
  parseProductPrefill,
  productsListHref,
  resolvePrefillTab,
  safeReturnPath,
} from "./links";

const games: AdminGame[] = [
  {
    id: "g1",
    slug: "poe",
    name: "Path of Exile",
    platforms: ["STEAM", "EPIC"],
    servers: [
      { id: "s1", label: "Standard" },
      { id: "s2", label: "Liga" },
    ],
    categories: [],
  },
  { id: "g2", slug: "wow", name: "WoW", platforms: ["BATTLE_NET"], servers: [], categories: [] },
];

function tab(id: string, layout: GameTab["layout"]): GameTab {
  return {
    id,
    slug: id,
    label: id,
    iconUrl: null,
    layout,
    linkHref: null,
    content: null,
    position: 0,
    isActive: true,
    productCount: 0,
  };
}

describe("parseProductPrefill", () => {
  it("aceita jogo, servidor, plataforma e aba válidos", () => {
    expect(
      parseProductPrefill({ jogo: "g1", aba: "t1", servidor: "s2", plataforma: "EPIC" }, games),
    ).toEqual({ gameId: "g1", tabId: "t1", serverId: "s2", platform: "EPIC" });
  });

  it("plataforma é conferida sem diferenciar maiúsculas", () => {
    expect(parseProductPrefill({ jogo: "g1", plataforma: "steam" }, games).platform).toBe("STEAM");
  });

  it("jogo inexistente ou ausente zera tudo — aba/servidor não valem sem jogo", () => {
    expect(parseProductPrefill({ jogo: "nope", aba: "t1", servidor: "s1" }, games)).toEqual(EMPTY_PREFILL);
    expect(parseProductPrefill({ aba: "t1", servidor: "s1", plataforma: "STEAM" }, games)).toEqual(EMPTY_PREFILL);
  });

  it("servidor e plataforma de OUTRO jogo caem, o resto fica", () => {
    expect(
      parseProductPrefill({ jogo: "g2", servidor: "s1", plataforma: "STEAM", aba: "t9" }, games),
    ).toEqual({ gameId: "g2", tabId: "t9", serverId: "", platform: "" });
  });

  it("aba com formato inválido (path traversal, vazio) cai", () => {
    expect(parseProductPrefill({ jogo: "g1", aba: "../x" }, games).tabId).toBe("");
    expect(parseProductPrefill({ jogo: "g1", aba: "" }, games).tabId).toBe("");
  });

  it("parâmetro repetido usa o primeiro", () => {
    expect(parseProductPrefill({ jogo: ["g1", "g2"], servidor: ["s1", "s2"] }, games)).toMatchObject({
      gameId: "g1",
      serverId: "s1",
    });
  });
});

describe("resolvePrefillTab", () => {
  const base = { gameId: "g1", tabId: "t1", serverId: "", platform: "" };

  it("mantém aba de produto do jogo", () => {
    expect(resolvePrefillTab(base, [tab("t1", "SERVICE")]).tabId).toBe("t1");
  });

  it("aba de outro jogo, LINK/SELL ou leitura falha → sem aba", () => {
    expect(resolvePrefillTab(base, [tab("t2", "CATALOG")]).tabId).toBe("");
    expect(resolvePrefillTab(base, [tab("t1", "LINK")]).tabId).toBe("");
    expect(resolvePrefillTab(base, [tab("t1", "SELL")]).tabId).toBe("");
    expect(resolvePrefillTab(base, null).tabId).toBe("");
  });
});

describe("newProductHref", () => {
  it("sem nada, o cadastro limpo", () => {
    expect(newProductHref()).toBe("/admin/produtos/novo");
  });

  it("monta a query com os nomes da listagem e codifica os valores", () => {
    expect(newProductHref({ gameId: "g1", tabId: "t 1", serverId: "s1", platform: "STEAM" })).toBe(
      "/admin/produtos/novo?jogo=g1&aba=t+1&servidor=s1&plataforma=STEAM",
    );
  });

  it("aba/servidor sem jogo ficam fora", () => {
    expect(newProductHref({ tabId: "t1", serverId: "s1" })).toBe("/admin/produtos/novo");
  });

  it("ida e volta: o link gerado é lido de volta igual", () => {
    const href = newProductHref({ gameId: "g1", tabId: "t1", serverId: "s1", platform: "EPIC" });
    const params = Object.fromEntries(new URL(href, "http://x").searchParams);
    expect(parseProductPrefill(params, games)).toEqual({
      gameId: "g1",
      tabId: "t1",
      serverId: "s1",
      platform: "EPIC",
    });
  });
});

describe("productsListHref", () => {
  it("usa os filtros reais da listagem (jogo, aba)", () => {
    expect(productsListHref({ gameId: "g1", tabId: "t1" })).toBe("/admin/produtos?jogo=g1&aba=t1");
    expect(productsListHref({ gameId: "g1" })).toBe("/admin/produtos?jogo=g1");
  });
});

describe("safeReturnPath (`?volta=`)", () => {
  it("aceita caminho do painel, com query", () => {
    expect(safeReturnPath("/admin/jogos/g1?secao=abas&aba=t1")).toBe("/admin/jogos/g1?secao=abas&aba=t1");
    expect(safeReturnPath(["/admin/produtos", "/x"])).toBe("/admin/produtos");
  });

  it.each([
    ["esquema", "https://golpe.com/admin/"],
    ["javascript:", "javascript:alert(1)"],
    ["esquema relativo", "//golpe.com/admin/"],
    ["// no meio", "/admin//golpe.com"],
    ["barra invertida", String.raw`/admin/\golpe.com`],
    ["barra invertida no começo", String.raw`/\golpe.com/admin/`],
    ["barra invertida dupla", String.raw`/admin/\\golpe.com`],
    ["fora do painel", "/conta"],
    ["só /admin", "/admin"],
    ["subir diretório", "/admin/../conta"],
    ["quebra de linha", `/admin/jogos${String.fromCharCode(10)}x`],
    ["tab", `/admin/${String.fromCharCode(9)}jogos`],
    ["DEL", `/admin/${String.fromCharCode(127)}`],
    ["vazio", ""],
    ["número", 42],
    ["undefined", undefined],
    ["comprido demais", `/admin/${"a".repeat(400)}`],
  ])("recusa %s", (_, value) => {
    expect(safeReturnPath(value)).toBeNull();
  });
});

describe("links com `volta`", () => {
  it("newProductHref leva o `volta` conferido", () => {
    expect(newProductHref({ gameId: "g1", tabId: "t1", returnTo: "/admin/jogos/g1?secao=abas" })).toBe(
      "/admin/produtos/novo?jogo=g1&aba=t1&volta=%2Fadmin%2Fjogos%2Fg1%3Fsecao%3Dabas",
    );
    expect(newProductHref({ gameId: "g1", returnTo: "https://golpe.com" })).toBe("/admin/produtos/novo?jogo=g1");
  });

  it("editProductHref", () => {
    expect(editProductHref("p1")).toBe("/admin/produtos/p1/editar");
    expect(editProductHref("p1", "/admin/jogos/g1")).toBe("/admin/produtos/p1/editar?volta=%2Fadmin%2Fjogos%2Fg1");
    expect(editProductHref("p1", "//golpe.com")).toBe("/admin/produtos/p1/editar");
  });
});
