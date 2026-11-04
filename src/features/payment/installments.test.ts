import { describe, expect, it } from "vitest";
import { installmentLimitFrom, maxInstallmentsFor, minInstallmentFrom } from "./types";

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
    expect(maxInstallmentsFor(20_000, 6)).toBe(4);
    expect(maxInstallmentsFor(100_000)).toBe(12);
  });
});

describe("parcela mínima configurável (2026-11-03)", () => {
  it("espelha o backend: reais → centavos, padrão R$ 50, preso a R$ 5..R$ 10.000", () => {
    expect(minInstallmentFrom("100")).toBe(10_000);
    expect(minInstallmentFrom("")).toBe(5_000);
    expect(minInstallmentFrom(null)).toBe(5_000);
    expect(minInstallmentFrom("abc")).toBe(5_000);
    expect(minInstallmentFrom("1")).toBe(500);
    expect(minInstallmentFrom("999999")).toBe(1_000_000);
  });

  it("o mínimo configurado corta as parcelas", () => {
    expect(maxInstallmentsFor(30_000, 12, 10_000)).toBe(3);
    expect(maxInstallmentsFor(30_000, 12, 3_000)).toBe(10);
    expect(maxInstallmentsFor(5_000, 12, 10_000)).toBe(1);
  });
});

describe("parcela mínima de R$ 50 (2026-11-03)", () => {
  it("abaixo de R$ 100 só à vista; à vista vale para qualquer valor", () => {
    expect(maxInstallmentsFor(9_999)).toBe(1);
    expect(maxInstallmentsFor(1)).toBe(1);
  });

  it("nenhuma parcela fica abaixo de R$ 50", () => {
    expect(maxInstallmentsFor(10_000)).toBe(2);
    expect(maxInstallmentsFor(14_999)).toBe(2);
    expect(maxInstallmentsFor(15_000)).toBe(3);
  });
});
