import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminSearchBox } from "./AdminSearchBox";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

function setup(defaultValue = "") {
  render(
    <AdminSearchBox
      action="/admin/produtos"
      name="busca"
      defaultValue={defaultValue}
      placeholder="Buscar pelo nome…"
      hidden={{ jogo: "poe2", aba: "", pagina: "3" }}
    />,
  );
  return screen.getByRole("searchbox", { name: "Buscar pelo nome…" });
}

describe("AdminSearchBox (busca em tempo real)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    replace.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it("busca sozinha 300 ms depois da última tecla, uma vez só", () => {
    const input = setup();
    for (const value of ["l", "le", "lev"]) fireEvent.change(input, { target: { value } });
    act(() => vi.advanceTimersByTime(299));
    expect(replace).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(replace).toHaveBeenCalledTimes(1);
    // Filtros vazios ficam fora; os demais viajam junto.
    expect(replace).toHaveBeenCalledWith("/admin/produtos?jogo=poe2&pagina=3&busca=lev", { scroll: false });
  });

  it("Enter busca na hora, sem esperar", () => {
    const input = setup();
    fireEvent.change(input, { target: { value: "  ouro " } });
    fireEvent.submit(input.closest("form")!);
    expect(replace).toHaveBeenCalledWith("/admin/produtos?jogo=poe2&pagina=3&busca=ouro", { scroll: false });
    act(() => vi.advanceTimersByTime(500));
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it("apagar tudo tira a busca da URL; repetir o termo atual não navega", () => {
    const input = setup("level");
    fireEvent.change(input, { target: { value: "level " } });
    act(() => vi.advanceTimersByTime(300));
    expect(replace).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "" } });
    act(() => vi.advanceTimersByTime(300));
    expect(replace).toHaveBeenCalledWith("/admin/produtos?jogo=poe2&pagina=3", { scroll: false });
  });
});
