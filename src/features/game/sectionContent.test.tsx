import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { parseServiceContent } from "./storefrontTabs";
import { SectionContentView } from "./SectionContentView";
import { bodyImagesAllowed, parseSection } from "./sectionContent";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

const IMG = "/uploads/pages/abc_1-x.webp";

describe("parseSection — leitura saneada da API (2026-10-16)", () => {
  it("formato antigo continua igual", () => {
    expect(parseSection({ title: " T ", items: [" a ", "", 3] })).toEqual({ title: "T", items: ["a"] });
  });

  it("lê texto, marcador, cor e ícone; descarta o que não é do contrato", () => {
    expect(
      parseSection({ title: "", body: ` ## Oi\n- a\n![x](${IMG}) `, marker: "icon", markerIcon: IMG, markerColor: "green", extra: 1 }),
    ).toEqual({ title: "", items: [], body: `## Oi\n- a\n![x](${IMG})`, marker: "icon", markerIcon: IMG, markerColor: "green" });
    expect(parseSection({ title: "T", marker: "skull", markerColor: "red" })).toEqual({ title: "T", items: [] });
    // `dot` é o padrão: não é guardado.
    expect(parseSection({ title: "T", marker: "dot" })).toEqual({ title: "T", items: [] });
    // Ícone sem arte (ou arte de fora) = bolinha.
    expect(parseSection({ title: "T", marker: "icon" })).toEqual({ title: "T", items: [] });
    expect(parseSection({ title: "T", marker: "icon", markerIcon: "https://evil.com/i.png" })).toEqual({ title: "T", items: [] });
  });

  it("texto com imagem de fora é descartado inteiro; seção vazia some", () => {
    expect(parseSection({ title: "T", body: "![x](https://evil.com/p.gif)" })).toEqual({ title: "T", items: [] });
    expect(parseSection({ title: "", items: [], body: "  " })).toBeNull();
    expect(parseServiceContent({ sections: [{ title: "" }, { title: "A" }] })).toEqual({
      sections: [{ title: "A", items: [] }],
    });
  });

  it("bodyImagesAllowed confere TODAS as imagens", () => {
    expect(bodyImagesAllowed(`a ![x](${IMG}) b ![y](${IMG})`)).toBe(true);
    expect(bodyImagesAllowed(`![x](${IMG})\n![y](/uploads/pages/../../.env)`)).toBe(false);
    expect(bodyImagesAllowed("![x](javascript:alert(1))")).toBe(false);
    expect(bodyImagesAllowed("sem imagem")).toBe(true);
  });

  it("aceita link DIRETO do Imgur e nada parecido (2026-10-16)", () => {
    expect(bodyImagesAllowed("![x](https://i.imgur.com/AbC1234.png)")).toBe(true);
    expect(bodyImagesAllowed("![x](https://i.imgur.com/AbC1234.gif)")).toBe(true);
    for (const bad of [
      "http://i.imgur.com/AbC1234.png",
      "https://imgur.com/AbC1234",
      "https://i.imgur.com.evil.com/AbC1234.png",
      "https://evil.com/i.imgur.com/AbC1234.png",
      "https://i.imgur.com/AbC1234.svg",
      "https://i.imgur.com/a/AbC1234.png",
    ]) {
      expect(bodyImagesAllowed(`![x](${bad})`), bad).toBe(false);
    }
  });
});

describe("SectionContentView", () => {
  it("formato antigo: título e itens com a bolinha", () => {
    const { container } = render(<SectionContentView section={{ title: "Requisitos", items: ["Conta sem ban"] }} />);
    expect(screen.getByRole("heading", { name: "Requisitos" })).toBeInTheDocument();
    expect(container.querySelector("li")?.textContent).toBe("●Conta sem ban");
  });

  it("texto formatado: subtítulo, negrito, lista com o marcador e cor escolhidos, imagem do painel", () => {
    const { container } = render(
      <SectionContentView
        section={{
          title: "",
          items: [],
          body: `### Como funciona\n\nTexto **forte**\n\n- um\n- dois\n\n1. passo\n\n![Arte do pacote](${IMG})`,
          marker: "check",
          markerColor: "green",
        }}
      />,
    );
    expect(screen.getByText("Como funciona")).toBeInTheDocument();
    expect(screen.getByText("forte").tagName).toBe("STRONG");
    const bullets = container.querySelectorAll("ul li");
    expect([...bullets].map((li) => li.textContent)).toEqual(["✓um", "✓dois"]);
    expect(bullets[0].querySelector("span")?.className).toContain("text-brand-rating");
    // Lista numerada continua numerada.
    expect(container.querySelector("ol li")?.textContent).toBe("1.passo");
    const image = screen.getByRole("img", { name: "Arte do pacote" });
    expect(image.getAttribute("src")).toMatch(/\/uploads\/pages\/abc_1-x\.webp$/);
  });

  it("imagem de fora não vira <img>; marcador `none` some; ícone próprio vira imagem", () => {
    const { container, rerender } = render(
      <SectionContentView section={{ title: "T", items: [], body: "![x](https://evil.com/a.png)\n\n- item", marker: "none" }} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("li")?.textContent).toBe("item");

    rerender(<SectionContentView section={{ title: "T", items: ["a"], marker: "icon", markerIcon: IMG }} />);
    expect(container.querySelector("li img")?.getAttribute("src")).toMatch(/abc_1-x\.webp$/);
  });

  it("no painel do card, a bolinha sem cor escolhida segue laranja", () => {
    const { container } = render(<SectionContentView section={{ title: "T", items: ["a"] }} variant="popover" />);
    expect(container.querySelector("li span")?.className).toContain("text-brand-orange");
  });
});
