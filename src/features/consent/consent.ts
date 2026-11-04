/**
 * Consentimento de cookies (2026-11-03) — LGPD + guia de cookies da ANPD.
 *
 * ── O que precisa de consentimento AQUI ─────────────────────────────────────
 * - `measurement` — o registro de TELAS abertas na loja (`PageViewTracker`,
 *   `POST /audit/view`, sem IP) e o Google Analytics (`analytics_storage`).
 * - `marketing` — Google Ads (2026-11-03): conversões e remarketing
 *   (`ad_storage`, `ad_user_data`, `ad_personalization`). Ver `gtag.ts`.
 *   Pixel de outra plataforma (Meta, TikTok) entra AQUI também.
 * - `media` — o player do YouTube que monta SOZINHO ao rolar até o vídeo
 *   (`InlineAutoplayVideo`). Sem consentimento, o vídeo fica na capa e só
 *   carrega no clique — o clique no play é a ação da própria pessoa.
 *
 * Essenciais (sessão, CSRF, carrinho, Cloudflare, Turnstile) não pedem
 * consentimento: sem eles a loja não funciona. Ficam LISTADOS no aviso, mas
 * sem interruptor.
 *
 * ── Onde mora ──────────────────────────────────────────────────────────────
 * Um cookie primário (`l4t_consent`), não `localStorage`: o mesmo valor fica
 * legível no servidor se um dia um Server Component precisar decidir. Não é
 * `httpOnly` porque o próprio aviso (no navegador) lê e grava. Não guarda nada
 * pessoal — só as escolhas e a data.
 *
 * `version`: subir quando a LISTA de categorias mudar. Escolha de versão antiga
 * = sem escolha, e o aviso volta (consentimento vale para o que foi mostrado).
 */

export const CONSENT_COOKIE = "l4t_consent";
// v2 (2026-11-03): entrou `marketing` (Google Ads) — quem escolheu na v1 vê o aviso de novo.
export const CONSENT_VERSION = 2;
/** ~6 meses: a escolha é refeita de tempos em tempos, como a ANPD recomenda. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 182;

export type ConsentChoices = { measurement: boolean; media: boolean; marketing: boolean };
export type Consent = ConsentChoices & { version: number; at: string };

export const ALL_ON: ConsentChoices = { measurement: true, media: true, marketing: true };
export const ALL_OFF: ConsentChoices = { measurement: false, media: false, marketing: false };

/** Lê o valor cru do cookie. Inválido, antigo ou ausente → `null` (sem escolha). */
export function parseConsent(raw: string | undefined | null): Consent | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as Partial<Consent>;
    if (value.version !== CONSENT_VERSION) return null;
    if (
      typeof value.measurement !== "boolean" ||
      typeof value.media !== "boolean" ||
      typeof value.marketing !== "boolean"
    ) {
      return null;
    }
    return {
      version: CONSENT_VERSION,
      measurement: value.measurement,
      media: value.media,
      marketing: value.marketing,
      at: typeof value.at === "string" ? value.at : "",
    };
  } catch {
    return null;
  }
}

function readCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const prefix = `${CONSENT_COOKIE}=`;
  return document.cookie
    .split("; ")
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
}

// ── Loja externa para `useSyncExternalStore` ────────────────────────────────
// O cookie não avisa quando muda; quem grava (o aviso) dispara o evento, e todo
// componente que depende da escolha (rastreador, vídeo) relê na hora.

const EVENT = "l4t:consent";
const OPEN_EVENT = "l4t:consent-open";

let cachedRaw: string | undefined;
let cachedValue: Consent | null = null;

export function readConsent(): Consent | null {
  const raw = readCookie();
  // Mesma string → mesmo objeto: `useSyncExternalStore` compara por referência
  // e entraria em laço se cada leitura devolvesse um objeto novo.
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parseConsent(raw);
  }
  return cachedValue;
}

export function subscribeConsent(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}

export function saveConsent(choices: ConsentChoices): void {
  const value: Consent = { version: CONSENT_VERSION, ...choices, at: new Date().toISOString() };
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(value))}` +
    `; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event(EVENT));
}

/** "Preferências de cookies" do rodapé: reabre o aviso já no modo detalhado. */
export function openConsentPreferences(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function subscribeOpenPreferences(callback: () => void): () => void {
  window.addEventListener(OPEN_EVENT, callback);
  return () => window.removeEventListener(OPEN_EVENT, callback);
}

/** Leitura fora do React (efeitos, observers): sem escolha = NÃO. */
export function hasConsent(category: keyof ConsentChoices): boolean {
  return readConsent()?.[category] === true;
}
