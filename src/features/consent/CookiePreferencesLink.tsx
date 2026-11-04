"use client";

import { openConsentPreferences } from "./consent";

/**
 * "Preferências de cookies" no rodapé (2026-11-03): mudar ou retirar o
 * consentimento tem que ser tão fácil quanto dar (LGPD, art. 8º, §5º).
 * Abre o modal do `CookieConsent`, que mora no layout raiz.
 */
export function CookiePreferencesLink() {
  return (
    <button
      type="button"
      onClick={openConsentPreferences}
      className="transition-colors hover:text-white"
    >
      Preferências de cookies
    </button>
  );
}
