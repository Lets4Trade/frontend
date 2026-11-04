"use client";

import { useSyncExternalStore } from "react";
import { readConsent, subscribeConsent, type Consent } from "./consent";

/**
 * A escolha de cookies, reativa.
 *
 * - `undefined` → ainda não hidratou (no servidor não se sabe; o aviso NÃO
 *   aparece no HTML, senão piscaria para quem já escolheu).
 * - `null` → hidratou e a pessoa ainda não escolheu.
 * - objeto → a escolha.
 */
export function useConsent(): Consent | null | undefined {
  return useSyncExternalStore(subscribeConsent, readConsent, () => undefined);
}
