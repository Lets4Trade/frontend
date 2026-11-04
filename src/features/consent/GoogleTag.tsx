"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { googleTagIds, initGoogleTag, updateGoogleConsent } from "./gtag";
import { useConsent } from "./useConsent";

const IDS = googleTagIds();

/**
 * Carrega o Google tag SÓ com consentimento (ver `gtag.ts`). Fora do
 * painel: a equipe navegando no admin não é público de anúncio e sujaria as
 * métricas.
 *
 * Retirou o consentimento depois de carregado: o script fica na página (não há
 * como "descarregar"), mas o `consent update` para tudo como recusado, e o
 * próximo carregamento de página já nem baixa o script.
 */
export function GoogleTag() {
  const consent = useConsent();
  const pathname = usePathname() ?? "/";
  const loaded = useRef(false);

  const choices = consent
    ? { measurement: consent.measurement, media: consent.media, marketing: consent.marketing }
    : null;
  const allowed = !!choices && (choices.measurement || choices.marketing);
  const hidden = pathname.startsWith("/admin") || pathname.startsWith("/previa");

  useEffect(() => {
    if (IDS.length === 0 || !choices) return;
    if (!loaded.current) {
      if (!allowed || hidden) return;
      initGoogleTag(IDS, choices);
      loaded.current = true;
      return;
    }
    updateGoogleConsent(choices);
    // `choices` é derivado de `consent` (mesma referência enquanto o cookie não muda).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consent, allowed, hidden]);

  // Tirar o <Script> da árvore não descarrega nada; `next/script` também não
  // baixa duas vezes o mesmo `id`.
  if (IDS.length === 0 || hidden || !allowed) return null;
  return (
    <Script
      id="google-tag"
      src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(IDS[0])}`}
      strategy="afterInteractive"
    />
  );
}
