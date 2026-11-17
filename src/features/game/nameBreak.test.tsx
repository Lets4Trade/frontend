import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- stub de teste
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import { nameToText, splitName, textToName } from "./nameBreak";
import { ProductCardShell } from "./ProductCardShell";

describe("quebra do título no card (2026-11-17)", () => {
  it("só quebra num espaço do nome, com texto dos dois lados", () => {
    expect(splitName("Orbe Divino Raro", 4)).toEqual(["Orbe", "Divino Raro"]);
    expect(splitName("Orbe Divino Raro", 3)).toBeNull();
    expect(splitName("Orbe Divino", 0)).toBeNull();
    expect(splitName("Orbe Divino", undefined)).toBeNull();
    expect(splitName("Orbe Divino", 2.5)).toBeNull();
  });

  it("campo do painel ↔ nome numa linha + posição", () => {
    expect(textToName("Orbe Divino\nRaro Lendário")).toEqual({ name: "Orbe Divino Raro Lendário", nameBreak: 11 });
    // Espaços em volta da quebra somem; só a 1ª linha nova conta.
    expect(textToName("  Orbe   \n  Raro\nX ")).toEqual({ name: "Orbe Raro X", nameBreak: 4 });
    // Quebra no começo/fim = sem quebra.
    expect(textToName("\nOrbe")).toEqual({ name: "Orbe", nameBreak: null });
    expect(textToName("Orbe Divino")).toEqual({ name: "Orbe Divino", nameBreak: null });

    expect(nameToText("Orbe Divino Raro", 4)).toBe("Orbe\nDivino Raro");
    expect(nameToText("Orbe Divino Raro", 3)).toBe("Orbe Divino Raro");
  });

  it("o card mostra as duas linhas, e o nome inteiro no title", () => {
    const { container } = render(
      <ProductCardShell name="100 Conjunto Endgame Completo" nameBreak={20} price="R$ 1,00" actions={null} />,
    );
    const h3 = container.querySelector("h3")!;
    expect([...h3.querySelectorAll("span")].map((span) => span.textContent)).toEqual([
      "100 Conjunto Endgame",
      "Completo",
    ]);
    expect(h3.getAttribute("title")).toBe("100 Conjunto Endgame Completo");
  });
});
