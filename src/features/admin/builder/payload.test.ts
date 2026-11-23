import { describe, expect, it } from "vitest";
import { cleanCategories, cleanServers, draftCategoriesToPayload } from "./payload";
import type { BuilderCategory } from "./types";

describe("draftCategoriesToPayload", () => {
  it("leva só id e label nos dois níveis — key e slug ficam na tela", () => {
    const draft: BuilderCategory[] = [
      {
        id: "c1",
        key: "c1",
        slug: "moedas",
        label: "Moedas",
        children: [
          { id: "s1", key: "s1", slug: "ouro", label: "Ouro" },
          { key: "tmp-1", label: "Prata" },
        ],
      },
      { key: "tmp-2", label: "Nova", children: [{ key: "tmp-3", label: "Filha nova" }] },
    ];

    expect(draftCategoriesToPayload(draft)).toEqual([
      {
        id: "c1",
        label: "Moedas",
        children: [
          { id: "s1", label: "Ouro" },
          { id: undefined, label: "Prata" },
        ],
      },
      { id: undefined, label: "Nova", children: [{ id: undefined, label: "Filha nova" }] },
    ]);
  });
});

describe("cleanCategories", () => {
  it("apara, descarta linhas em branco nos dois níveis e sempre manda children", () => {
    const result = cleanCategories([
      { id: "c1", label: " Moedas ", children: [{ id: "s1", label: " Ouro " }, { label: "  " }] },
      { label: "Itens" },
      { label: "   ", children: [{ label: "" }] },
    ]);
    expect(result).toEqual({
      ok: true,
      data: [
        { id: "c1", label: "Moedas", children: [{ id: "s1", label: "Ouro" }] },
        { id: undefined, label: "Itens", children: [] },
      ],
    });
  });

  it("recusa categoria sem nome com subcategoria preenchida (não some com as filhas)", () => {
    const result = cleanCategories([{ label: " ", children: [{ label: "Ouro" }] }]);
    expect(result).toMatchObject({ ok: false });
  });

  it("corta o terceiro nível e campos injetados", () => {
    const result = cleanCategories([
      {
        id: "c1",
        label: "A",
        slug: "hack",
        children: [{ id: "", label: "B", children: [{ label: "neto" }], parentId: "x" }],
      },
    ]);
    expect(result).toEqual({
      ok: true,
      data: [{ id: "c1", label: "A", children: [{ id: undefined, label: "B" }] }],
    });
  });

  it("lixo do cliente: não-lista é recusada; itens sem label e children inválido são ignorados", () => {
    expect(cleanCategories("x")).toMatchObject({ ok: false });
    expect(cleanCategories([null, 3, { label: 5 }, { label: "A", children: "x" }])).toEqual({
      ok: true,
      data: [{ id: undefined, label: "A", children: [] }],
    });
  });
});

describe("cleanServers (olho, 2026-11-22)", () => {
  it("só booleano de verdade viaja", () => {
    expect(
      cleanServers([
        { id: "a", label: "A", isHidden: true },
        { id: "b", label: "B", isHidden: "true" },
        { id: "c", label: "C", isHidden: false },
      ]),
    ).toEqual([
      { id: "a", label: "A", isHidden: true },
      { id: "b", label: "B" },
      { id: "c", label: "C", isHidden: false },
    ]);
  });
});

describe("cleanServers (plataforma, 2026-11-22)", () => {
  it("mantém só as três plataformas, null tira e ausente não viaja", () => {
    expect(
      cleanServers([
        { id: "a", label: " PC ", platform: "PC" },
        { id: "b", label: "Xbox", platform: null },
        { id: "c", label: "Std" },
        { label: "Nintendo", platform: "NINTENDO" },
        { label: "   ", platform: "PC" },
      ]),
    ).toEqual([
      { id: "a", label: "PC", platform: "PC" },
      { id: "b", label: "Xbox", platform: null },
      { id: "c", label: "Std" },
      { id: undefined, label: "Nintendo" },
    ]);
  });
});
