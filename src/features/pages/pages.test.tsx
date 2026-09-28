import { describe, expect, it } from "vitest";
import { BLOCKS, LIBRARY_TYPES, blockTitle, createBlock, newBlockId } from "./catalog";
import { composeBlocks, legacyNodesFrom } from "./compose";
import { defaultHomeBlocks } from "./defaults";
import { resolveHref } from "./blocks/shared";
import { isEditorMessage, isPreviewMessage } from "./editor/protocol";
import { EMPTY_REFS, type Block, type PageRefs } from "./types";

const refs: PageRefs = {
  games: { g1: { id: "g1", name: "Diablo", slug: "diablo", imageUrl: null } },
  products: {},
};

describe("catálogo de blocos", () => {
  it("id no formato que o backend aceita", () => {
    for (let i = 0; i < 50; i++) expect(newBlockId()).toMatch(/^[A-Za-z0-9_-]{6,40}$/);
  });

  it("todo tipo da biblioteca nasce com as props padrão e id próprio", () => {
    const ids = new Set<string>();
    for (const type of LIBRARY_TYPES) {
      const block = createBlock(type);
      expect(block.type).toBe(type);
      expect(block.props).toEqual(expect.objectContaining({}));
      ids.add(block.id);
    }
    expect(ids.size).toBe(LIBRARY_TYPES.length);
  });

  it("defaults() devolve objetos NOVOS (editar um bloco não altera o próximo)", () => {
    const a = BLOCKS.faq.defaults();
    const b = BLOCKS.faq.defaults();
    expect(a).not.toBe(b);
    expect(a.items[0].id).not.toBe(b.items[0].id);
  });

  it("rótulo da lista usa o título quando há", () => {
    expect(blockTitle(createBlock("hero", { title: "Promo", align: "left" }))).toBe("Destaque — Promo");
    expect(blockTitle(createBlock("secao", { key: "reviews" }))).toBe("Reviews");
  });
});

describe("resolveHref", () => {
  it("jogo resolve pelo slug atual; jogo sumido = sem link", () => {
    expect(resolveHref({ kind: "game", gameId: "g1" }, refs)).toBe("/games/diablo");
    expect(resolveHref({ kind: "game", gameId: "nope" }, refs)).toBeNull();
  });

  it("externo só com https — javascript:/http: viram null", () => {
    expect(resolveHref({ kind: "url", url: "https://x.com" }, refs)).toBe("https://x.com");
    expect(resolveHref({ kind: "url", url: "javascript:alert(1)" }, refs)).toBeNull();
    expect(resolveHref({ kind: "url", url: "http://x.com" }, refs)).toBeNull();
  });

  it("caminho interno passa como está", () => {
    expect(resolveHref({ kind: "path", path: "/venda" }, refs)).toBe("/venda");
  });
});

describe("composeBlocks", () => {
  const legacy = legacyNodesFrom([
    { key: "hero", gap: 0, node: "HERO" },
    { key: "reviews", gap: 150, node: "REVIEWS" },
  ]);

  const blocks: Block[] = [
    { id: "b1", type: "secao", props: { key: "hero" } },
    { id: "b2", type: "faq", spacing: "lg", props: { items: [{ id: "q1aaaa", question: "P", answer: "R" }] } },
    { id: "b3", type: "secao", props: { key: "reviews" } },
    { id: "b4", type: "secao", hidden: true, props: { key: "video" } },
    { id: "b5", type: "secao", props: { key: "equipe" } }, // sem nó nesta coluna
  ];

  it("ordem da lista, escondido e seção sem nó ficam de fora", () => {
    const out = composeBlocks(blocks, EMPTY_REFS, legacy, { mobile: false });
    expect(out.map((item) => item.key)).toEqual(["b1", "b2", "b3"]);
  });

  it("seção do desenho usa o VÃO dela; bloco novo usa o espaçamento (60% no celular)", () => {
    const desktop = composeBlocks(blocks, EMPTY_REFS, legacy, { mobile: false });
    const mobile = composeBlocks(blocks, EMPTY_REFS, legacy, { mobile: true });
    expect(desktop[2].gap).toBe(150);
    expect(desktop[1].gap).toBe(140);
    expect(mobile[1].gap).toBe(84);
  });
});

describe("defaultHomeBlocks", () => {
  it("vira a home de hoje: visíveis na ordem, escondidos no fim como ocultos, nada repetido", () => {
    const blocks = defaultHomeBlocks({ visible: ["reviews", "hero", "xyz"], hidden: ["video"] });
    const keys = blocks.map((block) => (block.type === "secao" ? block.props.key : "?"));
    expect(keys.slice(0, 2)).toEqual(["reviews", "hero"]);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).not.toContain("xyz");
    const video = blocks.find((block) => block.type === "secao" && block.props.key === "video");
    expect(video?.hidden).toBe(true);
    // Sessão que o layout não cita entra visível (aqui: navegacao, equipe, guias, faq).
    expect(blocks.filter((block) => !block.hidden)).toHaveLength(6);
  });
});

describe("protocolo do iframe", () => {
  it("só aceita mensagens com o `source` certo", () => {
    expect(isEditorMessage({ source: "l4t-editor", type: "render", blocks: [], refs: EMPTY_REFS, selectedId: null })).toBe(true);
    expect(isEditorMessage({ source: "outra", type: "render", blocks: [] })).toBe(false);
    expect(isEditorMessage({ source: "l4t-editor", type: "render", blocks: "x" })).toBe(false);
    expect(isPreviewMessage({ source: "l4t-preview", type: "ready" })).toBe(true);
    expect(isPreviewMessage("l4t-preview")).toBe(false);
  });
});

