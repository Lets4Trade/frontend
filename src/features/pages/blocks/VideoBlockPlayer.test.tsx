import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VideoBlockPlayer } from "./VideoBlockPlayer";

/** Vídeo que toca sozinho ao aparecer (2026-10-16). */

let trigger: (ratio: number) => void = () => undefined;
let reducedMotion = false;

beforeEach(() => {
  class FakeObserver {
    constructor(private cb: IntersectionObserverCallback) {
      trigger = (ratio) =>
        this.cb([{ isIntersecting: ratio > 0, intersectionRatio: ratio } as IntersectionObserverEntry], this as never);
    }
    observe() {}
    disconnect() {}
  }
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  vi.stubGlobal(
    "matchMedia",
    (query: string) => ({ matches: query.includes("reduce") ? reducedMotion : false }) as MediaQueryList,
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  reducedMotion = false;
});

describe("VideoBlockPlayer", () => {
  it("só monta o player quando o bloco aparece; toca mudo com 'Ativar som'", () => {
    const { container } = render(<VideoBlockPlayer videoId="HF8sUrLFo4U" title="Vídeo" />);
    expect(container.querySelector("iframe")).toBeNull();

    // Pouco visível ainda não conta.
    act(() => trigger(0.2));
    expect(container.querySelector("iframe")).toBeNull();

    act(() => trigger(0.6));
    const src = container.querySelector("iframe")?.getAttribute("src") ?? "";
    expect(src).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/HF8sUrLFo4U\?/);
    expect(src).toContain("autoplay=1");
    expect(src).toContain("mute=1");
    expect(screen.getByRole("button", { name: /Ativar som/ })).toBeInTheDocument();
  });

  it("quem pediu menos movimento fica com a capa; o play monta o player", () => {
    reducedMotion = true;
    const { container } = render(<VideoBlockPlayer videoId="HF8sUrLFo4U" title="Vídeo" />);
    act(() => trigger(1));
    expect(container.querySelector("iframe")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Assistir: Vídeo" }));
    expect(container.querySelector("iframe")).not.toBeNull();
  });
});
