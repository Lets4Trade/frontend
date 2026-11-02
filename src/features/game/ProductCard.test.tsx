import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- stub de teste
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import { useCart } from "@/features/cart/store";
import { ProductCard } from "./ProductCard";
import type { GameProduct } from "./types";

const product: GameProduct = {
  id: "p1",
  name: "Divine Orb",
  priceCents: 1500,
  serverLabel: "Standard",
  tabId: "itens",
  highlights: [],
};
const context = { gameSlug: "path-of-exile-2", platform: "Standard" };

describe("ProductCard", () => {
  beforeEach(() => {
    push.mockReset();
    useCart.setState({ items: [], isOpen: false });
  });

  it("COMPRE AQUI leva a quantidade escolhida e vai direto ao checkout", () => {
    render(<ProductCard product={product} context={context} />);
    fireEvent.click(screen.getByRole("button", { name: "Aumentar a quantidade de Divine Orb" }));
    fireEvent.click(screen.getByRole("button", { name: "Comprar 2 × Divine Orb agora" }));

    expect(useCart.getState().items[0]).toMatchObject({ productId: "p1", unitPriceCents: 1500 });
    expect(useCart.getState().items[0].quantity).toBe(2);
    expect(useCart.getState().isOpen).toBe(false);
    expect(push).toHaveBeenCalledWith("/checkout");
  });

  it("mostra o nome em português e, se houver, o inglês na linha de baixo", () => {
    const { rerender } = render(<ProductCard product={product} context={context} />);
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("Divine Orb");
    expect(document.querySelector('[lang="en"]')).toBeNull();

    rerender(<ProductCard product={{ ...product, name: "Orbe Divino", nameEn: "Divine Orb" }} context={context} />);
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("Orbe Divino");
    expect(document.querySelector('[lang="en"]')?.textContent).toBe("Divine Orb");
  });

  it("desconto do pacote: só o selo no canto, e o carrinho leva o preço com desconto (2026-10-27)", () => {
    const { rerender } = render(<ProductCard product={product} context={context} />);
    expect(screen.queryByText("-5%")).toBeNull();

    rerender(
      <ProductCard product={{ ...product, priceCents: 1425, listPriceCents: 1500, discountPercent: 5 }} context={context} />,
    );
    expect(screen.getByText("-5%")).toBeTruthy();
    expect(screen.getByText("5% de desconto")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /ao carrinho/ }));
    expect(useCart.getState().items[0]).toMatchObject({ unitPriceCents: 1425 });
  });

  it("desconto: preço cheio riscado ao lado do novo, também no total de várias unidades (2026-11-02)", () => {
    const { container, rerender } = render(<ProductCard product={product} context={context} />);
    expect(container.querySelector("s")).toBeNull();

    rerender(
      <ProductCard product={{ ...product, priceCents: 2850, listPriceCents: 3000, discountPercent: 5 }} context={context} />,
    );
    const norm = (text: string | null | undefined) => (text ?? "").replace(/\s/g, " ");
    expect(norm(container.querySelector("s")?.textContent)).toBe("De R$ 30,00");
    expect(norm(container.querySelector("s")?.nextElementSibling?.textContent)).toBe("por R$ 28,50");

    fireEvent.click(screen.getByRole("button", { name: "Aumentar a quantidade de Divine Orb" }));
    expect(norm(container.querySelector("s")?.textContent)).toBe("De R$ 60,00");
    expect(norm(container.querySelector("s")?.nextElementSibling?.textContent)).toBe("por R$ 57,00");
  });

  it("sem preço cheio maior (dado antigo), só o selo — nada riscado", () => {
    const { container } = render(
      <ProductCard product={{ ...product, priceCents: 1425, discountPercent: 5 }} context={context} />,
    );
    expect(container.querySelector("s")).toBeNull();
    expect(screen.getByText("-5%")).toBeTruthy();
  });

  it("o carrinho continua só adicionando, sem sair da página", () => {
    render(<ProductCard product={product} context={context} />);
    fireEvent.click(screen.getByRole("button", { name: /ao carrinho/ }));

    expect(useCart.getState().items).toHaveLength(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("descrição ao passar o mouse na arte, só quando o admin escreveu uma (2026-10-20)", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));

    const plain = render(<ProductCard product={product} context={context} />);
    fireEvent.mouseEnter(plain.container.querySelector("article")!.firstElementChild!);
    expect(document.querySelector("[data-package-tooltip]")).toBeNull();
    plain.unmount();

    const described = render(
      <ProductCard
        product={{ ...product, content: { sections: [{ title: "Como chega", items: ["Entrega em 5 minutos"] }] } }}
        context={context}
      />,
    );
    fireEvent.mouseEnter(described.container.querySelector("article")!.firstElementChild!);
    const panel = document.querySelector("[data-package-tooltip]")!;
    expect(panel.textContent).toContain("Como chega");
    expect(panel.textContent).toContain("Entrega em 5 minutos");
    vi.unstubAllGlobals();
  });
});
