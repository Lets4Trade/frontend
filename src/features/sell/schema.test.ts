import { describe, expect, it } from "vitest";
import { JOGOS, OUTROS, PLATAFORMAS, SERVIDORES, TIPOS_PRODUTO, createSellSchema, sellGameOptions } from "./schema";

const valid = {
  plataforma: "steam",
  servidor: "sa",
  tipoProduto: "gold",
  discord: "fulano",
  whatsapp: "(11) 91234-5678",
  descricao: "Tenho 10k de gold para vender",
};

describe("sellGameOptions", () => {
  it("sem jogo: a lista de /venda, nada escolhido", () => {
    expect(sellGameOptions()).toEqual({ options: JOGOS });
  });

  it("jogo que já está na lista (pelo nome) escolhe a opção da lista", () => {
    expect(sellGameOptions({ slug: "path-of-exile-2", name: "Path of Exile 2" })).toEqual({
      options: JOGOS,
      defaultValue: "poe2",
    });
  });

  it("jogo fora da lista entra no topo, com o slug como valor", () => {
    const result = sellGameOptions({ slug: "diablo-4", name: "Diablo IV" });
    expect(result.defaultValue).toBe("diablo-4");
    expect(result.options[0]).toEqual({ value: "diablo-4", label: "Diablo IV" });
  });
});

describe("createSellSchema", () => {
  it("aceita o jogo da página e continua recusando valor livre", () => {
    const { options } = sellGameOptions({ slug: "diablo-4", name: "Diablo IV" });
    const schema = createSellSchema(options);
    expect(schema.safeParse({ ...valid, jogo: "diablo-4" }).success).toBe(true);
    expect(schema.safeParse({ ...valid, jogo: "inventado" }).success).toBe(false);
    // Sem o jogo da página, a lista padrão não o aceita.
    expect(createSellSchema().safeParse({ ...valid, jogo: "diablo-4" }).success).toBe(false);
  });
});

describe("opção Outros", () => {
  it("todo select termina com Outros", () => {
    for (const list of [JOGOS, PLATAFORMAS, SERVIDORES, TIPOS_PRODUTO]) expect(list.at(-1)).toEqual(OUTROS);
  });

  it("continua no fim quando o jogo da página entra no topo", () => {
    const { options } = sellGameOptions({ slug: "diablo-4", name: "Diablo IV" });
    expect(options.at(-1)).toEqual(OUTROS);
  });

  it("é aceito em todos os campos", () => {
    const outros = { ...valid, jogo: "outros", plataforma: "outros", servidor: "outros", tipoProduto: "outros" };
    expect(createSellSchema().safeParse(outros).success).toBe(true);
  });
});
