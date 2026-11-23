import { fireEvent, render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { useBannerSwipe } from "./useBannerSwipe";

function Probe({ count, onLink }: { count: number; onLink?: () => void }) {
  const [active, setActive] = useState(0);
  const swipe = useBannerSwipe({
    enabled: count > 1,
    onSwipe: (step) => setActive((value) => (((value + step) % count) + count) % count),
  });
  return (
    <div data-testid="box" {...swipe}>
      <p data-testid="shown">{active}</p>
      <a href="#x" onClick={(event) => (event.defaultPrevented ? null : onLink?.())}>
        link
      </a>
    </div>
  );
}

function drag(box: HTMLElement, dx: number, dy = 0, pointerType = "touch") {
  fireEvent.pointerDown(box, { clientX: 200, clientY: 100, pointerType });
  fireEvent.pointerUp(box, { clientX: 200 + dx, clientY: 100 + dy, pointerType });
}

describe("useBannerSwipe (arrastar com o dedo troca de banner)", () => {
  it("dedo para a esquerda = próximo; para a direita = anterior, dando a volta", () => {
    const { getByTestId } = render(<Probe count={3} />);
    drag(getByTestId("box"), -80);
    expect(getByTestId("shown").textContent).toBe("1");
    drag(getByTestId("box"), 80);
    drag(getByTestId("box"), 80);
    expect(getByTestId("shown").textContent).toBe("2");
  });

  it("ignora toque curto, gesto vertical, mouse e banner de uma arte só", () => {
    const many = render(<Probe count={3} />);
    const box = many.getAllByTestId("box")[0];
    drag(box, -30);
    drag(box, -60, 120);
    drag(box, -80, 0, "mouse");
    expect(many.getAllByTestId("shown")[0].textContent).toBe("0");

    const single = render(<Probe count={1} />);
    drag(single.getAllByTestId("box")[1], -80);
    expect(single.getAllByTestId("shown")[1].textContent).toBe("0");
  });

  it("o clique que vem logo após o arrasto não abre o link", () => {
    const onLink = vi.fn();
    const { getByTestId, getByText } = render(<Probe count={2} onLink={onLink} />);
    drag(getByTestId("box"), -80);
    fireEvent.click(getByText("link"));
    expect(onLink).not.toHaveBeenCalled();
  });
});
