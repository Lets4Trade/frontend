import { describe, expect, it } from "vitest";
import { installmentLimitFrom, maxInstallmentsFor } from "./types";

// Espelho de `backend/src/app/payments/payment.rules.spec.ts` (2026-10-28):
// a prévia do checkout tem que oferecer as mesmas parcelas que o backend aceita.
describe("limite de parcelas configurável", () => {
  it("lê o texto salvo no painel", () => {
    expect(installmentLimitFrom("6")).toBe(6);
    expect(installmentLimitFrom(" 1 ")).toBe(1);
  });

  it("vazio ou inválido fica no teto de antes (12)", () => {
    expect(installmentLimitFrom("")).toBe(12);
    expect(installmentLimitFrom(null)).toBe(12);
    expect(installmentLimitFrom("doze")).toBe(12);
  });

  it("preso a 1..12", () => {
    expect(installmentLimitFrom("24")).toBe(12);
    expect(installmentLimitFrom("0")).toBe(1);
  });

  it("o limite corta as parcelas e a parcela mínima continua valendo", () => {
    expect(maxInstallmentsFor(100_000, 6)).toBe(6);
    expect(maxInstallmentsFor(100_000, 1)).toBe(1);
    expect(maxInstallmentsFor(2_000, 6)).toBe(4);
    expect(maxInstallmentsFor(100_000)).toBe(12);
  });
});
