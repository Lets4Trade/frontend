import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryPanel } from "./CatalogFilters";
import type { CatalogQuery } from "./catalog";
import type { GameCategory, GamePage } from "./types";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

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

const optionLabels = (select: HTMLElement) => within(select).getAllByRole("option").map((option) => option.textContent);

describe("CategoryPanel (selects, 2026-11-18)", () => {
  beforeEach(() => push.mockClear());

  it("sem escolha: um select só, com \"Todos\" primeiro e marcado", () => {
    render(<CategoryPanel page={page} query={query([])} />);
    const [top, ...rest] = screen.getAllByRole("combobox");
    expect(rest).toHaveLength(0);
    expect(screen.getByRole("combobox", { name: "Categoria" })).toBe(top);
    expect(optionLabels(top)).toEqual(["Todos", "Orbs", "Itens"]);
    expect((top as HTMLSelectElement).selectedOptions[0].textContent).toBe("Todos");
  });

  it("escolher navega para a URL do filtro, sem subir a página", () => {
    render(<CategoryPanel page={page} query={query([])} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Categoria" }), { target: { value: "orbs" } });
    expect(push).toHaveBeenCalledTimes(1);
    const [href, options] = push.mock.calls[0];
    expect(href).toContain("categoria=orbs");
    expect(href).toContain("servidor=sc");
    expect(options).toEqual({ scroll: false });
  });

  it("categoria com filhas: segundo select com as subcategorias; \"Todos\" dele = só a mãe", () => {
    render(<CategoryPanel page={page} query={query(["orbs"])} />);
    const top = screen.getByRole("combobox", { name: "Categoria" }) as HTMLSelectElement;
    const sub = screen.getByRole("combobox", { name: "Subcategoria de Orbs" }) as HTMLSelectElement;
    expect(top.value).toBe("orbs");
    expect(optionLabels(sub)).toEqual(["Todos", "Divine", "Chaos"]);
    expect(sub.selectedOptions[0].textContent).toBe("Todos");

    // Outra categoria SUBSTITUI a escolhida.
    fireEvent.change(top, { target: { value: "itens" } });
    expect(push.mock.calls[0][0]).toContain("categoria=itens");
    expect(push.mock.calls[0][0]).not.toContain("categoria=orbs");

    // "Todos" no de cima tira o filtro.
    fireEvent.change(top, { target: { value: "__todos" } });
    expect(push.mock.calls[1][0]).not.toContain("categoria=");
  });

  it("subcategoria escolhida: a mãe CONTINUA no primeiro select", () => {
    render(<CategoryPanel page={page} query={query(["divine"])} />);
    const top = screen.getByRole("combobox", { name: "Categoria" }) as HTMLSelectElement;
    const sub = screen.getByRole("combobox", { name: "Subcategoria de Orbs" }) as HTMLSelectElement;
    expect(top.value).toBe("orbs");
    expect(sub.value).toBe("divine");

    // "Todos" das subcategorias volta para a mãe inteira.
    fireEvent.change(sub, { target: { value: "__todos" } });
    expect(push.mock.calls[0][0]).toContain("categoria=orbs");
    expect(push.mock.calls[0][0]).not.toContain("categoria=divine");
  });

  it("categoria sem filhas: sem o segundo select", () => {
    render(<CategoryPanel page={page} query={query(["itens"])} />);
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
  });
});
