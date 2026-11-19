import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ServerPicker } from "./CatalogFilters";
import type { CatalogQuery } from "./catalog";
import type { GamePage } from "./types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const page = {
  slug: "poe2",
  servers: {
    label: "Selecionar servidor",
    items: [
      { slug: "sc", label: "Fate of the Vaal SC" },
      { slug: "std", label: "Standard" },
    ],
  },
  categories: { label: "Selecionar categoria", items: [] },
} as unknown as GamePage;

const query: CatalogQuery = { tab: "moedas", server: "std", categories: [], sort: null, search: "", page: 1 };

describe("ServerPicker (2026-11-18: dropdown no celular)", () => {
  it("celular: um botão com o servidor escolhido; computador: as pílulas, links da URL", () => {
    render(<ServerPicker page={page} query={query} />);
    const trigger = screen.getByRole("button", { name: "Selecionar servidor: Standard" });
    expect(trigger.parentElement?.className).toContain("desk:hidden");

    const pills = screen.getAllByRole("link");
    expect(pills.map((link) => link.textContent)).toEqual(["Fate of the Vaal SC", "Standard"]);
    expect(pills[0].parentElement?.className).toContain("max-desk:hidden");
    expect(pills[0].getAttribute("href")).toContain("servidor=sc");
    expect(pills[1].getAttribute("aria-current")).toBe("true");
  });
});
