import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryPanel } from "./CatalogFilters";
import type { CatalogQuery } from "./catalog";
import type { GameCategory, GamePage } from "./types";

const items: GameCategory[] = [
  {
    id: "orbs",
    label: "Orbs",
    parentId: null,
    serverSlug: null,
    tabSlug: null,
    children: [
      { id: "divine", label: "Divine", parentId: "orbs", serverSlug: null, tabSlug: null, children: [] },
      { id: "chaos", label: "Chaos", parentId: "orbs", serverSlug: null, tabSlug: null, children: [] },
    ],
  },
  { id: "itens", label: "Itens", parentId: null, serverSlug: null, tabSlug: null, children: [] },
] as GameCategory[];

const page = {
  slug: "poe2",
  servers: { label: "Servidor", items: [{ slug: "sc", label: "SC" }] },
  categories: { label: "Selecionar categoria", items },
} as unknown as GamePage;

const query = (categories: string[]): CatalogQuery => ({
  tab: "moedas",
  server: "sc",
  categories,
  sort: null,
  search: "",
  page: 1,
});

describe("CategoryPanel", () => {
  it("sem escolha: só o quadro das categorias, nenhuma marcada", () => {
    render(<CategoryPanel page={page} query={query([])} />);
    expect(screen.getAllByRole("radiogroup")).toHaveLength(1);
    expect(screen.queryByRole("radio", { checked: true })).toBeNull();
    // Escolher leva a UMA categoria só.
    expect(screen.getByRole("radio", { name: "Orbs" }).getAttribute("href")).toContain("categoria=orbs");
  });

  it("categoria com filhas escolhida: quadro de subcategorias embaixo, com check verde na escolhida", () => {
    const { container } = render(<CategoryPanel page={page} query={query(["orbs"])} />);
    const [top, sub] = screen.getAllByRole("radiogroup");
    expect(sub.getAttribute("aria-label")).toBe("Subcategorias de Orbs");
    expect(within(top).queryByRole("radio", { name: "Divine" })).toBeNull();
    expect(within(sub).getAllByRole("radio").map((radio) => radio.textContent)).toEqual(["Divine", "Chaos"]);

    const orbs = within(top).getByRole("radio", { name: "Orbs" });
    expect(orbs.getAttribute("aria-checked")).toBe("true");
    expect(orbs.querySelector("svg")).not.toBeNull();
    expect(container.querySelectorAll("svg")).toHaveLength(1);
    // Clicar de novo na escolhida desmarca (link sem categoria).
    expect(orbs.getAttribute("href")).not.toContain("categoria=");
    // Outra categoria SUBSTITUI a escolhida.
    const itens = within(top).getByRole("radio", { name: "Itens" }).getAttribute("href") ?? "";
    expect(itens).toContain("categoria=itens");
    expect(itens).not.toContain("categoria=orbs");
  });

  it("subcategoria escolhida: a mãe CONTINUA marcada, as duas com check verde", () => {
    render(<CategoryPanel page={page} query={query(["divine"])} />);
    const [top, sub] = screen.getAllByRole("radiogroup");
    const orbs = within(top).getByRole("radio", { name: "Orbs" });
    const divine = within(sub).getByRole("radio", { name: "Divine" });
    expect(orbs.getAttribute("aria-checked")).toBe("true");
    expect(orbs.querySelector("svg")).not.toBeNull();
    expect(divine.getAttribute("aria-checked")).toBe("true");
    expect(divine.querySelector("svg")).not.toBeNull();
    // Clicar de novo na subcategoria volta para só a mãe.
    expect(divine.getAttribute("href")).toContain("categoria=orbs");
    expect(divine.getAttribute("href")).not.toContain("categoria=divine");
  });
});
