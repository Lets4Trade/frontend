import { afterEach, describe, expect, it } from "vitest";
import {
  consentModeOf,
  googleTagIds,
  initGoogleTag,
  purchaseConversion,
  trackPurchase,
  updateGoogleConsent,
} from "./gtag";

type W = Window & { dataLayer?: IArguments[]; gtag?: unknown };
const w = window as W;
const calls = () => (w.dataLayer ?? []).map((args) => Array.from(args));

afterEach(() => {
  delete w.dataLayer;
  delete w.gtag;
});

describe("googleTagIds", () => {
  it("aceita AW-/G- e descarta o resto (o ID vai para a URL do script)", () => {
    expect(googleTagIds(" aw-123456789 , G-ABC123XYZ, x\"><script>, ")).toEqual(["AW-123456789", "G-ABC123XYZ"]);
    expect(googleTagIds(undefined)).toEqual([]);
  });
});

describe("purchaseConversion", () => {
  it("só no formato AW-id/rótulo", () => {
    expect(purchaseConversion("AW-123456789/AbC_d-9")).toBe("AW-123456789/AbC_d-9");
    expect(purchaseConversion("AW-123456789")).toBeNull();
    expect(purchaseConversion("")).toBeNull();
  });
});

describe("consentModeOf", () => {
  it("Publicidade liga os três sinais de anúncio; Medição liga o analytics", () => {
    expect(consentModeOf({ measurement: true, media: false, marketing: false })).toEqual({
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    expect(consentModeOf({ measurement: false, media: false, marketing: true })).toMatchObject({
      analytics_storage: "denied",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    });
  });
});

describe("initGoogleTag / trackPurchase", () => {
  it("consentimento padrão vem ANTES da configuração dos IDs", () => {
    initGoogleTag(["AW-1234", "G-ABCD"], { measurement: true, media: false, marketing: false });
    const list = calls();
    expect(list[0][0]).toBe("consent");
    expect(list[0][1]).toBe("default");
    expect(list.findIndex((c) => c[0] === "config")).toBeGreaterThan(0);
    expect(list.filter((c) => c[0] === "config").map((c) => c[1])).toEqual(["AW-1234", "G-ABCD"]);
    expect(list).toContainEqual(["set", "ads_data_redaction", true]);
  });

  it("retirar o consentimento manda update negado", () => {
    initGoogleTag(["G-ABCD"], { measurement: true, media: false, marketing: true });
    updateGoogleConsent({ measurement: false, media: false, marketing: false });
    const update = calls().find((c) => c[0] === "consent" && c[1] === "update");
    expect(update?.[2]).toMatchObject({ analytics_storage: "denied", ad_storage: "denied" });
  });

  it("sem gtag carregado (sem consentimento), a compra não vai a lugar nenhum", () => {
    trackPurchase({ id: "pay-x", amountCents: 1000 });
    expect(w.dataLayer).toBeUndefined();
  });

  it("compra vai uma vez só por pagamento, em reais", () => {
    initGoogleTag(["G-ABCD"], { measurement: true, media: false, marketing: true });
    trackPurchase({ id: "pay-1", amountCents: 6520 });
    trackPurchase({ id: "pay-1", amountCents: 6520 });
    const purchases = calls().filter((c) => c[0] === "event" && c[1] === "purchase");
    expect(purchases).toEqual([["event", "purchase", { transaction_id: "pay-1", value: 65.2, currency: "BRL" }]]);
  });
});
