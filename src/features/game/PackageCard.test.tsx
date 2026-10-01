import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- stub de teste
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
vi.mock("./content", () => ({
  formatPrice: (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
}));

import { PackageCard } from "./PackageCard";
import type { GameProduct } from "./types";

const pack: GameProduct = {
  id: "k1",
  name: "Pacote Campanha",
  priceCents: 15000,
  tabId: "pacotes",
  highlights: ["Manual Boosting Guarantee", "Entrega em 24h"],
  pricing: { mode: "FIXED", addons: [{ id: "stream", label: "Stream", kind: "FIXED", value: 1000 }] },
};

describe("PackageCard", () => {
  it("mostra nome e tópicos, sem preço no card", () => {
    render(<PackageCard product={pack} href="/games/poe2?aba=pacotes&pacote=k1#pacote" />);
    expect(screen.getByRole("heading", { name: "Pacote Campanha" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(pack.highlights);
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
  });

  it("CONTINUAR é um link para a página do pacote (não abre diálogo)", () => {
    render(<PackageCard product={pack} href="/games/poe2?aba=pacotes&pacote=k1#pacote" />);
    const link = screen.getByRole("link", { name: "Continuar: Pacote Campanha" });
    expect(link).toHaveAttribute("href", "/games/poe2?aba=pacotes&pacote=k1#pacote");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
