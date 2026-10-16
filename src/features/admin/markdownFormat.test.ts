import { describe, expect, it } from "vitest";
import { applyFormat, imgurImageUrl, insertImage, toggleHeading } from "./markdownFormat";

describe("applyFormat", () => {
  it("negrito envolve a seleção e mantém o trecho selecionado", () => {
    const edit = applyFormat("compre gold aqui", 7, 11, "bold");
    expect(edit.value).toBe("compre **gold** aqui");
    expect(edit.value.slice(edit.selectionStart, edit.selectionEnd)).toBe("gold");
  });

  it("espaço nas pontas fica fora da marcação", () => {
    expect(applyFormat("a gold b", 1, 7, "italic").value).toBe("a *gold* b");
  });

  it("várias linhas: marca cada uma, com o marcador da lista do lado de fora", () => {
    const value = "intro\n- um\n\n- dois";
    expect(applyFormat(value, 0, value.length, "italic").value).toBe("*intro*\n- *um*\n\n- *dois*");
  });

  it("sem seleção insere texto de exemplo selecionado", () => {
    const edit = applyFormat("oi ", 3, 3, "bold");
    expect(edit.value).toBe("oi **negrito**");
    expect(edit.value.slice(edit.selectionStart, edit.selectionEnd)).toBe("negrito");
  });

  it("link usa a seleção como rótulo e o endereço dado", () => {
    expect(applyFormat("veja o blog", 7, 11, "link", "/blog").value).toBe(
      "veja o [blog](/blog)",
    );
  });

  it("listas pegam as linhas inteiras e trocam o marcador antigo", () => {
    expect(applyFormat("intro\num\ndois", 7, 10, "ul").value).toBe("intro\n- um\n- dois");
    expect(applyFormat("- um\n- dois", 0, 10, "ol").value).toBe("1. um\n2. dois");
  });
});

describe("toggleHeading e insertImage (2026-10-16)", () => {
  it("subtítulo marca a linha do cursor e desmarca no segundo clique", () => {
    const on = toggleHeading("intro\n- Como funciona\nfim", 8, 8);
    expect(on.value).toBe("intro\n### Como funciona\nfim");
    expect(toggleHeading(on.value, 8, 8).value).toBe("intro\nComo funciona\nfim");
  });

  it("imagem entra numa linha só dela, depois da linha do cursor", () => {
    const url = "/uploads/pages/a.webp";
    expect(insertImage("", 0, url).value).toBe(`![imagem](${url})\n`);
    expect(insertImage("um\ndois", 1, url).value).toBe(`um\n\n![imagem](${url})\n\ndois`);
    expect(insertImage("um\n\ndois", 1, url).value).toBe(`um\n\n![imagem](${url})\n\ndois`);
    const end = insertImage("texto", 5, url);
    expect(end.value).toBe(`texto\n\n![imagem](${url})\n`);
    expect(end.selectionStart).toBe(end.value.length);
    const middle = insertImage("um\ndois", 1, url);
    // Na linha em branco entre a imagem e o texto seguinte.
    expect(middle.value.slice(middle.selectionStart)).toBe("\ndois");
  });
});

describe("imgurImageUrl (2026-10-16)", () => {
  it("transforma o que o admin cola no link direto da imagem", () => {
    expect(imgurImageUrl("https://i.imgur.com/AbC1234.png")).toEqual({ url: "https://i.imgur.com/AbC1234.png" });
    expect(imgurImageUrl(" https://i.imgur.com/AbC1234.JPG?1 ")).toEqual({ url: "https://i.imgur.com/AbC1234.jpg" });
    expect(imgurImageUrl("https://imgur.com/AbC1234")).toEqual({ url: "https://i.imgur.com/AbC1234.png" });
    expect(imgurImageUrl("imgur.com/AbC1234")).toEqual({ url: "https://i.imgur.com/AbC1234.png" });
    expect(imgurImageUrl("https://i.imgur.com/AbC1234.gifv")).toEqual({ url: "https://i.imgur.com/AbC1234.gif" });
  });

  it("recusa álbum, outro site e esquema estranho", () => {
    expect(imgurImageUrl("https://imgur.com/a/AbC1234")).toHaveProperty("error", expect.stringMatching(/álbum/));
    expect(imgurImageUrl("https://imgur.com/gallery/AbC1234")).toHaveProperty("error");
    expect(imgurImageUrl("https://i.imgur.com.evil.com/AbC1234.png")).toHaveProperty("error");
    expect(imgurImageUrl("https://evil.com/AbC1234.png")).toHaveProperty("error");
    expect(imgurImageUrl("javascript:alert(1)")).toHaveProperty("error");
    expect(imgurImageUrl("https://i.imgur.com/AbC1234.svg")).toHaveProperty("error");
    expect(imgurImageUrl("")).toHaveProperty("error");
  });
});
