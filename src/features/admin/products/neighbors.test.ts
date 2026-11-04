import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminProducts } from "./list";
import { getProductOrdering } from "./ordering";
import { getProductNeighbors } from "./neighbors";
import type { AdminProductPage } from "./catalog";

vi.mock("./list", () => ({ getAdminProducts: vi.fn() }));
vi.mock("./ordering", () => ({ getProductOrdering: vi.fn() }));

const list = vi.mocked(getAdminProducts);
const ordering = vi.mocked(getProductOrdering);

function page(n: number, ids: string[], pageCount = 3): AdminProductPage {
  return {
    items: ids.map((id) => ({ id, name: `Produto ${id}` })) as AdminProductPage["items"],
    total: pageCount * 2,
    page: n,
    limit: 2,
    pageCount,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("getProductNeighbors — listagem", () => {
  const back = "/admin/produtos?jogo=g1&categoria=c1&pagina=2";

  it("vizinhos na mesma página levam o volta da mesma página", async () => {
    list.mockResolvedValueOnce(page(2, ["a", "b", "c"]));
    const result = await getProductNeighbors("b", back, ["g1"]);
    expect(result).toMatchObject({ position: 4, total: 6 });
    expect(result?.prev?.id).toBe("a");
    expect(result?.next?.id).toBe("c");
    expect(decodeURIComponent(result!.next!.href)).toContain("volta=/admin/produtos?jogo=g1&categoria=c1&pagina=2");
    // A lista pedida à API é a mesma da tela (filtros e página).
    expect(list.mock.calls[0][0]).toMatchObject({ game: "g1", category: "c1", page: 2 });
    expect(list).toHaveBeenCalledTimes(1);
  });

  it("nas pontas da página, busca a página ao lado (e o volta aponta para ela)", async () => {
    list.mockImplementation(async (query) =>
      query.page === 2 ? page(2, ["a", "b"]) : query.page === 1 ? page(1, ["y", "z"]) : page(3, ["m", "n"]),
    );
    const first = await getProductNeighbors("a", back, ["g1"]);
    expect(first?.prev?.id).toBe("z");
    expect(decodeURIComponent(first!.prev!.href)).not.toContain("pagina=");
    const last = await getProductNeighbors("b", back, ["g1"]);
    expect(last?.next?.id).toBe("m");
    expect(decodeURIComponent(last!.next!.href)).toContain("pagina=3");
  });

  it("produto que não está mais na lista: sem setas", async () => {
    list.mockResolvedValueOnce(page(2, ["a", "b"]));
    expect(await getProductNeighbors("x", back, ["g1"])).toBeNull();
  });
});

describe("getProductNeighbors — Central e entradas inválidas", () => {
  it("Central: a aba na ordem da loja, só o servidor escolhido", async () => {
    ordering.mockResolvedValueOnce({
      ok: true,
      truncated: false,
      items: [
        { id: "a", name: "A", priceCents: 1, serverId: "s1", ordered: true },
        { id: "b", name: "B", priceCents: 1, serverId: "s2", ordered: true },
        { id: "c", name: "C", priceCents: 1, serverId: "s1", ordered: true },
      ],
    });
    const result = await getProductNeighbors("a", "/admin/jogos/g1?secao=abas&aba=t1&servidor=s1", ["g1"]);
    expect(ordering).toHaveBeenCalledWith("g1", "t1");
    expect(result).toMatchObject({ prev: null, position: 1, total: 2 });
    expect(result?.next?.id).toBe("c");
  });

  it.each([null, "", "https://golpe.com/admin/produtos", "/admin/pedidos", "/admin/jogos/g1?secao=abas"])(
    "volta %s: sem setas e sem chamar a API",
    async (back) => {
      expect(await getProductNeighbors("a", back, ["g1"])).toBeNull();
      expect(list).not.toHaveBeenCalled();
      expect(ordering).not.toHaveBeenCalled();
    },
  );
});
