import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExitIntentCoupon } from "./ExitIntentCoupon";

/** Saída real do site (2026-11-05): fechar a aba ou Voltar para fora. */

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const offer = { code: "VOLTA10", discount: "10% OFF", conditions: "" };
const config = { title: "Antes de ir", text: "Leve o cupom", button: "Criar conta", days: 0 };

function leave() {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

/** O timer do `beforeunload` só corre depois do quadro: aqui, a escolha de ficar. */
function stay() {
  act(() => {
    vi.runOnlyPendingTimers();
  });
}

function clickLink(text: string) {
  const click = new MouseEvent("click", { bubbles: true, cancelable: true });
  // jsdom não navega: basta o evento chegar à captura do documento.
  screen.getByText(text).addEventListener("click", (event) => event.preventDefault());
  screen.getByText(text).dispatchEvent(click);
}

describe("ExitIntentCoupon ao sair do site", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    pathname = "/";
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.replaceState(null, "");
    document.cookie = "pt_authed_client=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("pede confirmação e abre o modal se a pessoa ficar, sem a espera do mouse", () => {
    render(<ExitIntentCoupon offer={offer} config={config} />);
    expect(leave().defaultPrevented).toBe(true);
    expect(screen.queryByText("Antes de ir")).toBeNull();
    stay();
    expect(screen.getByText("Antes de ir")).toBeTruthy();
  });

  it("não pede de novo depois de o modal abrir na visita", () => {
    render(<ExitIntentCoupon offer={offer} config={config} />);
    leave();
    stay();
    expect(leave().defaultPrevented).toBe(false);
  });

  it("não prende quem está logado", () => {
    document.cookie = "pt_authed_client=1";
    render(<ExitIntentCoupon offer={offer} config={config} />);
    expect(leave().defaultPrevented).toBe(false);
  });

  it("não prende nas rotas sem aviso", () => {
    pathname = "/checkout";
    render(<ExitIntentCoupon offer={offer} config={config} />);
    expect(leave().defaultPrevented).toBe(false);
  });

  it("link do próprio site não conta como sair", () => {
    render(
      <>
        <a href={`${window.location.origin}/rota-interna`}>interno</a>
        <ExitIntentCoupon offer={offer} config={config} />
      </>,
    );
    clickLink("interno");
    expect(leave().defaultPrevented).toBe(false);
  });

  it("link para outro site conta como sair", () => {
    render(
      <>
        <a href="https://exemplo.com/">externo</a>
        <ExitIntentCoupon offer={offer} config={config} />
      </>,
    );
    clickLink("externo");
    expect(leave().defaultPrevented).toBe(true);
  });

  it("F5 e envio de formulário não contam como sair", () => {
    render(<ExitIntentCoupon offer={offer} config={config} />);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "F5" }));
    expect(leave().defaultPrevented).toBe(false);
    vi.advanceTimersByTime(2_000);
    document.dispatchEvent(new Event("submit"));
    expect(leave().defaultPrevented).toBe(false);
  });

  it("passado o F5, sair volta a pedir confirmação", () => {
    render(<ExitIntentCoupon offer={offer} config={config} />);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "F5" }));
    vi.advanceTimersByTime(2_000);
    expect(leave().defaultPrevented).toBe(true);
  });

  describe("botão Voltar", () => {
    const nextState = { __NA: true, tree: "x" };
    const gesture = () => document.dispatchEvent(new Event("pointerup"));
    const pressBack = (state: unknown) =>
      act(() => {
        window.dispatchEvent(new PopStateEvent("popstate", { state }));
      });

    it("marca a chegada e empilha uma cópia só no primeiro gesto", () => {
      window.history.replaceState(nextState, "");
      const push = vi.spyOn(window.history, "pushState");
      const replace = vi.spyOn(window.history, "replaceState");
      render(<ExitIntentCoupon offer={offer} config={config} />);
      expect(push).not.toHaveBeenCalled();
      gesture();
      gesture();
      expect(replace).toHaveBeenCalledTimes(1);
      expect(replace.mock.calls[0][0]).toMatchObject({ __NA: true, l4tExitGuard: true });
      expect(push).toHaveBeenCalledTimes(1);
      expect(push.mock.calls[0][0]).toEqual(nextState);
      vi.restoreAllMocks();
    });

    it("espera a entrada ser do Next e não repete depois de um reload", () => {
      const push = vi.spyOn(window.history, "pushState");
      const { unmount } = render(<ExitIntentCoupon offer={offer} config={config} />);
      gesture();
      expect(push).not.toHaveBeenCalled();
      window.history.replaceState(nextState, "");
      gesture();
      expect(push).toHaveBeenCalledTimes(1);
      unmount();
      render(<ExitIntentCoupon offer={offer} config={config} />);
      gesture();
      expect(push).toHaveBeenCalledTimes(1);
      vi.restoreAllMocks();
    });

    it("não instala para quem está logado", () => {
      document.cookie = "pt_authed_client=1";
      window.history.replaceState(nextState, "");
      const push = vi.spyOn(window.history, "pushState");
      render(<ExitIntentCoupon offer={offer} config={config} />);
      gesture();
      expect(push).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    });

    it("abre o modal direto ao voltar à entrada marcada", () => {
      render(<ExitIntentCoupon offer={offer} config={config} />);
      pressBack({ l4tExitGuard: true });
      expect(screen.getByText("Antes de ir")).toBeTruthy();
    });

    it("ignora o Voltar entre páginas do site", () => {
      render(<ExitIntentCoupon offer={offer} config={config} />);
      pressBack({ __NA: true });
      expect(screen.queryByText("Antes de ir")).toBeNull();
    });

    it("com o modal já visto, segue o Voltar sozinho", () => {
      const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
      render(<ExitIntentCoupon offer={offer} config={config} />);
      pressBack({ l4tExitGuard: true });
      expect(back).not.toHaveBeenCalled();
      pressBack({ l4tExitGuard: true });
      expect(back).toHaveBeenCalledTimes(1);
      vi.restoreAllMocks();
    });
  });
});
