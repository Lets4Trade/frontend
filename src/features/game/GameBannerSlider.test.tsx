import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- stub de teste
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import { GameBannerSlider } from "./GameBannerSlider";
import type { GameBanner } from "./types";

const banner = (id: string, href?: string): GameBanner => ({
  id,
  image: { src: `/${id}.webp`, alt: "", width: 1715, height: 490 },
  href,
});
const three = [banner("a", "/promo"), banner("b"), banner("c")];

const activeSlide = () =>
  screen.getAllByRole("group", { hidden: true }).findIndex((slide) => slide.getAttribute("aria-hidden") === "false");

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: reduce }) as unknown as typeof window.matchMedia;
}

describe("GameBannerSlider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockReducedMotion(false);
  });
  afterEach(() => vi.useRealTimers());

  it("um banner só: sem setas nem barrinhas", () => {
    render(<GameBannerSlider banners={[banner("a")]} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("setas, barrinhas e teclado trocam de banner (e dão a volta)", () => {
    render(<GameBannerSlider banners={three} />);
    expect(activeSlide()).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "Próximo banner" }));
    expect(activeSlide()).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Ver banner 3 de 3" }));
    expect(activeSlide()).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: "Próximo banner" }));
    expect(activeSlide()).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Banner anterior" }));
    expect(activeSlide()).toBe(2);

    fireEvent.keyDown(screen.getByRole("region"), { key: "ArrowRight" });
    expect(activeSlide()).toBe(0);
    expect(screen.getByRole("button", { name: "Ver banner 1 de 3" }).getAttribute("aria-current")).toBe("true");
  });

  it("passa sozinho a cada 6s e pausa com o mouse em cima", () => {
    render(<GameBannerSlider banners={three} />);
    act(() => vi.advanceTimersByTime(6000));
    expect(activeSlide()).toBe(1);

    fireEvent.mouseEnter(screen.getByRole("region"));
    act(() => vi.advanceTimersByTime(20000));
    expect(activeSlide()).toBe(1);

    fireEvent.mouseLeave(screen.getByRole("region"));
    act(() => vi.advanceTimersByTime(6000));
    expect(activeSlide()).toBe(2);
  });

  it("parado com prefers-reduced-motion e na prévia (autoPlay=false)", () => {
    mockReducedMotion(true);
    const { unmount } = render(<GameBannerSlider banners={three} />);
    act(() => vi.advanceTimersByTime(20000));
    expect(activeSlide()).toBe(0);
    unmount();

    mockReducedMotion(false);
    render(<GameBannerSlider banners={three} autoPlay={false} />);
    act(() => vi.advanceTimersByTime(20000));
    expect(activeSlide()).toBe(0);
  });

  it("slide escondido fica inerte (o link dele não recebe foco)", () => {
    render(<GameBannerSlider banners={three} />);
    fireEvent.click(screen.getByRole("button", { name: "Próximo banner" }));
    const first = screen.getAllByRole("group", { hidden: true })[0];
    expect(first.hasAttribute("inert")).toBe(true);
    expect(first.querySelector("a")?.getAttribute("href")).toBe("/promo");
  });
});
