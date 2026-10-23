import { describe, expect, it } from "vitest";
import { OUTROS, PLATAFORMAS, SERVIDORES, TIPOS_PRODUTO, createSellSchema, sellGameOptions } from "./schema";

const valid = {
  plataforma: "steam",
  servidor: "sa",
  tipoProduto: "gold",
  discord: "fulano",
  whatsapp: "(11) 91234-5678",
  descricao: "Tenho 10k de gold para vender",
};

/** Os jogos da loja, como o menu de jogos entrega (2026-10-23). */
const GAMES = [
  { slug: "path-of-exile-2", name: "Path of Exile 2", image: "https://api.lets4trade.com.br/uploads/games/poe2.webp" },
  { slug: "diablo-4", name: "Diablo IV", image: null },
];

describe("sellGameOptions", () => {
  it("em /venda: os jogos da loja com o logo, Outros no fim, nada escolhido", () => {
    expect(sellGameOptions(GAMES)).toEqual({
      options: [
        { value: "path-of-exile-2", label: "Path of Exile 2", image: GAMES[0].image },
        { value: "diablo-4", label: "Diablo IV", image: null },
        { ...OUTROS, image: null },
      ],
    });
  });

  it("na página do jogo: ele vem escolhido", () => {
    expect(sellGameOptions(GAMES, { slug: "diablo-4", name: "Diablo IV" }).defaultValue).toBe("diablo-4");
  });

  it("jogo da página fora da lista (cache atrasado) entra no topo, com o slug como valor", () => {
    const result = sellGameOptions(GAMES, { slug: "arc-raiders", name: "ARC Raiders" });
    expect(result.defaultValue).toBe("arc-raiders");
    expect(result.options[0]).toEqual({ value: "arc-raiders", label: "ARC Raiders", image: null });
  });
});

describe("createSellSchema", () => {
  it("aceita jogo da lista e continua recusando valor livre", () => {
    const schema = createSellSchema(sellGameOptions(GAMES).options);
    expect(schema.safeParse({ ...valid, jogo: "diablo-4" }).success).toBe(true);
    expect(schema.safeParse({ ...valid, jogo: "inventado" }).success).toBe(false);
  });
});

describe("opção Outros", () => {
  it("todo select termina com Outros", () => {
    for (const list of [PLATAFORMAS, SERVIDORES, TIPOS_PRODUTO]) expect(list.at(-1)).toEqual(OUTROS);
    expect(sellGameOptions(GAMES).options.at(-1)?.value).toBe("outros");
  });

  it("continua no fim quando o jogo da página entra no topo", () => {
    const { options } = sellGameOptions(GAMES, { slug: "arc-raiders", name: "ARC Raiders" });
    expect(options.at(-1)?.value).toBe("outros");
  });

  it("é aceito em todos os campos", () => {
    const outros = { ...valid, jogo: "outros", plataforma: "outros", servidor: "outros", tipoProduto: "outros" };
    expect(createSellSchema().safeParse(outros).success).toBe(true);
  });
});
