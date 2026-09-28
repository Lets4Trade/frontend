// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { publicApiGet } from "@/lib/publicApi";
import { getBlogGames, getBlogList, getBlogPost, getGameNews, toBlogCard } from "./data";
import { BLOG_TAG } from "./format";

vi.mock("@/lib/publicApi", () => ({
  publicApiGet: vi.fn(),
  backendAsset: (path: string | null | undefined) => (path ? `http://api.test${path}` : null),
}));

const get = vi.mocked(publicApiGet);

const rawCard = {
  slug: "nova-liga",
  title: "Nova liga",
  excerpt: "Resumo",
  coverUrl: "/uploads/blog/a.webp",
  publishedAt: "2026-09-28T01:30:00.000Z",
  game: { slug: "path-of-exile-2", name: "Path of Exile 2", imageUrl: "/uploads/games/p.webp" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("toBlogCard", () => {
  it("mapeia o card com URLs absolutas, data dd/mm/aa em Brasília e href", () => {
    expect(toBlogCard(rawCard)).toEqual({
      slug: "nova-liga",
      title: "Nova liga",
      excerpt: "Resumo",
      cover: "http://api.test/uploads/blog/a.webp",
      publishedAt: "2026-09-28T01:30:00.000Z",
      // 01:30 UTC = 22:30 do dia 27 em Brasília.
      date: "27/09/26",
      game: { slug: "path-of-exile-2", name: "Path of Exile 2", logo: "http://api.test/uploads/games/p.webp" },
      href: "/noticias/nova-liga",
    });
  });

  it("campos ausentes (backend apaga nulos) viram vazio/null", () => {
    expect(toBlogCard({ slug: "a", title: "T" })).toMatchObject({
      excerpt: "",
      cover: null,
      date: "",
      game: null,
    });
  });

  it("descarta item sem título ou com slug fora do formato", () => {
    expect(toBlogCard({ slug: "a" })).toBeNull();
    expect(toBlogCard({ slug: "../x", title: "T" })).toBeNull();
    expect(toBlogCard(null)).toBeNull();
  });
});

describe("getBlogList", () => {
  it("monta a query do contrato, com cache curto e etiqueta", async () => {
    get.mockResolvedValue({ items: [rawCard, { bad: true }], total: 11, page: 2, limit: 10, pageCount: 2 });
    const list = await getBlogList({ game: "diablo-4", search: "liga", page: 2 });

    expect(get).toHaveBeenCalledWith("/blog?game=diablo-4&search=liga&page=2&limit=10", {
      revalidate: 60,
      tags: [BLOG_TAG],
    });
    // O item malformado some; o resto da lista fica.
    expect(list).toMatchObject({ total: 11, page: 2, pageCount: 2 });
    expect(list?.items.map((item) => item.slug)).toEqual(["nova-liga"]);
  });

  it("backend fora → null (a tela diz 'não carregou', não 'vazio')", async () => {
    get.mockResolvedValue(null);
    expect(await getBlogList({ game: "", search: "", page: 1 })).toBeNull();
  });
});

describe("getBlogPost", () => {
  it("slug inválido não vai à rede", async () => {
    expect(await getBlogPost("../../admin")).toBeNull();
    expect(get).not.toHaveBeenCalled();
  });

  it("404/rascunho/erro → null", async () => {
    get.mockResolvedValue(null);
    expect(await getBlogPost("nova-liga")).toBeNull();
  });

  it("matéria com corpo e até 3 relacionados, sem ela mesma", async () => {
    get.mockResolvedValue({
      ...rawCard,
      body: "## Oi",
      related: [rawCard, { ...rawCard, slug: "b" }, { ...rawCard, slug: "c" }, { ...rawCard, slug: "d" }, { ...rawCard, slug: "e" }],
    });
    const post = await getBlogPost("nova-liga");
    expect(post?.body).toBe("## Oi");
    expect(post?.related.map((item) => item.slug)).toEqual(["b", "c", "d"]);
  });
});

describe("getBlogGames / getGameNews", () => {
  it("jogos dos filtros; resposta inválida vira lista vazia", async () => {
    get.mockResolvedValueOnce([{ slug: "d4", name: "Diablo IV" }, { name: "sem slug" }]);
    expect(await getBlogGames()).toEqual([{ slug: "d4", name: "Diablo IV", logo: null }]);
    get.mockResolvedValueOnce({ oops: true });
    expect(await getBlogGames()).toEqual([]);
  });

  it("notícias do jogo: ?game=&limit=4; falha → []", async () => {
    get.mockResolvedValueOnce({ items: [rawCard] });
    expect((await getGameNews("path-of-exile-2")).length).toBe(1);
    expect(get).toHaveBeenLastCalledWith("/blog?game=path-of-exile-2&limit=4", expect.any(Object));

    get.mockResolvedValueOnce(null);
    expect(await getGameNews("path-of-exile-2")).toEqual([]);
  });
});
