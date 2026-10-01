import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameTab } from "./types";

vi.mock("next/link", () => ({
  // `scroll` é prop do Link do Next, não atributo de <a>: fica fora.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  default: ({ href, children, scroll: _scroll, ...rest }: { href: string; children: ReactNode; scroll?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- stub de teste
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
vi.mock("@/components/ui/Toasts", () => ({ toastOk: vi.fn(), toastError: vi.fn() }));

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));

const createTabAction = vi.fn();
const reorderTabsAction = vi.fn();
const updateTabAction = vi.fn();
vi.mock("./actions", () => ({
  createTabAction: (gameId: string, input: unknown) => createTabAction(gameId, input),
  deleteTabAction: vi.fn(),
  reorderTabsAction: (gameId: string, ids: string[]) => reorderTabsAction(gameId, ids),
  updateTabAction: (gameId: string, tabId: string, input: unknown) => updateTabAction(gameId, tabId, input),
  uploadTabIconAction: vi.fn(),
}));

const { NewTabForm, NewTabPanel, TabDetailPanel } = await import("./GameTabsEditor");
const { TabsMasterList } = await import("./TabsMasterList");

function tab(id: string, label: string, layout: GameTab["layout"]): GameTab {
  return {
    id,
    slug: id,
    label,
    iconUrl: null,
    layout,
    linkHref: layout === "LINK" ? "/venda" : null,
    content: null,
    position: 0,
    isActive: true,
    productCount: 2,
  };
}

describe("NewTabForm", () => {
  beforeEach(() => {
    createTabAction.mockReset();
    push.mockReset();
  });

  it("'Nova aba' de Serviço já mostra os textos e os grava no create", async () => {
    createTabAction.mockResolvedValue({ ok: true, data: tab("t9", "Boosting", "SERVICE") });
    const onCreated = vi.fn();
    render(<NewTabForm gameId="g1" onCreated={onCreated} />);

    expect(screen.queryByText("+ Adicionar seção de texto")).toBeNull();
    fireEvent.click(screen.getByLabelText(/^Serviço/));
    fireEvent.click(screen.getByText("+ Adicionar seção de texto"));
    fireEvent.change(screen.getByLabelText("Título da seção 1"), { target: { value: "Como funciona" } });
    fireEvent.change(screen.getByPlaceholderText("Boosting"), { target: { value: "Boosting" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "+ CRIAR ABA" }));
    });
    await waitFor(() => expect(createTabAction).toHaveBeenCalledTimes(1));
    expect(createTabAction).toHaveBeenCalledWith("g1", {
      label: "Boosting",
      layout: "SERVICE",
      content: { sections: [{ title: "Como funciona", items: [] }] },
    });
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: "t9" }));
    // Rascunho limpo para a próxima aba.
    await waitFor(() => expect(screen.queryByText("+ Adicionar seção de texto")).toBeNull());
  });

  it("textos digitados e depois trocados para Catálogo não viajam", async () => {
    createTabAction.mockResolvedValue({ ok: true, data: tab("t9", "Moedas", "CATALOG") });
    render(<NewTabForm gameId="g1" onCreated={vi.fn()} />);

    fireEvent.click(screen.getByLabelText(/^Serviço/));
    fireEvent.click(screen.getByText("+ Adicionar seção de texto"));
    fireEvent.change(screen.getByLabelText("Título da seção 1"), { target: { value: "X" } });
    fireEvent.click(screen.getByLabelText(/^Catálogo/));
    fireEvent.change(screen.getByPlaceholderText("Boosting"), { target: { value: "Moedas" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "+ CRIAR ABA" }));
    });
    await waitFor(() => expect(createTabAction).toHaveBeenCalledTimes(1));
    expect(createTabAction).toHaveBeenCalledWith("g1", { label: "Moedas", layout: "CATALOG" });
  });

  it("na Central, a aba criada já abre à direita", async () => {
    createTabAction.mockResolvedValue({ ok: true, data: tab("t9", "Moedas", "CATALOG") });
    render(<NewTabPanel gameId="g1" />);
    fireEvent.change(screen.getByPlaceholderText("Boosting"), { target: { value: "Moedas" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "+ CRIAR ABA" }));
    });
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/admin/jogos/g1?secao=abas&aba=t9", { scroll: false }),
    );
  });
});

