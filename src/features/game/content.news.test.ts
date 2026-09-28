// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { publicApiGet } from "@/lib/publicApi";
import { getSectionItemsFor, getSectionsFor } from "@/features/site/content";
import { getGamePage } from "./content";

vi.mock("@/lib/publicApi", () => ({
  publicApiGet: vi.fn(),
  backendAsset: (path: string | null | undefined) => (path ? `http://api.test${path}` : null),
}));
vi.mock("@/features/site/content", () => ({
  getSectionsFor: vi.fn(),
  getSectionItemsFor: vi.fn(),
}));

const get = vi.mocked(publicApiGet);

const game = {
  id: "g1",
  slug: "diablo-4",
  name: "Diablo IV",
  servers: [],
  categories: [],
  banners: [],
};

const blogPost = {
  slug: "temporada-nova",
  title: "Temporada nova",
  excerpt: "O que muda",
  coverUrl: "/uploads/blog/t.webp",
  publishedAt: "2026-09-20T15:00:00.000Z",
  game: { slug: "diablo-4", name: "Diablo IV" },
};

/** Responde por caminho, como o backend faria. */
function route(blog: unknown) {
  get.mockImplementation(async (path: string) => {
    if (path === "/games/diablo-4") return game as never;
    if (path.startsWith("/blog?")) {
      if (blog instanceof Error) throw blog;
      return blog as never;
    }
    return null;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSectionsFor).mockResolvedValue(() => ({ title: "" }) as never);
  vi.mocked(getSectionItemsFor).mockResolvedValue(() => []);
});

describe("getGamePage → seção NOTÍCIAS", () => {
  it("usa as notícias publicadas do blog para o jogo", async () => {
    route({ items: [blogPost] });
    const page = await getGamePage("diablo-4");

    expect(get).toHaveBeenCalledWith("/blog?game=diablo-4&limit=4", expect.objectContaining({ revalidate: 60 }));
    expect(page?.news.items).toEqual([
      {
        id: "blog:temporada-nova",
        title: "Temporada nova",
        excerpt: "O que muda",
        image: { src: "http://api.test/uploads/blog/t.webp", width: 400, height: 225, alt: "" },
        tag: "Diablo IV",
        date: "20/09/26",
        href: "/noticias/temporada-nova",
      },
    ]);
  });

  it("sem notícia no blog → itens editoriais de hoje", async () => {
    route({ items: [] });
    const page = await getGamePage("diablo-4");
    expect(page?.news.items.length).toBeGreaterThan(0);
    expect(page?.news.items.every((item) => !item.id.startsWith("blog:"))).toBe(true);
  });

  it("API do blog fora (null ou exceção) → editorial, e a página continua de pé", async () => {
    route(null);
    expect((await getGamePage("diablo-4"))?.news.items.some((item) => item.id.startsWith("blog:"))).toBe(false);

    route(new Error("boom"));
    const page = await getGamePage("diablo-4");
    expect(page?.name).toBe("Diablo IV");
    expect(page?.news.items.some((item) => item.id.startsWith("blog:"))).toBe(false);
  });
});
