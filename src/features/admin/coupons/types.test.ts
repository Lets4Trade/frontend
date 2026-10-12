import { describe, expect, it } from "vitest";
import {
  couponPayloadProblem,
  couponStatus,
  couponSummary,
  discountLabel,
  formatPercentInput,
  isoToLocalInput,
  localInputToIso,
  parseOptionalInt,
  parsePercentBps,
  scopeLabel,
  toAdminCoupon,
  toAdminCouponPage,
  toTargetGames,
  usageLabel,
  validityLabel,
  type CouponPayload,
} from "./types";

const BASE: CouponPayload = {
  code: "TESTE10",
  description: null,
  isActive: true,
  kind: "PERCENT",
  value: 1000,
  maxDiscountCents: null,
  minSubtotalCents: null,
  startsAt: null,
  endsAt: null,
  maxUses: null,
  maxUsesPerUser: null,
  gameIds: [],
  tabIds: [],
  productIds: [],
  allowCoins: true,
  rewardsOnDiscounted: true,
};

describe("toAdminCoupon", () => {
  it("lê o cupom; campos apagados pelo backend = nulo / falso / vazio", () => {
    const coupon = toAdminCoupon({ id: "c1", code: "TESTE10", kind: "PERCENT", value: 1000, usedCount: 3 });
    expect(coupon).toMatchObject({
      id: "c1",
      code: "TESTE10",
      description: "",
      isActive: false,
      maxDiscountCents: null,
      startsAt: null,
      gameIds: [],
      allowCoins: false,
      usedCount: 3,
      targets: { games: [], tabs: [], products: [] },
    });
  });

  it("lê o alcance com nomes e recusa formato estranho", () => {
    const coupon = toAdminCoupon({
      id: "c1",
      code: "X",
      kind: "FIXED",
      value: 2000,
      isActive: true,
      gameIds: ["g1", 7, "bad id!"],
      targets: {
        games: [{ id: "g1", name: "Diablo" }],
        tabs: [{ id: "t1", label: "Gold", gameName: "Diablo" }],
        products: [{ id: "p1", name: "100K Gold", gameName: "Diablo", server: "SC" }],
      },
    });
    expect(coupon?.gameIds).toEqual(["g1"]);
    expect(coupon?.targets.products).toEqual([{ id: "p1", name: "100K Gold", gameName: "Diablo", server: "SC", tab: null }]);
    expect(toAdminCoupon({ id: "c1", kind: "OUTRO", value: 1 })).toBeNull();
    expect(toAdminCoupon(null)).toBeNull();
  });

  it("página e jogos do alcance", () => {
    expect(toAdminCouponPage({ items: [{ id: "c1", kind: "PERCENT", value: 1 }, null], total: 1, page: 1, pageCount: 1 })?.items).toHaveLength(1);
    expect(toTargetGames([{ id: "g1", name: "Diablo", tabs: [{ id: "t1", label: "Gold" }] }, { id: "!" }])).toEqual([
      { id: "g1", name: "Diablo", tabs: [{ id: "t1", label: "Gold" }] },
    ]);
  });
});

describe("conversões", () => {
  it("percentual ↔ pontos-base", () => {
    expect(parsePercentBps("10")).toBe(1000);
    expect(parsePercentBps("12,5")).toBe(1250);
    expect(parsePercentBps("12.5%")).toBe(1250);
    expect(parsePercentBps("abc")).toBeNull();
    expect(parsePercentBps("1000")).toBeNull();
    expect(formatPercentInput(1250)).toBe("12,5");
  });

  it("inteiro opcional: vazio = sem limite, lixo = NaN", () => {
    expect(parseOptionalInt("")).toBeNull();
    expect(parseOptionalInt("1.000")).toBe(1000);
    expect(parseOptionalInt("abc")).toBeNaN();
  });

  it("datetime-local ida e volta no fuso do navegador", () => {
    const iso = localInputToIso("2026-10-12T18:30");
    expect(iso).not.toBeNull();
    expect(isoToLocalInput(iso)).toBe("2026-10-12T18:30");
    expect(localInputToIso("")).toBeNull();
  });
});

describe("rótulos da lista", () => {
  it("desconto, usos, validade e alcance", () => {
    expect(discountLabel({ kind: "PERCENT", value: 1000 })).toBe("10%");
    expect(discountLabel({ kind: "FIXED", value: 2000 })).toMatch(/R\$\s20,00/);
    expect(usageLabel({ usedCount: 3, maxUses: 100 })).toBe("3 / 100");
    expect(usageLabel({ usedCount: 1, maxUses: null })).toBe("1 uso");
    expect(validityLabel({ startsAt: null, endsAt: null })).toBe("Sem validade");
    expect(validityLabel({ startsAt: null, endsAt: "2026-10-12T21:00:00.000Z" })).toBe("Até 12/10/26 18:00");
    expect(scopeLabel({ gameIds: [], tabIds: [], productIds: [] })).toBe("Loja toda");
    expect(scopeLabel({ gameIds: ["a", "b"], tabIds: ["t"], productIds: ["p", "q", "r"] })).toBe("2 jogos · 1 aba · 3 produtos");
  });

  it("situação: desligado, expirado, esgotado, agendado, valendo", () => {
    const now = Date.parse("2026-10-12T12:00:00Z");
    const base = { isActive: true, startsAt: null, endsAt: null, maxUses: null, usedCount: 0 };
    expect(couponStatus({ ...base, isActive: false }, now).label).toBe("Desligado");
    expect(couponStatus({ ...base, endsAt: "2026-10-11T00:00:00Z" }, now).label).toBe("Expirado");
    expect(couponStatus({ ...base, maxUses: 2, usedCount: 2 }, now).label).toBe("Esgotado");
    expect(couponStatus({ ...base, startsAt: "2026-10-13T00:00:00Z" }, now).label).toBe("Agendado");
    expect(couponStatus(base, now).label).toBe("Valendo");
  });
});

describe("couponPayloadProblem", () => {
  it("aceita o válido e recusa cada campo fora", () => {
    expect(couponPayloadProblem(BASE)).toBeNull();
    expect(couponPayloadProblem({ ...BASE, code: "a" })).toMatch(/código/);
    expect(couponPayloadProblem({ ...BASE, value: 10_001 })).toMatch(/percentual/);
    expect(couponPayloadProblem({ ...BASE, value: Number.NaN })).toMatch(/percentual/);
    expect(couponPayloadProblem({ ...BASE, maxUses: Number.NaN })).toMatch(/limites/);
    expect(couponPayloadProblem({ ...BASE, maxUses: 2, maxUsesPerUser: 3 })).toMatch(/por cliente/);
    expect(
      couponPayloadProblem({ ...BASE, startsAt: "2026-10-12T10:00:00Z", endsAt: "2026-10-12T09:00:00Z" }),
    ).toMatch(/fim/);
  });
});

describe("couponSummary", () => {
  it("resume a regra numa frase", () => {
    const text = couponSummary({ ...BASE, maxDiscountCents: 5000, minSubtotalCents: 10000, maxUses: 100 }, 3);
    expect(text).toMatch(/^10% de desconto, máx\. R\$\s50,00, a partir de R\$\s100,00 · /);
    expect(text).toContain("sem data de fim");
    expect(text).toContain("3 de 100 usos");
  });
});
