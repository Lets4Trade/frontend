import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminGame } from "@/features/admin/catalog";
import type { GameTab } from "../games/tabs/types";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- stub de teste
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
// Radix (portal + ponteiro) é ruim de dirigir no jsdom. O stub mantém o
// contrato que o formulário usa: NÃO controlado (`defaultValue`), com `name`
// no `FormData`, remontado por `key`.
vi.mock("@/components/ui/SelectField", () => ({
  SelectField: ({
    label,
    name,
    options,
    defaultValue,
    disabled,
    onValueChange,
  }: {
    label: string;
    name?: string;
    options: readonly { value: string; label: string }[];
    defaultValue?: string;
    disabled?: boolean;
    onValueChange?: (value: string) => void;
  }) => (
    <label>
      {label}
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        disabled={disabled}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        <option value="" />
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ),
}));

vi.mock("@/components/ui/Toasts", () => ({ toastOk: vi.fn(), toastError: vi.fn() }));

const createProductAction = vi.fn();
const updateProductAction = vi.fn();
vi.mock("./actions", () => ({
  createProductAction: (form: FormData) => createProductAction(form),
  updateProductAction: (id: string, form: FormData) => updateProductAction(id, form),
}));
vi.mock("../games/tabs/actions", () => ({ listGameTabsAction: vi.fn() }));

const { ProductForm } = await import("./ProductForm");

const games: AdminGame[] = [
  {
    id: "g1",
    slug: "poe",
    name: "Path of Exile",
    platforms: ["STEAM", "EPIC"],
    servers: [
      { id: "s1", label: "Standard" },
      { id: "s2", label: "Liga" },
    ],
    categories: [{ id: "c1", label: "Moedas" }],
  },
];

const tabs: GameTab[] = [
  {
    id: "t1",
    slug: "pacotes",
    label: "Pacotes",
    iconUrl: null,
    layout: "PACKAGES",
    linkHref: null,
    content: null,
    position: 0,
    isActive: true,
    productCount: 0,
  },
];

const prefill = { gameId: "g1", tabId: "t1", serverId: "s2", platform: "EPIC" };

function select(label: string) {
  return screen.getByLabelText(label) as HTMLSelectElement;
}

function field(container: HTMLElement, name: string) {
  return container.querySelector(`[name="${name}"]`) as HTMLInputElement;
}

function fillItem(container: HTMLElement) {
  fireEvent.change(screen.getByLabelText("Nome em português"), { target: { value: "Pacote Ouro" } });
  const price = document.getElementById(
    screen.getByText(/^Preço( base)?$/, { selector: "label" }).getAttribute("for") ?? "",
  ) as HTMLInputElement;
  fireEvent.change(price, { target: { value: "1990" } });
  fireEvent.change(screen.getByLabelText("Tópicos do card"), { target: { value: "Entrega rápida" } });
  fireEvent.change(select("Categoria:"), { target: { value: "c1" } });
  expect(field(container, "priceCents").value).toBe("1990");
}

describe("ProductForm — pré-preenchimento e 'Salvar e cadastrar outro'", () => {
  beforeEach(() => {
    createProductAction.mockReset();
    createProductAction.mockResolvedValue({ ok: true, name: "Pacote Ouro", gameName: "Path of Exile" });
  });

  it("abre com jogo, aba e servidor do pré-preenchimento; plataforma não é mais perguntada", () => {
    render(<ProductForm games={games} prefill={prefill} initialTabs={tabs} />);
    expect(select("Jogo:").value).toBe("g1");
    expect(select("Aba:").value).toBe("t1");
    expect(select("Servidor:").value).toBe("s2");
    expect(screen.queryByText("Plataforma:")).toBeNull();
  });

  it("'Salvar e cadastrar outro' envia, mantém o contexto e limpa o item", async () => {
    const { container } = render(<ProductForm games={games} prefill={prefill} initialTabs={tabs} />);
    fillItem(container);
    const pricingBefore = field(container, "pricing").value;
    expect(pricingBefore).not.toBe("");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Salvar e cadastrar outro" }));
    });
    await waitFor(() => expect(createProductAction).toHaveBeenCalledTimes(1));

    const sent = createProductAction.mock.calls[0][0] as FormData;
    expect(Object.fromEntries(["gameId", "tabId", "serverId", "platform", "categoryId", "name"].map((k) => [k, sent.get(k)]))).toEqual({
      gameId: "g1",
      tabId: "t1",
      serverId: "s2",
      // Campo saiu do formulário (2026-10-08): o backend usa a do jogo.
      platform: null,
      categoryId: "c1",
      name: "Pacote Ouro",
    });

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Pacote Ouro cadastrado em Path of Exile"));

    // Mantidos.
    expect(select("Jogo:").value).toBe("g1");
    expect(select("Aba:").value).toBe("t1");
    expect(select("Servidor:").value).toBe("s2");
    expect(select("Categoria:").value).toBe("c1");
    expect(field(container, "pricing").value).toBe(pricingBefore);

    // Limpos, e o foco no nome.
    const name = screen.getByLabelText("Nome em português") as HTMLInputElement;
    expect(name.value).toBe("");
    expect(name).toHaveFocus();
    expect(field(container, "priceCents").value).toBe("0");
    expect((screen.getByLabelText("Tópicos do card") as HTMLTextAreaElement).value).toBe("");
  });

  it("'SALVAR E ANUNCIAR' segue zerando o formulário inteiro", async () => {
    const { container } = render(<ProductForm games={games} prefill={prefill} initialTabs={tabs} />);
    fillItem(container);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "SALVAR E ANUNCIAR" }));
    });
    await waitFor(() => expect(createProductAction).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(select("Jogo:").value).toBe(""));
    expect(select("Servidor:").value).toBe("");
    expect((screen.getByLabelText("Nome em português") as HTMLInputElement).value).toBe("");
  });

  it("falha no envio não limpa nada", async () => {
    createProductAction.mockResolvedValue({ ok: false, reason: "error" });
    const { container } = render(<ProductForm games={games} prefill={prefill} initialTabs={tabs} />);
    fillItem(container);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Salvar e cadastrar outro" }));
    });
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect((screen.getByLabelText("Nome em português") as HTMLInputElement).value).toBe("Pacote Ouro");
    expect(field(container, "priceCents").value).toBe("1990");
  });

  it("na edição não há 'Salvar e cadastrar outro'", () => {
    render(
      <ProductForm
        games={games}
        initialTabs={tabs}
        product={{
          id: "p1",
          name: "X",
          priceCents: 100,
          platform: "STEAM",
          tabId: "t1",
          imageUrl: null,
          serverId: "s1",
          categoryId: null,
          createdAt: "",
          game: { id: "g1", slug: "poe", name: "Path of Exile" },
          server: null,
          category: null,
        }}
      />,
    );
    expect(screen.queryByRole("button", { name: "Salvar e cadastrar outro" })).toBeNull();
  });
});

