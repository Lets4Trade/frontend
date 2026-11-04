import { afterEach, describe, expect, it } from "vitest";
import {
  CONSENT_COOKIE,
  CONSENT_VERSION,
  hasConsent,
  parseConsent,
  readConsent,
  saveConsent,
} from "./consent";

function clearCookie() {
  document.cookie = `${CONSENT_COOKIE}=; Max-Age=0; Path=/`;
}

describe("parseConsent", () => {
  it("sem cookie = sem escolha", () => {
    expect(parseConsent(undefined)).toBeNull();
    expect(parseConsent("")).toBeNull();
  });

  it("lixo ou JSON quebrado = sem escolha (o aviso volta)", () => {
    expect(parseConsent("abc")).toBeNull();
    expect(parseConsent(encodeURIComponent('{"version":1,"measurement":"sim","media":true}'))).toBeNull();
  });

  it("versão antiga = sem escolha (consentimento vale para a lista que foi mostrada)", () => {
    const old = encodeURIComponent(JSON.stringify({ version: CONSENT_VERSION - 1, measurement: true, media: true, marketing: true }));
    expect(parseConsent(old)).toBeNull();
  });

  it("valor válido volta com as escolhas", () => {
    const raw = encodeURIComponent(
      JSON.stringify({
        version: CONSENT_VERSION,
        measurement: true,
        media: false,
        marketing: true,
        at: "2026-11-03T00:00:00Z",
      }),
    );
    expect(parseConsent(raw)).toEqual({
      version: CONSENT_VERSION,
      measurement: true,
      media: false,
      marketing: true,
      at: "2026-11-03T00:00:00Z",
    });
  });
});

describe("saveConsent / readConsent", () => {
  afterEach(clearCookie);

  it("sem escolha, nada opcional é permitido", () => {
    expect(readConsent()).toBeNull();
    expect(hasConsent("measurement")).toBe(false);
    expect(hasConsent("media")).toBe(false);
  });

  it("grava, avisa os ouvintes e relê", () => {
    let calls = 0;
    const listener = () => calls++;
    window.addEventListener("l4t:consent", listener);
    saveConsent({ measurement: false, media: true, marketing: false });
    window.removeEventListener("l4t:consent", listener);

    expect(calls).toBe(1);
    expect(hasConsent("measurement")).toBe(false);
    expect(hasConsent("media")).toBe(true);
    expect(hasConsent("marketing")).toBe(false);
  });

  it("mesma string = mesmo objeto (useSyncExternalStore não entra em laço)", () => {
    saveConsent({ measurement: true, media: true, marketing: true });
    expect(readConsent()).toBe(readConsent());
  });
});
