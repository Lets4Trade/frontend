import { describe, expect, it } from "vitest";
import {
  NEW_TAB,
  applyTabOrder,
  centralHref,
  centralNavLinks,
  isGameFormDirty,
  legacyCentralHref,
  moveInList,
  parseCentralQuery,
  pickCentralTab,
} from "./central";
import type { GameTab } from "./tabs/types";

function tab(id: string): GameTab {
  return {
    id,
    slug: id,
    label: id,
    iconUrl: null,
    layout: "CATALOG",
    linkHref: null,
    content: null,
    position: 0,
    isActive: true,
    productCount: 0,
  };
}

describe("parseCentralQuery", () => {
  it("padrão = abas, sem aba nem servidor", () => {
    expect(parseCentralQuery({})).toEqual({ section: "abas", tabId: "", serverId: "" });
  });

  it("lê seção, aba e servidor válidos", () => {
    expect(parseCentralQuery({ secao: "visao-geral", aba: "t1", servidor: "s1" })).toEqual({
      section: "visao-geral",
      tabId: "t1",
      serverId: "s1",
    });
    expect(parseCentralQuery({ secao: ["pagina", "abas"] }).section).toBe("pagina");
    expect(parseCentralQuery({ aba: NEW_TAB }).tabId).toBe(NEW_TAB);
  });

  it("descarta o que não é seção ou id", () => {
    expect(parseCentralQuery({ secao: "admin", aba: "../x", servidor: "a b" })).toEqual({
      section: "abas",
      tabId: "",
      serverId: "",
    });
  });
});

describe("centralHref", () => {
  it("monta a seção, e aba/servidor só em abas", () => {
    expect(centralHref("g1")).toBe("/admin/jogos/g1?secao=abas");
    expect(centralHref("g1", { section: "abas", tabId: "t1", serverId: "s1" })).toBe(
      "/admin/jogos/g1?secao=abas&aba=t1&servidor=s1",
    );
    expect(centralHref("g1", { section: "visao-geral", tabId: "t1", serverId: "s1" })).toBe(
      "/admin/jogos/g1?secao=visao-geral",
    );
  });

  it("nova aba não carrega servidor; id inválido não entra", () => {
    expect(centralHref("g1", { tabId: NEW_TAB, serverId: "s1" })).toBe("/admin/jogos/g1?secao=abas&aba=nova");
    expect(centralHref("g1", { tabId: "../x" })).toBe("/admin/jogos/g1?secao=abas");
  });

  it("codifica o id do jogo no caminho", () => {
    expect(centralHref("a/b")).toBe("/admin/jogos/a%2Fb?secao=abas");
  });
});

describe("legacyCentralHref (rotas antigas)", () => {
  it("/editar → visão geral; /abas → abas", () => {
    expect(legacyCentralHref("g1", "editar")).toBe("/admin/jogos/g1?secao=visao-geral");
    expect(legacyCentralHref("g1", "abas")).toBe("/admin/jogos/g1?secao=abas");
  });

  it("/categorias leva aba e servidor; `todos` = sem servidor", () => {
    expect(legacyCentralHref("g1", "categorias", { aba: "t1", servidor: "s1" })).toBe(
      "/admin/jogos/g1?secao=abas&aba=t1&servidor=s1",
    );
    expect(legacyCentralHref("g1", "categorias", { aba: "t1", servidor: "todos" })).toBe(
      "/admin/jogos/g1?secao=abas&aba=t1",
    );
    expect(legacyCentralHref("g1", "categorias", { aba: "<x>" })).toBe("/admin/jogos/g1?secao=abas");
  });
});

describe("pickCentralTab", () => {
  it("a pedida se for do jogo; senão a primeira; sem abas, null", () => {
    const tabs = [tab("t1"), tab("t2")];
    expect(pickCentralTab(tabs, "t2")?.id).toBe("t2");
    expect(pickCentralTab(tabs, "outra")?.id).toBe("t1");
    expect(pickCentralTab([], "t1")).toBeNull();
  });
});

describe("ordem das abas em rascunho", () => {
  it("applyTabOrder: segue a ordem guardada, tira as que sumiram, põe as novas no fim", () => {
    const tabs = [tab("a"), tab("b"), tab("c")];
    expect(applyTabOrder(tabs, null).map((t) => t.id)).toEqual(["a", "b", "c"]);
    expect(applyTabOrder(tabs, ["c", "x", "a"]).map((t) => t.id)).toEqual(["c", "a", "b"]);
  });

  it("moveInList troca com o vizinho e ignora fora dos limites", () => {
    expect(moveInList(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(moveInList(["a", "b", "c"], 2, 1)).toEqual(["a", "b", "c"]);
    expect(moveInList(["a", "b", "c"], 0, -1)).toEqual(["a", "b", "c"]);
  });
});

describe("isGameFormDirty", () => {
  const saved = { name: "PoE", slug: "poe", servers: [{ id: "s1", label: "Standard" }, { id: "s2", label: "Liga" }] };
  const same = { name: "PoE", slug: "poe", servers: saved.servers, hasNewImage: false };

  it("igual ao salvo = nada a salvar (espaços nas pontas não contam)", () => {
    expect(isGameFormDirty(saved, same)).toBe(false);
    expect(isGameFormDirty(saved, { ...same, name: " PoE " })).toBe(false);
  });

  it("nome, link, imagem, servidor renomeado, movido ou novo = mudança", () => {
    expect(isGameFormDirty(saved, { ...same, name: "Path" })).toBe(true);
    expect(isGameFormDirty(saved, { ...same, slug: "path" })).toBe(true);
    expect(isGameFormDirty(saved, { ...same, hasNewImage: true })).toBe(true);
    expect(isGameFormDirty(saved, { ...same, servers: [saved.servers[0], { id: "s2", label: "Liga 2" }] })).toBe(true);
    expect(isGameFormDirty(saved, { ...same, servers: [saved.servers[1], saved.servers[0]] })).toBe(true);
    expect(isGameFormDirty(saved, { ...same, servers: [...saved.servers, { label: "" }] })).toBe(true);
  });
});

describe("centralNavLinks", () => {
  const game = { id: "g1", slug: "poe" };

  it("ADMIN: as três seções, ← Jogos e a loja", () => {
    const { sections, extras } = centralNavLinks(game, true);
    expect(sections.map((link) => link.href)).toEqual([
      "/admin/jogos/g1?secao=visao-geral",
      "/admin/jogos/g1?secao=abas",
      "/admin/jogos/g1?secao=pagina",
    ]);
    expect(extras.map((link) => link.href)).toEqual(["/admin/jogos", "/games/poe"]);
  });

  it("EDITOR: nenhum link para tela só-ADMIN", () => {
    const { sections, extras } = centralNavLinks(game, false);
    expect(sections).toEqual([]);
    const hrefs = extras.map((link) => link.href);
    expect(hrefs).toEqual(["/admin/builder", "/admin/paginas?pagina=jogo-g1", "/games/poe"]);
    expect(hrefs.some((href) => href.startsWith("/admin/jogos") || href.startsWith("/admin/produtos"))).toBe(false);
  });
});
