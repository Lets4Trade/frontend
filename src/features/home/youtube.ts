/**
 * Link do YouTube → identificador do vídeo.
 *
 * ── Por que só YouTube, e por que o ID e não a URL ─────────────────────────
 * O link vem de um campo do painel e vai parar num `<iframe>` na página mais
 * aberta da loja. Aceitar "qualquer URL" seria deixar o painel embutir
 * qualquer site dentro da home — inclusive uma página de login falsa. Por isso
 * a URL digitada NUNCA chega ao iframe: extraímos só o ID (11 caracteres de um
 * alfabeto fechado) e montamos a URL de embed nós mesmos, num host fixo.
 *
 * ── youtube-nocookie.com ───────────────────────────────────────────────────
 * O modo de privacidade reforçada do próprio YouTube: não grava cookie de
 * rastreamento até a pessoa dar o play. A home não tem banner de consentimento
 * (ver a pendência de LGPD em `open-questions.md`), então o player não pode ser
 * mais um rastreador carregado sem aviso.
 */

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtube-nocookie.com",
]);

/** `undefined` para qualquer coisa que não seja, com certeza, um vídeo do YouTube. */
export function youtubeId(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
  if (!HOSTS.has(url.hostname)) return undefined;

  const candidate =
    url.hostname === "youtu.be"
      ? url.pathname.slice(1)
      : url.pathname === "/watch"
        ? url.searchParams.get("v") ?? ""
        : // /shorts/ID, /embed/ID, /live/ID
          url.pathname.split("/")[2] ?? "";

  return VIDEO_ID.test(candidate) ? candidate : undefined;
}

export function youtubeEmbedUrl(id: string) {
  // `rel=0`: ao fim, sugere vídeos do MESMO canal, não de concorrentes.
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
}

export function youtubeWatchUrl(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}
