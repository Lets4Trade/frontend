import { describe, expect, it } from "vitest";
import { CHECKOUT_LOGIN_HREF, isCheckoutRedirect } from "./loginHref";

describe("loginHref", () => {
  it("o login do checkout volta para /checkout", () => {
    expect(new URLSearchParams(CHECKOUT_LOGIN_HREF.split("?")[1]).get("redirect")).toBe("/checkout");
  });

  it("reconhece só o checkout como destino", () => {
    expect(isCheckoutRedirect("/checkout")).toBe(true);
    expect(isCheckoutRedirect("/checkout?cupom=X")).toBe(true);
    expect(isCheckoutRedirect("/checkout-falso")).toBe(false);
    expect(isCheckoutRedirect("/conta")).toBe(false);
    expect(isCheckoutRedirect("")).toBe(false);
    expect(isCheckoutRedirect(null)).toBe(false);
  });
});
