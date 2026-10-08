import { describe, expect, it } from "vitest";
import { toGameDescription } from "./description";

describe("toGameDescription", () => {
  it("apara, descarta par e bloco vazios e ignora formato estranho", () => {
    expect(
      toGameDescription([
        {
          title: " Sobre ",
          items: [
            { subtitle: " O que é? ", text: " Oi " },
            { subtitle: " ", text: "" },
            "lixo",
            { subtitle: 3, text: "Só texto" },
          ],
        },
        { title: "Só título", items: "não é lista" },
        { title: " ", items: [] },
        null,
      ]),
    ).toEqual([
      {
        title: "Sobre",
        items: [
          { subtitle: "O que é?", text: "Oi" },
          { subtitle: "", text: "Só texto" },
        ],
      },
      { title: "Só título", items: [] },
    ]);
  });

  it("sem bloco aproveitável não há descrição", () => {
    expect(toGameDescription([])).toBeUndefined();
    expect(toGameDescription(null)).toBeUndefined();
    expect(toGameDescription({ title: "a", items: [] })).toBeUndefined();
  });

  it("corta nos tetos de blocos e de pares por bloco", () => {
    const items = Array.from({ length: 60 }, (_, i) => ({ subtitle: `S${i}`, text: "t" }));
    const groups = Array.from({ length: 40 }, (_, i) => ({ title: `T${i}`, items }));
    const result = toGameDescription(groups);
    expect(result).toHaveLength(30);
    expect(result?.[0].items).toHaveLength(50);
  });
});
