import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { insertVideo, youtubeVideoUrl } from "@/features/admin/markdownFormat";
import { Markdown, parseBlocks } from "@/features/pages/blocks/markdown";
import { BlogAuthor } from "./BlogAuthor";
import { CoverGameLogo } from "./BlogCard";
import { toAuthor } from "./data";

/** Vídeo do YouTube no texto do blog (2026-11-09): link numa linha só vira player. */
describe("vídeo do YouTube no Markdown", () => {
  it("link sozinho na linha vira bloco de vídeo só com o ID", () => {
    const blocks = parseBlocks("Antes\n\nhttps://youtu.be/abc123DEF45\n\nDepois", { videos: true });
    expect(blocks).toEqual([
      { kind: "p", text: "Antes" },
      { kind: "video", id: "abc123DEF45" },
      { kind: "p", text: "Depois" },
    ]);
  });

  it("aceita watch, shorts e embed; recusa outro site e link no meio do texto", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=abc123DEF45",
      "https://youtube.com/shorts/abc123DEF45",
      "https://www.youtube-nocookie.com/embed/abc123DEF45",
    ]) {
      expect(parseBlocks(url, { videos: true })).toEqual([{ kind: "video", id: "abc123DEF45" }]);
    }
    expect(parseBlocks("https://vimeo.com/123", { videos: true })[0].kind).toBe("p");
    expect(parseBlocks("veja https://youtu.be/abc123DEF45 aqui", { videos: true })[0].kind).toBe("p");
  });

  it("desligado (descrição do jogo, construtor) o link continua texto", () => {
    expect(parseBlocks("https://youtu.be/abc123DEF45")[0].kind).toBe("p");
  });

  it("desenha a capa do player (sem iframe até o clique ou o consentimento)", () => {
    const { container } = render(<Markdown source={"https://youtu.be/abc123DEF45"} videos />);
    expect(screen.getByRole("button", { name: "Assistir: Vídeo do YouTube" })).toBeTruthy();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("editor: o botão normaliza o link e põe numa linha só dele", () => {
    expect(youtubeVideoUrl("https://youtu.be/abc123DEF45?t=10")).toEqual({
      url: "https://www.youtube.com/watch?v=abc123DEF45",
    });
    expect(youtubeVideoUrl("https://evil.com/watch?v=abc123DEF45")).toHaveProperty("error");
    const edit = insertVideo("Texto", 5, "https://www.youtube.com/watch?v=abc123DEF45");
    expect(edit.value).toBe("Texto\n\nhttps://www.youtube.com/watch?v=abc123DEF45\n");
  });
});

describe("autor da matéria", () => {
  it("lê nome, foto e cargo; foto e cargo podem faltar", () => {
    expect(toAuthor({ name: "Daniel Souza", avatarUrl: "/uploads/avatars/d.webp", title: "Especialista" })).toMatchObject({
      name: "Daniel Souza",
      title: "Especialista",
    });
    expect(toAuthor({ name: "Daniel" })).toMatchObject({ name: "Daniel", avatar: null, title: null });
    expect(toAuthor({ name: "  " })).toBeNull();
    expect(toAuthor(null)).toBeNull();
  });

  it("caixa: foto, nome e cargo; sem cargo, só o nome", () => {
    const { rerender } = render(<BlogAuthor author={{ name: "Daniel", avatar: null, title: "Especialista em Diablo" }} />);
    expect(screen.getByText("Daniel")).toBeTruthy();
    expect(screen.getByText("Especialista em Diablo")).toBeTruthy();
    rerender(<BlogAuthor author={{ name: "Daniel", avatar: null, title: null }} />);
    expect(screen.queryByText("Especialista em Diablo")).toBeNull();
  });
});

describe("logo do jogo na capa", () => {
  it("desenha a logo inteira (contain) no canto de cima", () => {
    const { container } = render(
      <div className="relative">
        <CoverGameLogo logo="/images/diablo.png" />
      </div>,
    );
    const img = container.querySelector("img");
    expect(img?.className).toContain("object-contain");
    expect(img?.className).toContain("object-left-top");
  });
});
