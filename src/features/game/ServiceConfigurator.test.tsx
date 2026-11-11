import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- stub de teste
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
// O select do tema é Radix (portal + ponteiro), ruim de dirigir no jsdom; aqui
// basta um `<select>` com o mesmo contrato (rótulo, opções, valor).
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
  highlights: [],
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

    fireEvent.click(screen.getByRole("checkbox", { name: /Prioridade/ }));
    expect(screen.getByRole("checkbox", { name: /Prioridade/ })).toBeChecked();

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

  it("sem banner mostra só o texto (nem a arte do card); com banner, a imagem (2026-11-04)", () => {
    const image = { src: "/card.webp", alt: "", width: 263, height: 276 };
    const { container, rerender } = render(
      <ServiceConfigurator products={[{ ...product, image }]} context={context} filters={null} emptyMessage="vazio" />,
    );
    // Só os ícones do controle de nível: nem a arte do card, nem o cinza no lugar.
    expect(container.querySelector('img[src="/card.webp"]')).toBeNull();
    expect(container.querySelector(".rounded-t-\\[30px\\]")).toBeNull();

    const banner = { src: "/banner.webp", alt: "", width: 551, height: 327 };
    rerender(
      <ServiceConfigurator products={[{ ...product, image, banner }]} context={context} filters={null} emptyMessage="vazio" />,
    );
    expect(container.querySelector('img[src="/banner.webp"]')).not.toBeNull();
    expect(container.querySelector('img[src="/card.webp"]')).toBeNull();
  });

  it("página do pacote (topArt=image): a imagem do card no topo, nunca o banner; sem imagem, só o texto", () => {
    const image = { src: "/card.webp", alt: "", width: 263, height: 276 };
    const banner = { src: "/banner.webp", alt: "", width: 551, height: 327 };
    const { container, rerender } = render(
      <ServiceConfigurator topArt="image" products={[{ ...product, image, banner }]} context={context} filters={null} emptyMessage="vazio" />,
    );
    expect(container.querySelector('img[src="/card.webp"]')).not.toBeNull();
    expect(container.querySelector('img[src="/banner.webp"]')).toBeNull();

    rerender(
      <ServiceConfigurator topArt="image" products={[{ ...product, banner }]} context={context} filters={null} emptyMessage="vazio" />,
    );
    expect(container.querySelector('img[src="/banner.webp"]')).toBeNull();
    expect(container.querySelector(".rounded-t-\\[30px\\]")).toBeNull();
  });

  it("menu \"Selecionar serviço\": nome próprio quando há, senão o nome (2026-11-04)", () => {
    render(
      <ServiceConfigurator
        products={[{ ...product, serviceLabel: "Campanha 1-50" }, { ...product, id: "p2", name: "Farm de Divine" }]}
        context={context}
        filters={null}
        emptyMessage="vazio"
      />,
    );
    expect(screen.getByLabelText("Selecionar serviço:")).toHaveTextContent("Campanha 1-50");
    expect(screen.queryByText("Power Leveling")).not.toBeInTheDocument();
  });

  it("sem produto no escopo mostra o estado vazio", () => {
    render(<ServiceConfigurator products={[]} context={context} filters={null} emptyMessage="Nada aqui." />);
    expect(screen.getByRole("status")).toHaveTextContent("Nada aqui.");
  });

  it("mais de um produto vira o select \"Selecionar serviço\"", () => {
    render(
      <ServiceConfigurator
        products={[product, { ...product, id: "p2", name: "Campanha", pricing: { mode: "FIXED" }, priceCents: 5000 }]}
        context={context}
        filters={null}
        emptyMessage="vazio"
      />,
    );
    const select = screen.getByLabelText("Selecionar serviço:");
    fireEvent.change(select, { target: { value: "p2" } });
    expect(screen.getByText(/R\$\s?50,00/)).toBeInTheDocument();
  });

  it("um produto só não mostra o select", () => {
    render(<ServiceConfigurator products={[product]} context={context} filters={null} emptyMessage="vazio" />);
    expect(screen.queryByLabelText("Selecionar serviço:")).not.toBeInTheDocument();
  });

  it("mais de 6 adicionais ganha a busca, que filtra sem esconder os marcados", () => {
    const addons = ["Prioridade", "Stream", "Jogar junto", "Épico", "Offline", "Classe", "Rota"].map(
      (label, index) => ({ id: `a${index}`, label, kind: "FIXED" as const, value: 1000 }),
    );
    render(
      <ServiceConfigurator
        products={[{ ...product, pricing: { mode: "FIXED", addons }, priceCents: 1000 }]}
        context={context}
        filters={null}
        emptyMessage="vazio"
      />,
    );
    expect(screen.getAllByRole("checkbox")).toHaveLength(7);
    fireEvent.click(screen.getByRole("checkbox", { name: /Stream/ }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Pesquisar itens" }), { target: { value: "epico" } });
    // "Épico" casa sem acento; "Stream" continua porque está marcado.
    expect(screen.getAllByRole("checkbox").map((box) => box.closest("label")?.textContent)).toEqual([
      expect.stringContaining("Stream"),
      expect.stringContaining("Épico"),
    ]);
    // O preço não muda com a busca: base 10 + Stream 10.
    expect(screen.getByText(/R\$\s?20,00/)).toBeInTheDocument();
  });

  it("grupo (2026-11-11): título sem caixinha nem preço, opções abertas e marcadas sozinhas", () => {
    const pricing = {
      mode: "FIXED" as const,
      addons: [
        {
          id: "mods",
          label: "Modificações",
          kind: "FIXED" as const,
          value: 0,
          children: [
            { id: "pente", label: "Pente Maior", kind: "FIXED" as const, value: 400 },
            { id: "rajada", label: "Rajada Carregada", kind: "FIXED" as const, value: 500 },
          ],
        },
        { id: "adds", label: "Adicionais", kind: "FIXED" as const, value: 0, children: [{ id: "conv", label: "Conversor Cinético", kind: "FIXED" as const, value: 500 }] },
      ],
    };
    render(
      <ServiceConfigurator
        products={[{ ...product, pricing, priceCents: 1000 }]}
        context={context}
        filters={null}
        emptyMessage="vazio"
      />,
    );
    // Os títulos são cabeçalhos, sem caixinha; as 3 opções já aparecem abertas.
    expect(screen.getByRole("heading", { name: "Modificações" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Adicionais" })).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    expect(screen.getByRole("group", { name: "Modificações" })).toHaveTextContent("Pente Maior");
    expect(screen.queryByText(/Marque para ver/)).not.toBeInTheDocument();

    // A caixinha grande do grupo não é clicável e só acende com um subitem marcado.
    const groupBox = () => screen.getByRole("heading", { name: "Modificações" }).previousElementSibling;
    expect(groupBox()?.className).not.toContain("orange-gradient");

    // Marcar uma opção soma só ela: base 10 + Rajada 5.
    fireEvent.click(screen.getByRole("checkbox", { name: /Rajada Carregada/ }));
    expect(groupBox()?.className).toContain("orange-gradient");
    // O subitem marcado ganha o ✓; a caixinha grande do grupo, não.
    expect(screen.getAllByTestId("addon-check")).toHaveLength(1);
    expect(screen.getByRole("checkbox", { name: /Rajada Carregada/ }).closest("label")?.querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Adicionais" }).previousElementSibling?.className).not.toContain(
      "orange-gradient",
    );
    expect(screen.getByText(/R\$\s?15,00/)).toBeInTheDocument();
  });

  it("preço fixo com máximo de unidades (2026-11-11): seletor multiplica o total e vai ao carrinho", () => {
    render(
      <ServiceConfigurator
        products={[{ ...product, pricing: { mode: "FIXED", maxUnits: 3 }, priceCents: 1500 }]}
        context={context}
        filters={null}
        emptyMessage="vazio"
      />,
    );
    expect(screen.getByRole("button", { name: "Diminuir a quantidade" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Aumentar a quantidade" }));
    fireEvent.click(screen.getByRole("button", { name: "Aumentar a quantidade" }));
    // 3 × R$ 15,00
    expect(screen.getByText(/R\$\s?45,00/)).toBeInTheDocument();
    expect(screen.getByText(/3 × R\$\s?15,00/)).toBeInTheDocument();
    // No máximo do painel, o + trava.
    expect(screen.getByRole("button", { name: "Aumentar a quantidade" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "COMPRAR AGORA" }));
    expect(useCart.getState().items[0]).toMatchObject({ productId: "p1", quantity: 3, unitPriceCents: 1500 });
  });

  it("sem máximo de unidades (ou faixa de nível) não tem seletor de quantidade", () => {
    const { unmount } = render(
      <ServiceConfigurator products={[product]} context={context} filters={null} emptyMessage="vazio" />,
    );
    expect(screen.queryByRole("button", { name: "Aumentar a quantidade" })).not.toBeInTheDocument();
    unmount();
    render(
      <ServiceConfigurator
        products={[{ ...product, pricing: { mode: "FIXED" }, priceCents: 1500 }]}
        context={context}
        filters={null}
        emptyMessage="vazio"
      />,
    );
    expect(screen.queryByRole("button", { name: "Aumentar a quantidade" })).not.toBeInTheDocument();
  });

  it("até 6 adicionais não mostra a busca", () => {
    render(<ServiceConfigurator products={[product]} context={context} filters={null} emptyMessage="vazio" />);
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });
});