describe("markdown restrito (Texto formatado)", async () => {
  const { parseBlocks, safeHref, renderInline } = await import("./blocks/markdown");

  it("títulos, parágrafos e listas", () => {
    const blocks = parseBlocks("## Título\n\nlinha 1\nlinha 2\n\n- a\n- b\n\n1. um\n2. dois\n### Sub");
    expect(blocks).toEqual([
      { kind: "h2", text: "Título" },
      { kind: "p", text: "linha 1 linha 2" },
      { kind: "ul", items: ["a", "b"] },
      { kind: "ol", items: ["um", "dois"] },
      { kind: "h3", text: "Sub" },
    ]);
  });

  it("HTML cru sai como TEXTO (nenhuma tag é interpretada)", () => {
    const [block] = parseBlocks("<script>alert(1)</script>");
    expect(block).toEqual({ kind: "p", text: "<script>alert(1)</script>" });
    expect(renderInline("<img src=x onerror=alert(1)>")).toEqual(["<img src=x onerror=alert(1)>"]);
  });

  it("só https ou caminho interno viram link", () => {
    expect(safeHref("https://site.com/a")).toBe("https://site.com/a");
    expect(safeHref("/venda?x=1")).toBe("/venda?x=1");
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("//evil.com")).toBeNull();
    expect(safeHref("http://site.com")).toBeNull();
  });

  it("link proibido vira só o rótulo, sem href", () => {
    const [node] = renderInline("[clique](javascript:alert(1))").filter(Boolean) as React.ReactElement<{ href?: string; children: string }>[];
    expect(node.props.href).toBeUndefined();
    expect(node.props.children).toBe("clique");
  });
});

describe("catálogo — fase 2", () => {
  it("os 11 tipos da biblioteca têm definição e nascem com id", () => {
    expect(LIBRARY_TYPES).toHaveLength(11);
    for (const type of LIBRARY_TYPES) expect(createBlock(type).id).toMatch(/^[A-Za-z0-9_-]{6,40}$/);
  });

  it("listas nascem dentro dos limites declarados", () => {
    for (const type of LIBRARY_TYPES) {
      for (const field of BLOCKS[type].fields) {
        if (field.kind !== "items") continue;
        const items = (BLOCKS[type].defaults() as Record<string, unknown>)[field.name] as unknown[];
        expect(items.length).toBeGreaterThanOrEqual(field.min);
        expect(items.length).toBeLessThanOrEqual(field.max);
        expect(field.newItem().id).toMatch(/^[A-Za-z0-9_-]{6,40}$/);
      }
    }
  });

  it("composição desenha os tipos novos (e ignora tipo desconhecido)", () => {
    const blocks = [createBlock("stats"), createBlock("cta"), { id: "zzzzzz", type: "futuro", props: {} } as unknown as Block];
    const out = composeBlocks(blocks, EMPTY_REFS, {}, { mobile: false });
    expect(out).toHaveLength(3);
  });
});

describe("fase 4 — várias páginas", async () => {
  const { builderPage, gamePageDef, GAME_LEGACY_GAP, STATIC_PAGES } = await import("./registry");
  const { defaultBlocksFor } = await import("./defaults");
  const games = [{ id: "g1", name: "Diablo", slug: "diablo" }];

  it("resolve páginas fixas, de jogo (pelo ID) e recusa o resto", () => {
    expect(builderPage("venda", games)?.kind).toBe("blocks");
    expect(builderPage("layout", games)?.kind).toBe("content");
    const game = builderPage("jogo-g1", games);
    expect(game).toMatchObject({ kind: "blocks", frame: "game", href: "/games/diablo" });
    expect(builderPage("jogo-nao-existe", games)).toBeNull();
    expect(builderPage("../admin", games)).toBeNull();
  });

  it("slugs das páginas fixas batem com a allowlist do backend", () => {
    expect(STATIC_PAGES.filter((page) => page.kind === "blocks").map((page) => page.slug)).toEqual([
      "home",
      "venda",
      "fidelidade",
    ]);
    expect(gamePageDef(games[0]).slug).toBe("jogo-g1");
  });

  it("rascunho padrão genérico: visíveis na ordem pedida, o resto visível no fim, escondidos ocultos", () => {
    const blocks = defaultBlocksFor(["a", "b", "c", "d"], { visible: ["c", "a"], hidden: ["d"] });
    expect(blocks.map((block) => (block.type === "secao" ? `${block.props.key}${block.hidden ? "*" : ""}` : "?"))).toEqual([
      "c",
      "a",
      "b",
      "d*",
    ]);
  });

  it("página de jogo: vão do arquivo só quando a anterior é a vizinha original", () => {
    const legacy = legacyNodesFrom([
      { key: "servers", gap: 50, node: "S" },
      { key: "categories", gap: 50, node: "C" },
    ]);
    const direct = composeBlocks(
      [
        { id: "b1", type: "secao", props: { key: "servers" } },
        { id: "b2", type: "secao", props: { key: "categories" } },
      ],
      EMPTY_REFS,
      legacy,
      { legacyGap: GAME_LEGACY_GAP },
    );
    const afterNew = composeBlocks(
      [
        { id: "b1", type: "secao", props: { key: "servers" } },
        createBlock("stats"),
        { id: "b2", type: "secao", props: { key: "categories" } },
      ],
      EMPTY_REFS,
      legacy,
      { legacyGap: GAME_LEGACY_GAP },
    );
    expect(direct[1].gap).toBe(GAME_LEGACY_GAP("servers", "categories"));
    expect(afterNew[2].gap).toBe(GAME_LEGACY_GAP(null, "categories"));
  });
});
