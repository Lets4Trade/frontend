import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { continueShoppingHref } from "@/features/checkout/CheckoutClient";
import { QuantityField } from "./QuantityField";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

function Harness({ min = 1, max = Number.MAX_SAFE_INTEGER, onValue }: { min?: number; max?: number; onValue?: (n: number) => void }) {
  const [value, setValue] = useState(min);
  return (
    <QuantityField
      value={value}
      min={min}
      max={max}
      label="Quantidade"
      onChange={(n) => {
        setValue(n);
        onValue?.(n);
      }}
    />
  );
}

const field = () => screen.getByRole("textbox", { name: "Quantidade" }) as HTMLInputElement;

describe("QuantityField (2026-11-18: digitar a quantidade)", () => {
  it("aceita 10000000 digitado e mostra com pontos fora da edição", () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "10000000" } });
    expect(onValue).toHaveBeenLastCalledWith(10_000_000);
    expect(field().value).toBe("10000000");
    fireEvent.blur(field());
    expect(field().value).toBe("10.000.000");
  });

  it("só dígitos; vazio ou abaixo do mínimo não grava e volta ao último valor bom", () => {
    const onValue = vi.fn();
    render(<Harness min={100} onValue={onValue} />);
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "1a5" } });
    expect(field().value).toBe("15");
    expect(onValue).not.toHaveBeenCalled();
    fireEvent.change(field(), { target: { value: "" } });
    fireEvent.blur(field());
    expect(field().value).toBe("100");
  });

  it("corta no teto e ↑/↓ somam e tiram um", () => {
    const onValue = vi.fn();
    render(<Harness max={50} onValue={onValue} />);
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "999" } });
    expect(onValue).toHaveBeenLastCalledWith(50);
    fireEvent.keyDown(field(), { key: "ArrowDown" });
    expect(onValue).toHaveBeenLastCalledWith(49);
    fireEvent.keyDown(field(), { key: "ArrowUp" });
    expect(onValue).toHaveBeenLastCalledWith(50);
  });
});

describe("continueShoppingHref", () => {
  it("jogo do último item; carrinho vazio vai para a home", () => {
    expect(continueShoppingHref([{ gameSlug: "diablo" }, { gameSlug: "path-of-exile-2" }])).toBe("/path-of-exile-2");
    expect(continueShoppingHref([])).toBe("/");
  });
});
