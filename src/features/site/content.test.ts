import { beforeEach, describe, expect, it, vi } from "vitest";
import { publicApiGet } from "@/lib/publicApi";
import { getSectionItemsFor } from "./content";

vi.mock("@/lib/publicApi", () => ({
  publicApiGet: vi.fn(),
  // Absoluto só para o teste enxergar que passou por aqui.
  backendAsset: (path: string | null | undefined) => (path ? `https://api${path}` : null),
}));

const get = vi.mocked(publicApiGet);

beforeEach(() => vi.clearAllMocks());

describe("getSectionItemsFor — item ligado a um JOGO", () => {
  it("nome, link e (sem logo própria) a logo vêm do jogo, não da cópia do item", async () => {
    get.mockResolvedValue({
      "home:hero": [
        {
          id: "i1",
          title: "Nome velho",
          href: "/games/link-velho",
          imageUrl: "/uploads/c.webp",
          secondaryImageUrl: null,
          game: { name: "Diablo IV", slug: "diablo-iv", imageUrl: "/uploads/games/d.webp" },
        },
      ],
    });
    const [slide] = (await getSectionItemsFor("home"))("hero");
    expect(slide).toMatchObject({
      title: "Diablo IV",
      href: "/games/diablo-iv",
      secondaryImage: "https://api/uploads/games/d.webp",
    });
  });

  it("logo própria do slide vence a do jogo", async () => {
    get.mockResolvedValue({
      "home:hero": [
        { id: "i1", secondaryImageUrl: "/uploads/l.webp", game: { name: "D", slug: "d", imageUrl: "/x.webp" } },
      ],
    });
    const [slide] = (await getSectionItemsFor("home"))("hero");
    expect(slide.secondaryImage).toBe("https://api/uploads/l.webp");
  });

  it("sem jogo, segue a cópia gravada no item (conteúdo antigo / outro banco)", async () => {
    get.mockResolvedValue({ "home:hero": [{ id: "i1", title: "ARC", href: "/games/arc", game: null }] });
    const [slide] = (await getSectionItemsFor("home"))("hero");
    expect(slide).toMatchObject({ title: "ARC", href: "/games/arc" });
  });
});
