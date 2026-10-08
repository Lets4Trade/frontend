import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GameFaqSection } from "./GameSections";
import type { FaqGroup } from "./types";

const orbs: FaqGroup = {
  id: "duvidas-orbs",
  title: "Dúvidas sobre Orbs",
  items: [{ id: "o1", question: "O que é Orb?", answer: "Uma moeda." }],
};
const general: FaqGroup = {
  id: "duvidas",
  title: "Dúvidas frequentes",
  items: [{ id: "g1", question: "Quanto tempo?", answer: "Minutos." }],
};

const headings = () =>
  screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);

describe("GameFaqSection", () => {
  it("os blocos da descrição tomam o lugar do grupo Dúvidas frequentes, na ordem", () => {
    render(
      <GameFaqSection
        groups={[orbs, general]}
        description={[
          { title: "Sobre o PoE 2", items: [{ subtitle: "O que é o jogo?", text: "Linha 1\nLinha 2" }] },
          { title: "Entrega", items: [{ subtitle: "Quanto demora?", text: "Minutos." }] },
        ]}
      />,
    );
    expect(headings()).toEqual(["Dúvidas sobre Orbs", "Sobre o PoE 2", "Entrega"]);
    expect(screen.getByText("O que é o jogo?").tagName).toBe("DT");
    expect(screen.getByText(/Linha 1/).closest("dd")).not.toBeNull();
    // O grupo padrão sai inteiro, não só o título.
    expect(screen.queryByText("Quanto tempo?")).toBeNull();
  });

  it("bloco sem título é só a lista; sem subtítulo, é só parágrafo", () => {
    render(
      <GameFaqSection
        groups={[{ ...general, items: [] }]}
        description={[{ title: "", items: [{ subtitle: "", text: "Sobre o jogo" }] }]}
      />,
    );
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByText("Sobre o jogo").closest("dd")).not.toBeNull();
    expect(document.querySelector("dt")).toBeNull();
  });

  it("texto da descrição aceita negrito, link e lista, sem desenhar HTML cru", () => {
    const { container } = render(
      <GameFaqSection
        groups={[general]}
        description={[
          {
            title: "Sobre",
            items: [
              {
                subtitle: "Como comprar?",
                text: "Leia **com atenção** o [blog](/noticias).\n\n- passo um\n- passo dois\n\n<script>x</script> [ruim](javascript:alert(1))",
              },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByText("com atenção").tagName).toBe("STRONG");
    expect(screen.getByRole("link", { name: "blog" }).getAttribute("href")).toBe("/noticias");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(container.querySelector("script")).toBeNull();
    // Esquema perigoso vira só o rótulo, sem link.
    expect(screen.queryByRole("link", { name: "ruim" })).toBeNull();
  });

  it("as Dúvidas padrão continuam texto puro", () => {
    render(
      <GameFaqSection
        groups={[{ ...general, items: [{ id: "g1", question: "P?", answer: "**literal**" }] }]}
      />,
    );
    expect(screen.getByText("**literal**")).toBeTruthy();
  });

  it("sem descrição mostra as Dúvidas padrão; sem nada, some", () => {
    const { rerender, container } = render(<GameFaqSection groups={[general]} />);
    expect(screen.getByText("Quanto tempo?")).toBeTruthy();

    rerender(<GameFaqSection groups={[{ ...general, items: [] }]} />);
    expect(container.firstChild).toBeNull();
  });
});
