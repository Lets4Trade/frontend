import { fireEvent, render, screen } from "@testing-library/react";
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

  it("painel ao lado: textos do pacote, e os da aba como reserva", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const tabContent = { sections: [{ title: "Requisitos da aba", items: ["Conta própria"] }] };
    const { container, unmount } = render(
      <PackageCard
        product={{ ...pack, content: { sections: [{ title: "What you will get", items: ["Ato 1 a 10"] }] } }}
        href="#"
        fallbackContent={tabContent}
      />,
    );
    // Fechado até o mouse passar na arte (o primeiro filho do card).
    expect(document.querySelector("[data-package-tooltip]")).toBeNull();
    fireEvent.mouseEnter(container.querySelector("article")!.firstElementChild!);
    const panel = document.querySelector("[data-package-tooltip]")!;
    // Fora do card: vai para o body (portal), que nada corta.
    expect(container.contains(panel)).toBe(false);
    expect(panel.textContent).toContain("What you will get");
    expect(panel.textContent).not.toContain("Requisitos da aba");
    unmount();

    const second = render(<PackageCard product={pack} href="#" fallbackContent={tabContent} />);
    fireEvent.mouseEnter(second.container.querySelector("article")!.firstElementChild!);
    expect(document.querySelector("[data-package-tooltip]")!.textContent).toContain("Requisitos da aba");
    second.unmount();
    vi.unstubAllGlobals();
  });

  it("sem hover (toque), o painel não abre", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    const { container } = render(
      <PackageCard product={pack} href="#" fallbackContent={{ sections: [{ title: "T", items: ["a"] }] }} />,
    );
    fireEvent.mouseEnter(container.querySelector("article")!.firstElementChild!);
    expect(document.querySelector("[data-package-tooltip]")).toBeNull();
    vi.unstubAllGlobals();
  });
});
