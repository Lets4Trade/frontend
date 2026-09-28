import { describe, expect, it } from "vitest";
import { categorySelectOptions } from "./categoryOptions";

describe("categorySelectOptions", () => {
  it("achata na ordem da árvore: pai e logo depois as filhas, com o caminho no rótulo", () => {
    expect(
      categorySelectOptions([
        { id: "c1", label: "Moedas", parentId: null },
        { id: "c2", label: "Itens" },
        { id: "s1", label: "Ouro", parentId: "c1" },
        { id: "s2", label: "Rara", parentId: "c2" },
        { id: "s3", label: "Prata", parentId: "c1" },
      ]),
    ).toEqual([
      { value: "c1", label: "Moedas" },
      { value: "s1", label: "Moedas › Ouro" },
      { value: "s3", label: "Moedas › Prata" },
      { value: "c2", label: "Itens" },
      { value: "s2", label: "Itens › Rara" },
    ]);
  });

  it("resposta antiga (sem parentId) vira lista de categorias simples", () => {
    expect(categorySelectOptions([{ id: "a", label: "A" }, { id: "b", label: "B" }])).toEqual([
      { value: "a", label: "A" },
      { value: "b", label: "B" },
    ]);
  });

  it("filha órfã (pai fora da lista) aparece como categoria, não some", () => {
    expect(categorySelectOptions([{ id: "s1", label: "Ouro", parentId: "sumiu" }])).toEqual([
      { value: "s1", label: "Ouro" },
    ]);
  });

  it("lista vazia → sem opções", () => {
    expect(categorySelectOptions([])).toEqual([]);
  });
});