describe("ProductForm — `volta` (Central do jogo)", () => {
  const back = "/admin/jogos/g1?secao=abas&aba=t1";
  const product = {
    id: "p1",
    name: "Pacote Prata",
    priceCents: 1990,
    platform: "STEAM",
    tabId: "t1",
    imageUrl: null,
    serverId: "s1",
    categoryId: null,
    createdAt: "",
    highlights: ["Um"],
    game: { id: "g1", slug: "poe", name: "Path of Exile" },
    server: null,
    category: null,
  };

  beforeEach(() => {
    push.mockReset();
    createProductAction.mockReset();
    createProductAction.mockResolvedValue({ ok: true, name: "Pacote Ouro", gameName: "Path of Exile" });
    updateProductAction.mockReset();
    updateProductAction.mockResolvedValue({ ok: true, name: "X", gameName: "Path of Exile" });
  });

  it("'SALVAR E ANUNCIAR' volta para a Central", async () => {
    const { container } = render(<ProductForm games={games} prefill={prefill} initialTabs={tabs} returnTo={back} />);
    fillItem(container);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "SALVAR E ANUNCIAR" }));
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith(back));
  });

  it("'Salvar e cadastrar outro' fica no cadastro mesmo com `volta`", async () => {
    const { container } = render(<ProductForm games={games} prefill={prefill} initialTabs={tabs} returnTo={back} />);
    fillItem(container);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Salvar e cadastrar outro" }));
    });
    await waitFor(() => expect(createProductAction).toHaveBeenCalledTimes(1));
    expect(push).not.toHaveBeenCalled();
  });

  it("edição salva volta para o `volta`; sem ele, para a listagem", async () => {
    const { unmount } = render(<ProductForm games={games} initialTabs={tabs} product={product} returnTo={back} />);
    expect(screen.getByRole("link", { name: "← Voltar sem salvar" })).toHaveAttribute("href", back);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "SALVAR ALTERAÇÕES" }));
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith(back));
    unmount();

    push.mockReset();
    render(<ProductForm games={games} initialTabs={tabs} product={product} />);
    expect(screen.queryByRole("link", { name: "← Voltar sem salvar" })).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "SALVAR ALTERAÇÕES" }));
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/produtos"));
  });
});

describe("ProductForm — página do pacote (2026-10-01)", () => {
  it("'Depois do CONTINUAR' troca o modo de preço e esconde a escolha duplicada", () => {
    const { container } = render(<ProductForm games={games} prefill={prefill} initialTabs={tabs} />);
    expect(screen.queryByRole("radiogroup", { name: "Como o preço é calculado" })).toBeNull();

    const level = screen.getByRole("radio", { name: /Faixa de nível/ });
    fireEvent.click(level);
    expect(level).toHaveAttribute("aria-checked", "true");
    // O hidden do preço só fica válido depois das faixas; o modo já mudou no editor.
    expect(screen.getByRole("radio", { name: /Lista de serviços/ })).toHaveAttribute("aria-checked", "false");
    expect(field(container, "content").value).toBe("");
  });

  it("textos da página do pacote vão no hidden `content`", () => {
    const { container } = render(<ProductForm games={games} prefill={prefill} initialTabs={tabs} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Adicionar seção de texto" }));
    fireEvent.change(screen.getByLabelText("Título da seção 1"), { target: { value: "What you will get" } });
    expect(JSON.parse(field(container, "content").value)).toEqual({
      sections: [{ title: "What you will get", items: [] }],
    });
  });
});
