import { act, render } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BANNER_INTERVAL_MS, useBannerAutoplay } from "./useBannerAutoplay";

function Probe({ count, paused = false }: { count: number; paused?: boolean }) {
  const [active, setActive] = useState(0);
  useBannerAutoplay({ count, current: active, setActive, paused });
  return <p>{active}</p>;
}

const shown = (container: HTMLElement) => container.textContent;

describe("useBannerAutoplay (timer único: banner do jogo e da home)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
  });
  afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState(null, "", "/");
  });

  it("passa a cada 6 s e volta ao começo", () => {
    const { container } = render(<Probe count={2} />);
    expect(shown(container)).toBe("0");
    act(() => vi.advanceTimersByTime(BANNER_INTERVAL_MS));
    expect(shown(container)).toBe("1");
    act(() => vi.advanceTimersByTime(BANNER_INTERVAL_MS));
    expect(shown(container)).toBe("0");
  });

  it("parado: pausado, uma arte só, ou dentro do painel (/admin)", () => {
    const paused = render(<Probe count={2} paused />);
    const single = render(<Probe count={1} />);
    act(() => vi.advanceTimersByTime(BANNER_INTERVAL_MS * 2));
    expect(shown(paused.container)).toBe("0");
    expect(shown(single.container)).toBe("0");

    window.history.replaceState(null, "", "/admin/paginas?pagina=home");
    const admin = render(<Probe count={2} />);
    act(() => vi.advanceTimersByTime(BANNER_INTERVAL_MS * 2));
    expect(shown(admin.container)).toBe("0");
  });
});
