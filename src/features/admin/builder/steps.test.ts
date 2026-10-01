import { describe, expect, it } from "vitest";
import { BUILDER_STEPS, visibleSteps } from "./steps";

describe("visibleSteps", () => {
  it("ADMIN vê todas; EDITOR não vê atalhos para telas só-ADMIN", () => {
    expect(visibleSteps(true)).toHaveLength(BUILDER_STEPS.length);
    const editor = visibleSteps(false);
    expect(editor.map((step) => step.id)).not.toContain("categorias-principais");
    expect(editor.map((step) => step.id)).not.toContain("produtos");
    expect(editor.every((step) => !step.href)).toBe(true);
  });

  it("a etapa 5 leva à Central do jogo", () => {
    const step = BUILDER_STEPS.find((item) => item.id === "categorias-principais");
    expect(step?.href?.("g1", "poe")).toBe("/admin/jogos/g1?secao=abas");
  });
});
