import { describe, expect, it } from "vitest";
import { BUILDER_STEPS, visibleSteps } from "./steps";

describe("BUILDER_STEPS (2026-11-09, lista do usuário)", () => {
  it("sete etapas, numeradas de 1 a 7, sem abas, produtos e logo", () => {
    expect(BUILDER_STEPS.map((step) => `${step.number} ${step.title}`)).toEqual([
      "1 Títulos",
      "2 Banner Principal",
      "3 Nome do game",
      "4 Servidores",
      "5 Categorias globais",
      "6 Descrição",
      "7 Ordem da página",
    ]);
  });

  it("nenhuma etapa é atalho, então ADMIN e EDITOR veem as mesmas", () => {
    expect(BUILDER_STEPS.every((step) => !step.href)).toBe(true);
    expect(visibleSteps(false)).toEqual(visibleSteps(true));
  });
});
