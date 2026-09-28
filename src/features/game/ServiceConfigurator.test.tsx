import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- stub de teste
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
// `formatPrice` mora no módulo de dados; o resto dele (rede) não entra no teste.
vi.mock("./content", () => ({
  formatPrice: (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
}));

import { useCart } from "@/features/cart/store";
import { ServiceConfigurator } from "./ServiceConfigurator";
import type { GameProduct } from "./types";

const product: GameProduct = {
  id: "p1",
  name: "Power Leveling",
  priceCents: 0,
  tabId: "boosting",
  serverLabel: "SC",
  pricing: {
    mode: "LEVEL_RANGE",
    unitLabel: "Power Level",
    min: 1,
    max: 50,
    bands: [{ from: 1, to: 50, pricePerLevelCents: 100, hoursPerLevel: 0.5 }],
    addons: [{ id: "prioridade", label: "Prioridade", kind: "PERCENT", value: 10 }],
  },
};

const context = { gameSlug: "poe2", platform: "SC" };

describe("ServiceConfigurator", () => {
  beforeEach(() => {
    push.mockReset();
    useCart.setState({ items: [], isOpen: false });
  });

  it("calcula a prévia, reage ao slider e aos adicionais e compra com a escolha", () => {
    render(<ServiceConfigurator products={[product]} context={context} filters={null} emptyMessage="vazio" />);

    // 1 → 50: 49 níveis × R$ 1,00; 24,5 h.
    expect(screen.getByText(/R\$\s?49,00/)).toBeInTheDocument();
    expect(screen.getByText("Total de Horas: 24,50")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Power Level:"), { target: { value: "11" } });
    expect(screen.getByText(/R\$\s?10,00/)).toBeInTheDocument();

    // Inicial digitado acima do desejado é corrigido no blur (máx. = desejado - 1).
    const from = screen.getByLabelText("Nível Inicial:");
    fireEvent.change(from, { target: { value: "30" } });
    fireEvent.blur(from);
    expect(from).toHaveValue(10);

    fireEvent.click(screen.getByRole("button", { name: /Prioridade/ }));
    expect(screen.getByRole("button", { name: /Prioridade/ })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "COMPRAR AGORA" }));
    const [item] = useCart.getState().items;
    expect(item).toMatchObject({
      productId: "p1",
      quantity: 1,
      selection: { levelFrom: 10, levelTo: 11, addonIds: ["prioridade"] },
      summary: "Power Level 10 → 11 · Prioridade",
    });
    expect(push).toHaveBeenCalledWith("/checkout");
  });

  it("sem produto no escopo mostra o estado vazio", () => {
    render(<ServiceConfigurator products={[]} context={context} filters={null} emptyMessage="Nada aqui." />);
    expect(screen.getByRole("status")).toHaveTextContent("Nada aqui.");
  });

  it("mais de um produto vira radiogroup", () => {
    render(
      <ServiceConfigurator
        products={[product, { ...product, id: "p2", name: "Campanha", pricing: { mode: "FIXED" }, priceCents: 5000 }]}
        context={context}
        filters={null}
        emptyMessage="vazio"
      />,
    );
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    fireEvent.click(radios[1]);
    expect(screen.getByText(/R\$\s?50,00/)).toBeInTheDocument();
  });
});