describe("TabsMasterList", () => {
  const tabs = [tab("t1", "Moedas", "CATALOG"), tab("t2", "Venda", "LINK")];

  beforeEach(() => {
    reorderTabsAction.mockReset();
    refresh.mockReset();
    push.mockReset();
  });

  it("cada aba é link da Central com `?aba=`, mantendo o servidor do filtro", () => {
    render(<TabsMasterList gameId="g1" tabs={tabs} selectedId="t1" serverId="s1" />);
    const nav = screen.getByRole("navigation", { name: "Abas do jogo" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/admin/jogos/g1?secao=abas&aba=t1&servidor=s1",
      "/admin/jogos/g1?secao=abas&aba=t2&servidor=s1",
      "/admin/jogos/g1?secao=abas&aba=nova",
    ]);
    expect(links[0]).toHaveAttribute("aria-current", "page");
  });

  it("↑ ↓ só mexem no rascunho; 'Salvar ordem' grava e revalida", async () => {
    reorderTabsAction.mockResolvedValue({ ok: true, data: undefined });
    render(<TabsMasterList gameId="g1" tabs={tabs} selectedId="t1" serverId="" />);
    const nav = screen.getByRole("navigation", { name: "Abas do jogo" });
    expect(within(nav).queryByRole("button", { name: "SALVAR ORDEM" })).toBeNull();

    fireEvent.click(within(nav).getByRole("button", { name: "Mover Venda para cima" }));
    expect(reorderTabsAction).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(within(nav).getByRole("button", { name: "SALVAR ORDEM" }));
    });
    await waitFor(() => expect(reorderTabsAction).toHaveBeenCalledWith("g1", ["t2", "t1"]));
    expect(refresh).toHaveBeenCalled();
  });

  it("o select (telas estreitas) navega sem rolar", () => {
    render(<TabsMasterList gameId="g1" tabs={tabs} selectedId="t1" serverId="" />);
    fireEvent.change(screen.getByLabelText("Aba"), { target: { value: "t2" } });
    expect(push).toHaveBeenCalledWith("/admin/jogos/g1?secao=abas&aba=t2", { scroll: false });
  });
});

describe("TabDetailPanel", () => {
  beforeEach(() => {
    updateTabAction.mockReset();
    refresh.mockReset();
  });

  it("ativar/ocultar grava na hora e revalida a página", async () => {
    const current = tab("t1", "Moedas", "CATALOG");
    updateTabAction.mockResolvedValue({ ok: true, data: { ...current, isActive: false } });
    render(<TabDetailPanel gameId="g1" gameSlug="poe" tab={current} />);
    expect(screen.getByRole("link", { name: "Ver na loja ↗" })).toHaveAttribute("href", "/games/poe?aba=t1");
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Ativa na loja"));
    });
    await waitFor(() => expect(updateTabAction).toHaveBeenCalledWith("g1", "t1", { isActive: false }));
    expect(refresh).toHaveBeenCalled();
  });

  it("configurações começam FECHADAS; o layout só troca a pedido", () => {
    render(<TabDetailPanel gameId="g1" gameSlug="poe" tab={tab("t1", "Moedas", "CATALOG")} />);
    expect(screen.queryByLabelText("Nome da aba")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Editar nome e layout" }));
    expect(screen.getByLabelText("Nome da aba")).toBeInTheDocument();
    // Os 6 cartões não ficam abertos de passagem.
    expect(screen.queryByRole("radio")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Trocar layout" }));
    expect(screen.getAllByRole("radio")).toHaveLength(6);
  });

  it("aba ativa e vazia mostra o aviso", () => {
    render(<TabDetailPanel gameId="g1" gameSlug="poe" tab={{ ...tab("t1", "Mentoria", "CATALOG"), productCount: 0 }} />);
    expect(screen.getByText(/não tem produto/)).toBeInTheDocument();
  });
});
