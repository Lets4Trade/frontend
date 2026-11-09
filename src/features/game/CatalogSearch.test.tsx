import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));

import { CatalogSearch, SEARCH_DEBOUNCE_MS } from "./CatalogSearch";
import type { CatalogQuery } from "./catalog";

const query = { tab: "moedas", server: "standard", categories: ["orbs"], sort: "", search: "", page: 1 } as unknown as CatalogQuery;

function setup(search = "") {
  render(<CatalogSearch slug="poe2" action="/poe2" query={{ ...query, search }} />);
  return screen.getByLabelText("Pesquisar itens") as HTMLInputElement;
}

beforeEach(() => {
  vi.useFakeTimers();
  replace.mockClear();
});
afterEach(() => vi.useRealTimers());

/** "Pesquisar itens" em tempo real (2026-11-09). */
describe("CatalogSearch", () => {
  it("busca sozinha depois da espera, uma vez só, mantendo os filtros e voltando à página 1", () => {
    const input = setup();
    fireEvent.change(input, { target: { value: "div" } });
    fireEvent.change(input, { target: { value: "divine" } });
    expect(replace).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    expect(replace).toHaveBeenCalledTimes(1);
    const [href, options] = replace.mock.calls[0];
    expect(href).toContain("busca=divine");
    expect(href).toContain("standard");
    expect(href).not.toContain("pagina=");
    expect(options).toEqual({ scroll: false });
  });

  it("apagar tudo volta na hora à lista completa", () => {
    const input = setup("divine");
    fireEvent.change(input, { target: { value: "" } });
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace.mock.calls[0][0]).not.toContain("busca=");
  });

  it("Enter busca na hora, sem esperar", () => {
    const input = setup();
    fireEvent.change(input, { target: { value: "chaos" } });
    fireEvent.submit(input.form as HTMLFormElement);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace.mock.calls[0][0]).toContain("busca=chaos");
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it("a mesma busca que já está na tela não navega", () => {
    const input = setup("chaos");
    fireEvent.change(input, { target: { value: "chaos " } });
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    expect(replace).not.toHaveBeenCalled();
  });
});
