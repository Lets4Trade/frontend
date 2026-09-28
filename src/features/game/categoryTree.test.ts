import { describe, expect, it } from "vitest";
import { toCategoryTree } from "./categoryTree";

describe("toCategoryTree", () => {
  it("aceita raízes com children já montado e corta o terceiro nível", () => {
    const tree = toCategoryTree([
      {
        id: "c1",
        label: "A",
        parentId: null,
        children: [{ id: "s1", label: "B", parentId: "c1", children: [{ id: "n", label: "neto" }] }],
      },
    ]);
    expect(tree).toEqual([
      { id: "c1", label: "A", parentId: null, children: [{ id: "s1", label: "B", parentId: "c1" }] },
    ]);
  });

  it("aceita lista plana com parentId, sem duplicar a filha como raiz", () => {
    const tree = toCategoryTree([
      { id: "s1", label: "B", parentId: "c1" },
      { id: "c1", label: "A" },
    ]);
    expect(tree).toEqual([{ id: "c1", label: "A", children: [{ id: "s1", label: "B", parentId: "c1" }] }]);
  });
});
