import { afterEach, describe, expect, it } from "vitest";
import { cssZoom } from "./siteZoom";

describe("cssZoom", () => {
  afterEach(() => {
    document.documentElement.style.zoom = "";
  });

  it("usa o zoom efetivo do elemento quando o navegador informa", () => {
    const element = document.createElement("div");
    Object.defineProperty(element, "currentCSSZoom", { value: 0.8 * 0.97 });
    expect(cssZoom(element)).toBeCloseTo(0.776);
  });

  it("sem `currentCSSZoom`, cai no zoom do <html>", () => {
    document.documentElement.style.zoom = "0.8";
    const zoom = cssZoom(document.createElement("div"));
    // jsdom pode não calcular `zoom`: nesse caso o fallback é 1, nunca 0/NaN.
    expect([0.8, 1]).toContain(zoom);
  });

  it("nunca devolve zero ou NaN (dividir por ele quebraria a posição)", () => {
    const element = document.createElement("div");
    Object.defineProperty(element, "currentCSSZoom", { value: 0 });
    const zoom = cssZoom(element);
    expect(zoom).toBeGreaterThan(0);
    expect(Number.isFinite(zoom)).toBe(true);
  });
});
