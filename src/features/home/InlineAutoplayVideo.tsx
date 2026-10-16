"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Vídeo que COMEÇA A TOCAR quando a seção aparece na tela (2026-10-16, pedido
 * do usuário) — usado pelo "Clientes 100% satisfeitos" (`VideoPlayer`) e pelo
 * bloco "Vídeo" do construtor (`VideoBlock`).
 *
 * ── Mudo, sempre ───────────────────────────────────────────────────────────
 * Chrome, Safari e Firefox só deixam um vídeo tocar sozinho SEM SOM (autoplay
 * policy). Com som, o navegador recusa e o vídeo fica parado. Por isso ele
 * começa mudo e um botão "Ativar som" fica à vista.
 *
 * ── Peso ───────────────────────────────────────────────────────────────────
 * Nada do player existe até a seção ficar ~metade visível: o iframe do YouTube
 * (~1 MB de script) e o download do arquivo só começam para quem chegou lá.
 * Saiu da tela, pausa (não consome banda nem bateria tocando escondido).
 *
 * ── Quem não toca sozinho ──────────────────────────────────────────────────
 * `prefers-reduced-motion` (pediu menos movimento) e "economia de dados"
 * (`Save-Data`) continuam com a capa + play de antes — vídeo em movimento e
 * download automático são exatamente o que essas preferências recusam.
 */

/** Fração da seção visível para começar (e abaixo da qual pausa). */
const VISIBLE_RATIO = 0.5;

function autoplayAllowed(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !connection?.saveData;
}

/**
 * `active`: o player já foi montado (fica montado depois disso).
 * `visible`: a seção está na tela agora — toca; fora dela, pausa.
 */
export function useAutoplayInView(target: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = target.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const inView = entry.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO;
        setVisible(inView);
        if (inView && autoplayAllowed()) setActive(true);
      },
      { threshold: [0, VISIBLE_RATIO] },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [target]);

  /** Clique no play da capa (quem não toca sozinho): monta já, como visível. */
  function activate() {
    setActive(true);
    setVisible(true);
  }

  return { active, visible, activate };
}

const YT_ORIGIN = "https://www.youtube-nocookie.com";

/**
 * O player em si, dentro de uma moldura que o pai já posicionou (`relative` ou
 * `absolute`). Arquivo enviado pelo painel vale mais que o link do YouTube.
 */
export function InlineVideo({
  videoId,
  videoFile,
  poster,
  title,
  visible,
}: {
  /** Já validado (`youtubeId`) — nunca a URL crua do painel. */
  videoId?: string;
  videoFile?: string;
  poster?: string;
  title: string;
  visible: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [muted, setMuted] = useState(true);

  // Toca na tela, pausa fora dela.
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      if (visible) {
        // Mudo ANTES do play: é a condição do navegador para tocar sozinho.
        video.muted = muted;
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
      return;
    }
    // YouTube: comandos pela API de mensagens do player (`enablejsapi=1`).
    // Antes de o player carregar a mensagem se perde — e tudo bem: ele nasce
    // com `autoplay=1`, que é o estado certo para quem acabou de chegar.
    frameRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: visible ? "playVideo" : "pauseVideo", args: [] }),
      YT_ORIGIN,
    );
  }, [visible, muted]);

  function unmute() {
    setMuted(false);
    const video = videoRef.current;
    if (video) {
      video.muted = false;
      void video.play().catch(() => undefined);
      return;
    }
    const frame = frameRef.current?.contentWindow;
    frame?.postMessage(JSON.stringify({ event: "command", func: "unMute", args: [] }), YT_ORIGIN);
    frame?.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [100] }), YT_ORIGIN);
  }

  return (
    <>
      {videoFile ? (
        <video
          ref={videoRef}
          src={videoFile}
          poster={poster}
          muted
          autoPlay
          playsInline
          controls
          preload="metadata"
          className="absolute inset-0 size-full bg-black object-cover"
          onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
        >
          Seu navegador não conseguiu tocar este vídeo.
        </video>
      ) : videoId ? (
        <iframe
          ref={frameRef}
          src={`${YT_ORIGIN}/embed/${videoId}?autoplay=1&mute=1&playsinline=1&rel=0&enablejsapi=1`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full border-0 bg-black"
        />
      ) : null}

      {muted ? (
        <button
          type="button"
          onClick={unmute}
          className="absolute bottom-[16px] left-[16px] z-10 flex h-[40px] items-center gap-[8px] rounded-full border border-white/20 bg-black/70 px-[16px] font-poppins text-[13px] font-bold text-white backdrop-blur-[8px] transition-colors hover:border-brand-orange/70 focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none"
        >
          <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M11 5 6 9H2v6h4l5 4V5Z" fill="currentColor" stroke="none" />
            <path d="m23 9-6 6M17 9l6 6" strokeLinecap="round" />
          </svg>
          Ativar som
        </button>
      ) : null}
    </>
  );
}
