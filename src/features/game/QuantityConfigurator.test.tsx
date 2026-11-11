import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- stub de teste
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
vi.mock("@/components/ui/SelectField", () => ({
  SelectField: ({
    label,
    options,
    value,
    onValueChange,
  }: {
    label: string;
    options: readonly { value: string; label: string }[];
    value?: string;
    onValueChange?: (value: string) => void;
  }) => (
    <label>
      {label}
      <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ),
}));
vi.mock("./content", () => ({
  formatPrice: (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
}));

import { useCart } from "@/features/cart/store";
import { QuantityConfigurator } from "./QuantityConfigurator";
import type { GameProduct } from "./types";

// R$ 0,02 por unidade; a partir de 10.000, R$ 0,01 (faixa).
const gold: GameProduct = {
  id: "g1",
  name: "Gold Softcore",
  priceCents: 2,
  tabId: "gold",
  serverLabel: "Eternal Softcore",
  highlights: [],
  pricing: {
    mode: "QUANTITY",
    unitLabel: "Gold",
    min: 1000,
    max: 100_000,
    step: 1000,
    presets: [5000, 10_000],
    tiers: [{ from: 10_000, unitPriceCents: 1 }],
  },
};

const context = { gameSlug: "poe2", platform: "SC" };

describe("QuantityConfigurator", () => {
  beforeEach(() => {
    push.mockReset();
    useCart.setState({ items: [], isOpen: false });
  });

  it("começa na primeira quantidade pronta e troca pelos botões", () => {
    render(<QuantityConfigurator products={[gold]} context={context} emptyMessage="vazio" />);

    // 5.000 × R$ 0,02
    expect(screen.getByRole("button", { name: "5K" })).toHaveAttribute("aria-pressed", "true");
    // O total aparece no card "Preço" e no pé do painel (2026-11-11).
    expect(screen.getAllByText(/R\$\s?100,00/)).toHaveLength(2);
    expect(screen.getByText("5K Gold")).toBeInTheDocument();

    // 10.000 × R$ 0,02 — sem desconto por quantidade (2026-10-01), mesmo com faixa salva.
    fireEvent.click(screen.getByRole("button", { name: "10K" }));
    expect(screen.getByRole("button", { name: "10K" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText(/R\$\s?200,00/)).toHaveLength(2);
    // Sem desconto, nada riscado.
    expect(document.querySelector("s")).toBeNull();
  });

  it("com desconto por quantidade: o cheio riscado e o total com desconto no pé do painel", () => {
    const discounted: GameProduct = {
      ...gold,
      pricing: { ...gold.pricing!, discounts: [{ from: 10_000, percent: 10 }] } as GameProduct["pricing"],
    };
    render(<QuantityConfigurator products={[discounted]} context={context} emptyMessage="vazio" />);
    // 5.000: sem faixa de desconto ainda.
    expect(document.querySelector("s")).toBeNull();

    // 10.000 × R$ 0,02 = R$ 200,00 cheio; −10% = R$ 180,00.
    fireEvent.click(screen.getByRole("button", { name: "10K" }));
    expect(document.querySelector("s")).toHaveTextContent(/De R\$\s?200,00/);
    expect(screen.getAllByText(/R\$\s?180,00/)).toHaveLength(2);
  });

  it("produto com preço de tabela: risca o cheio da quantidade escolhida", () => {
    render(
      <QuantityConfigurator
        products={[{ ...gold, listPriceCents: 4, discountPercent: 50 }]}
        context={context}
        emptyMessage="vazio"
      />,
    );
    // 5.000 × R$ 0,04 = R$ 200,00 cheio; cobrado 5.000 × R$ 0,02 = R$ 100,00.
    expect(document.querySelector("s")).toHaveTextContent(/R\$\s?200,00/);
  });

  it("−/+ andam pelo passo e o campo livre é preso à regra", () => {
    render(<QuantityConfigurator products={[gold]} context={context} emptyMessage="vazio" />);

    fireEvent.click(screen.getByRole("button", { name: "Aumentar gold" }));
    const input = screen.getByLabelText("Quantidade (Gold)");
    expect(input).toHaveValue(6000);
    // Nenhuma pronta acesa fora dos valores dela.
    expect(screen.getByRole("button", { name: "5K" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.change(input, { target: { value: "2345" } });
    fireEvent.blur(input);
    expect(input).toHaveValue(2000);

    fireEvent.change(input, { target: { value: "999999" } });
    fireEvent.blur(input);
    expect(input).toHaveValue(100_000);
    expect(screen.getByRole("button", { name: "Aumentar gold" })).toBeDisabled();
  });

  it("COMPRAR AGORA manda a escolha para o carrinho", () => {
    render(<QuantityConfigurator products={[gold]} context={context} emptyMessage="vazio" />);
    fireEvent.click(screen.getByRole("button", { name: "COMPRAR AGORA" }));
    expect(useCart.getState().items[0]).toMatchObject({
      productId: "g1",
      platform: "Eternal Softcore",
      selection: { quantity: 5000 },
      summary: "5000 Gold",
    });
    expect(push).toHaveBeenCalledWith("/checkout");
  });

  it("mais de um produto: select no topo do painel", () => {
    const other: GameProduct = { ...gold, id: "g2", name: "Gold Hardcore", pricing: { ...gold.pricing!, presets: [] } as GameProduct["pricing"] };
    render(<QuantityConfigurator products={[gold, other]} context={context} emptyMessage="vazio" />);
    fireEvent.change(screen.getByLabelText("Selecionar serviço:"), { target: { value: "g2" } });
    // Sem prontas: começa no mínimo.
    expect(screen.getByLabelText("Quantidade (Gold)")).toHaveValue(1000);
    expect(screen.queryByRole("button", { name: "5K" })).not.toBeInTheDocument();
  });

  it("sem produto mostra o estado vazio", () => {
    render(<QuantityConfigurator products={[]} context={context} emptyMessage="Nada aqui." />);
    expect(screen.getByRole("status")).toHaveTextContent("Nada aqui.");
  });
});
