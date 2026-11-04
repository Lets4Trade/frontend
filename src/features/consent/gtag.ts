import type { ConsentChoices } from "./consent";

/**
 * Google tag (gtag.js) — Google Ads + Google Analytics 4 (2026-11-03).
 *
 * ── Configuração ───────────────────────────────────────────────────────────
 * `NEXT_PUBLIC_GOOGLE_TAG_IDS` = IDs separados por vírgula (`AW-123,G-ABC`).
 * `NEXT_PUBLIC_GOOGLE_ADS_PURCHASE` = "rótulo" da conversão de compra no Ads
 * (`AW-123/AbCdEf`). Vazios → nada do Google carrega e a CSP não abre.
 * Por variável de ambiente, e não pelo painel: o ID decide QUE script roda na
 * página e que domínios a CSP libera — mudar isso é deploy, não edição de texto.
 *
 * ── Consent Mode v2, modo BÁSICO ───────────────────────────────────────────
 * O gtag.js só baixa DEPOIS que a pessoa aceita Medição ou Publicidade. O modo
 * "avançado" do Google carregaria o script para todo mundo e mandaria pings
 * sem cookie mesmo recusado — ainda é dado (IP, página) indo para o Google sem
 * consentimento, o que não fecha com a LGPD. Custa: o Ads perde a "modelagem"
 * das conversões de quem recusou.
 *
 * Mapa: Medição → `analytics_storage`; Publicidade → `ad_storage`,
 * `ad_user_data`, `ad_personalization`.
 *
 * Nada pessoal vai para o Google: sem e-mail/telefone ("conversões otimizadas"
 * desligadas), só valor, moeda e o id do pagamento.
 */

const ID_PATTERN = /^(AW|G|GT|DC)-[A-Z0-9]{4,20}$/;
const CONVERSION_PATTERN = /^AW-[0-9]{4,20}\/[A-Za-z0-9_-]{4,64}$/;

/** Lido no build (NEXT_PUBLIC_*). Inválido é DESCARTADO — vai para uma URL de script. */
export function googleTagIds(raw = process.env.NEXT_PUBLIC_GOOGLE_TAG_IDS): string[] {
  return (raw ?? "")
    .split(",")
    .map((id) => id.trim().toUpperCase())
    .filter((id) => ID_PATTERN.test(id));
}

export function purchaseConversion(raw = process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE): string | null {
  const value = (raw ?? "").trim();
  return CONVERSION_PATTERN.test(value) ? value : null;
}

type ConsentState = "granted" | "denied";

export function consentModeOf(choices: ConsentChoices): Record<string, ConsentState> {
  const ads: ConsentState = choices.marketing ? "granted" : "denied";
  return {
    analytics_storage: choices.measurement ? "granted" : "denied",
    ad_storage: ads,
    ad_user_data: ads,
    ad_personalization: ads,
  };
}

type Gtag = (...args: unknown[]) => void;
type GtagWindow = Window & { dataLayer?: unknown[]; gtag?: Gtag };

/**
 * Cria a fila do gtag (antes do script chegar, os comandos esperam nela) com o
 * consentimento JÁ decidido, e configura os IDs. Idempotente.
 */
export function initGoogleTag(ids: string[], choices: ConsentChoices): void {
  const w = window as GtagWindow;
  if (w.gtag) return;
  w.dataLayer = w.dataLayer ?? [];
  // `arguments`, não `...args`: o gtag.js só reconhece o objeto `arguments`.
  w.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  w.gtag("consent", "default", consentModeOf(choices));
  // Sem Publicidade aceita, o Ads não grava cookie nem lê identificador de clique.
  w.gtag("set", "ads_data_redaction", !choices.marketing);
  w.gtag("js", new Date());
  for (const id of ids) w.gtag("config", id);
}

export function updateGoogleConsent(choices: ConsentChoices): void {
  const w = window as GtagWindow;
  if (!w.gtag) return;
  w.gtag("consent", "update", consentModeOf(choices));
  w.gtag("set", "ads_data_redaction", !choices.marketing);
}

const sent = new Set<string>();

/**
 * Compra aprovada → evento `purchase` (GA4) + conversão de compra (Ads).
 * Sem gtag carregado (sem ID ou sem consentimento) não faz nada. O
 * `transaction_id` faz o Google descartar repetição (recarregar a tela).
 */
export function trackPurchase({ id, amountCents }: { id: string; amountCents: number }): void {
  const w = window as GtagWindow;
  if (!w.gtag || sent.has(id)) return;
  sent.add(id);
  const value = Math.round(amountCents) / 100;
  w.gtag("event", "purchase", { transaction_id: id, value, currency: "BRL" });
  const conversion = purchaseConversion();
  if (conversion) {
    w.gtag("event", "conversion", { send_to: conversion, transaction_id: id, value, currency: "BRL" });
  }
}
