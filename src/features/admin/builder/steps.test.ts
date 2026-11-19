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
      "7 Blocos e ordem",
    ]);
  });

  it("só 'Blocos e ordem' é atalho, para o construtor da página do jogo (2026-11-18)", () => {
    expect(BUILDER_STEPS.filter((step) => step.href).map((step) => step.id)).toEqual(["ordem"]);
    expect(BUILDER_STEPS.find((step) => step.id === "ordem")?.href?.("g1", "jogo")).toBe("/admin/paginas?pagina=jogo-g1");
    expect(visibleSteps(false)).toEqual(visibleSteps(true));
  });
});
