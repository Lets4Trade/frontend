import { describe, expect, it } from "vitest";
import { formatCardExpiry, formatCnpj, formatPhone } from "./masks";

describe("formatPhone", () => {
  it("formata celular e fixo nacionais", () => {
    expect(formatPhone("11912345678")).toBe("(11) 91234-5678");
    expect(formatPhone("1134567890")).toBe("(11) 3456-7890");
  });

  it("é progressivo enquanto se digita", () => {
    expect(formatPhone("1")).toBe("(1");
    expect(formatPhone("11")).toBe("(11");
    expect(formatPhone("119")).toBe("(11) 9");
    expect(formatPhone("1191234")).toBe("(11) 9123-4");
    expect(formatPhone("")).toBe("");
  });

  it("reformata o que já tem pontuação (colar, apagar)", () => {
    expect(formatPhone("(11) 91234-5678")).toBe("(11) 91234-5678");
    expect(formatPhone("11 9 1234 5678")).toBe("(11) 91234-5678");
  });

  it("DDI 55 com + ou 12+ dígitos", () => {
    expect(formatPhone("+5511912345678")).toBe("+55 (11) 91234-5678");
    expect(formatPhone("5511912345678")).toBe("+55 (11) 91234-5678");
    expect(formatPhone("+55")).toBe("+55");
    expect(formatPhone("+")).toBe("+");
  });

  it("55 com até 11 dígitos é DDD, não DDI", () => {
    expect(formatPhone("55991234567")).toBe("(55) 99123-4567");
  });

  it("outros países ficam + dígitos, com teto E.164", () => {
    expect(formatPhone("+1 (415) 555-0100")).toBe("+14155550100");
    expect(formatPhone("+1234567890123456789")).toBe("+123456789012345");
  });

  it("ignora letras e símbolos", () => {
    expect(formatPhone("abc11def912345678")).toBe("(11) 91234-5678");
  });
});

describe("formatCnpj", () => {
  it("formata o CNPJ numérico, progressivo", () => {
    expect(formatCnpj("12345678000190")).toBe("12.345.678/0001-90");
    expect(formatCnpj("12")).toBe("12");
    expect(formatCnpj("123")).toBe("12.3");
    expect(formatCnpj("123456789")).toBe("12.345.678/9");
  });

  it("aceita o CNPJ alfanumérico em maiúsculas", () => {
    expect(formatCnpj("12abc34501de35")).toBe("12.ABC.345/01DE-35");
  });

  it("dígitos verificadores são sempre números, e o tamanho tem teto", () => {
    expect(formatCnpj("12ABC34501DEXY")).toBe("12.ABC.345/01DE");
    expect(formatCnpj("12345678000190999")).toBe("12.345.678/0001-90");
  });
});

describe("formatCardExpiry", () => {
  it("coloca a barra sozinha depois do mês", () => {
    expect(formatCardExpiry("1")).toBe("1");
    expect(formatCardExpiry("12")).toBe("12/");
    expect(formatCardExpiry("123")).toBe("12/3");
    expect(formatCardExpiry("1225")).toBe("12/25");
  });

  it("mês começando por 2–9 ganha o zero", () => {
    expect(formatCardExpiry("3")).toBe("03/");
    expect(formatCardExpiry("925")).toBe("09/25");
  });

  it("ignora o que não é dígito e corta no tamanho", () => {
    expect(formatCardExpiry("12/25")).toBe("12/25");
    expect(formatCardExpiry("12a/2b5")).toBe("12/25");
    expect(formatCardExpiry("122599")).toBe("12/25");
  });

  it("ano com 4 dígitos colado vira 2", () => {
    expect(formatCardExpiry("12/2025")).toBe("12/25");
    expect(formatCardExpiry("3/2027")).toBe("03/27");
  });

  it("apagar a barra não trava: o 'MM' sem barra volta formatado", () => {
    expect(formatCardExpiry("12")).toBe("12/");
    expect(formatCardExpiry("1/")).toBe("1");
    expect(formatCardExpiry("")).toBe("");
  });
});
