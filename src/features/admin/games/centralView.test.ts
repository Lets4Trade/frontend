import { describe, expect, it } from "vitest";
import { categoriesOnStore, productGrid, storePageMap, tabWarnings } from "./centralView";

describe("tabWarnings", () => {
  const base = { isActive: true, layout: "CATALOG" as const, productCount: 3, linkHref: null, content: null };

  it("aba ativa e completa: nada a avisar", () => {
    expect(tabWarnings(base)).toEqual([]);
  });

  it("aba de produto ativa e vazia avisa; oculta não", () => {
    expect(tabWarnings({ ...base, productCount: 0 }).map((w) => w.code)).toEqual(["empty"]);
    expect(tabWarnings({ ...base, productCount: 0, isActive: false })).toEqual([]);
  });

  it("link sem endereço avisa (e não conta produto)", () => {
    expect(tabWarnings({ ...base, layout: "LINK", productCount: 0 }).map((w) => w.code)).toEqual(["no-link"]);
  });

  it("serviço sem textos avisa; com texto, não", () => {
    const service = { ...base, layout: "SERVICE" as const };
    expect(tabWarnings(service).map((w) => w.code)).toEqual(["no-text"]);
    expect(tabWarnings({ ...service, content: { sections: [{ title: "", items: [] }] } }).map((w) => w.code)).toEqual([
      "no-text",
    ]);
    expect(tabWarnings({ ...service, content: { sections: [{ title: "Como funciona", items: [] }] } })).toEqual([]);
  });

  it("Quantidade e Pacotes sem texto não avisam (texto é opcional ali)", () => {
    expect(tabWarnings({ ...base, layout: "QUANTITY" })).toEqual([]);
    expect(tabWarnings({ ...base, layout: "PACKAGES" })).toEqual([]);
  });
});

describe("productGrid", () => {
  const servers = [
    { id: "s1", label: "SC" },
    { id: "s2", label: "HC" },
  ];
  const item = (id: string, name: string, serverId: string | null, priceCents = 390) => ({
    id,
    name,
    serverId,
    serverLabel: null,
    priceCents,
  });

  it("uma linha por nome, uma coluna por servidor, na ordem da loja", () => {
    const grid = productGrid(
      [item("a", "100 Chaos", "s1"), item("b", "100 Divine", "s1", 2490), item("c", "100 Chaos", "s2")],
      servers,
    );
    expect(grid.columns).toEqual([
      { id: "s1", label: "SC" },
      { id: "s2", label: "HC" },
    ]);
    expect(grid.rows.map((row) => row.name)).toEqual(["100 Chaos", "100 Divine"]);
    expect(grid.rows[0].cells.map((cell) => cell.map((i) => i.id))).toEqual([["a"], ["c"]]);
    expect(grid.rows[1].cells.map((cell) => cell.map((i) => i.id))).toEqual([["b"], []]);
    expect(grid.rows[0].mixed).toBe(false);
  });

  it("marca preço diferente entre servidores", () => {
    const grid = productGrid([item("a", "X", "s1", 100), item("b", "X", "s2", 120)], servers);
    expect(grid.rows[0].mixed).toBe(true);
  });

  it("produto sem servidor ganha a coluna 'Sem servidor' só quando existe", () => {
    const grid = productGrid([item("a", "X", "s1"), item("b", "Y", null), item("c", "Z", "apagado")], servers);
    expect(grid.columns.at(-1)).toEqual({ id: null, label: "Sem servidor" });
    expect(grid.rows[1].cells[2].map((i) => i.id)).toEqual(["b"]);
    expect(grid.rows[2].cells[2].map((i) => i.id)).toEqual(["c"]);
  });

  it("jogo sem servidores: uma coluna 'Preço'", () => {
    const grid = productGrid([item("a", "X", null)], []);
    expect(grid.columns).toEqual([{ id: null, label: "Preço" }]);
    expect(grid.rows[0].cells).toEqual([[expect.objectContaining({ id: "a" })]]);
  });

  it("API antiga sem serverId casa pelo rótulo", () => {
    const legacy = [{ id: "a", name: "X", serverLabel: "HC", priceCents: 1 }];
    expect(productGrid(legacy, servers).rows[0].cells.map((cell) => cell.length)).toEqual([0, 1]);
  });
});

describe("storePageMap", () => {
  it("segue a ordem da loja e leva cada parte ao editor certo", () => {
    const map = storePageMap({ id: "g 1" });
    expect(map.map((part) => part.title)).toEqual([
      "Banner principal",
      "Logo, título e abas",
      "Selecionar servidor",
      "Selecionar categoria",
      "Lista de produtos",
      "Descrição",
      "Referências, notícias e dúvidas",
      "Ordem e blocos extras",
    ]);
    expect(map[0].links[0].href).toBe("/admin/builder/g%201?etapa=banner");
    expect(map[2].links[0].href).toContain("secao=visao-geral");
    // Nenhum nome interno de tela no que a pessoa lê.
    expect(JSON.stringify(map)).not.toMatch(/etapa \d|Builder/);
  });
});

describe("categoriesOnStore", () => {
  const global = [{ id: "g", label: "Orbs", children: [{ label: "Chaos" }] }];
  const tab = [{ id: "t", label: "Raras", slug: "raras", position: 0 }];

  it("sem servidor: globais + aba", () => {
    expect(categoriesOnStore({ global, tab, server: null })).toEqual([
      { origin: "global", items: [{ id: "g", label: "Orbs", children: ["Chaos"] }] },
      { origin: "tab", items: [{ id: "t", label: "Raras", children: [] }] },
    ]);
  });

  it("com servidor: soma o grupo do servidor; leitura falha vira lista vazia", () => {
    const groups = categoriesOnStore({ global, tab: null, server: [] });
    expect(groups.map((group) => [group.origin, group.items.length])).toEqual([
      ["global", 1],
      ["tab", 0],
      ["server", 0],
    ]);
  });
});
