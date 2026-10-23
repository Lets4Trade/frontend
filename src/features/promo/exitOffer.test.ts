import { describe, expect, it } from "vitest";
import { exitOfferConfig, toExitOffer } from "./exitOffer";

/** Aviso de cupom ao sair (2026-10-23). */

describe("toExitOffer", () => {
  it("percentual em pontos-base, teto, mínimo e validade", () => {
    expect(
      toExitOffer({
        code: "VOLTA10",
        kind: "PERCENT",
        value: 1000,
        maxDiscountCents: 5000,
        minSubtotalCents: 2000,
        endsAt: "2026-10-31T23:00:00.000Z",
      }),
    ).toEqual({
      code: "VOLTA10",
      discount: "10% OFF",
      conditions: expect.stringMatching(/^Em compras a partir de R\$\s20,00 · até R\$\s50,00 de desconto · válido até 31\/10$/),
    });
  });

  it("valor fixo em centavos", () => {
    expect(toExitOffer({ code: "DEZ", kind: "FIXED", value: 1500 })).toMatchObject({
      discount: expect.stringMatching(/^R\$\s15,00 OFF$/),
      conditions: "",
    });
  });

  it("formato inesperado = sem aviso", () => {
    for (const raw of [null, {}, { code: "<b>", kind: "PERCENT", value: 10 }, { code: "OK1", kind: "X", value: 10 }, { code: "OK1", kind: "FIXED", value: 0 }]) {
      expect(toExitOffer(raw)).toBeNull();
    }
  });
});

describe("exitOfferConfig", () => {
  const section = (extras: Record<string, string>) => ({
    title: "",
    subtitle: "",
    extra: (name: string, fallback: string) => extras[name] ?? fallback,
  });

  it("desligado (padrão) = null; ligado usa os padrões e limita os dias", () => {
    expect(exitOfferConfig(section({}))).toBeNull();
    expect(exitOfferConfig(section({ ativo: "ligado" }))).toMatchObject({ button: "CRIAR CONTA E USAR", days: 7 });
    expect(exitOfferConfig(section({ ativo: "ligado", dias: "0" }))?.days).toBe(0);
    expect(exitOfferConfig(section({ ativo: "ligado", dias: "9999" }))?.days).toBe(365);
    expect(exitOfferConfig(section({ ativo: "ligado", dias: "abc" }))?.days).toBe(7);
  });
});
