import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MoneyField, parseFineMoney } from "./MoneyField";

/** Preço com até 4 casas (2026-11-09, "preciso colocar 0,035"). */
describe("parseFineMoney", () => {
  it.each([
    ["0,035", 3.5],
    ["0,0035", 0.35],
    ["129,90", 12990],
    ["R$ 1.234,5", 123450],
    ["0.035", 3.5],
    ["4.10", 410],
    ["1.234", 123400],
    ["", 0],
    ["0,", 0],
    [",5", 50],
  ])("%s → %s centavos", (raw, cents) => {
    expect(parseFineMoney(raw)).toBe(cents);
  });

  it.each(["0,03555", "1,2,3", "abc"])("%s não é valor", (raw) => {
    expect(parseFineMoney(raw)).toBeNull();
  });
});

describe("MoneyField com 4 casas", () => {
  function setup(defaultCents?: number) {
    const onCentsChange = vi.fn();
    const { container } = render(
      <form>
        <MoneyField label="Preço" name="priceCents" fractionDigits={4} defaultCents={defaultCents} onCentsChange={onCentsChange} />
      </form>,
    );
    const input = screen.getByLabelText("Preço") as HTMLInputElement;
    const hidden = container.querySelector('input[name="priceCents"]') as HTMLInputElement;
    return { input, hidden, onCentsChange };
  }

  it("deixa digitar 0,035 tecla a tecla e manda 3.5 centavos", () => {
    const { input, hidden, onCentsChange } = setup();
    for (const step of ["0", "0,", "0,0", "0,03", "0,035"]) {
      fireEvent.change(input, { target: { value: step } });
      expect(input.value).toBe(step);
    }
    expect(hidden.value).toBe("3.5");
    expect(onCentsChange).toHaveBeenLastCalledWith(3.5);
    fireEvent.blur(input);
    expect(input.value.replace(/\s/g, " ")).toBe("R$ 0,035");
  });

  it("ignora a 5ª casa e mostra o valor salvo formatado", () => {
    const { input, hidden } = setup(3.5);
    expect(input.value.replace(/\s/g, " ")).toBe("R$ 0,035");
    fireEvent.change(input, { target: { value: "R$ 0,03555" } });
    expect(hidden.value).toBe("3.5");
  });

  it("apagar tudo é R$ 0 (preço base vazio em Serviço)", () => {
    const { input, hidden } = setup(1990);
    fireEvent.change(input, { target: { value: "" } });
    expect(hidden.value).toBe("0");
  });
});
