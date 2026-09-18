"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { youtubeEmbedUrl } from "./youtube";

/**
 * O player do bloco "CLIENTES 100% SATISFEITOS": a capa com o botão de play
 * (pílula de vidro com o anel de texto girando), que abre o vídeo num modal.
 *
 * ── Por que modal e não o iframe no lugar da capa ──────────────────────────
 * O iframe do YouTube pesa ~1 MB de script e é a home. Montado de cara, toda
 * visita pagaria esse custo para um vídeo que a maioria não assiste. O
 * `Dialog.Content` do Radix só existe no DOM enquanto está aberto: o iframe
 * nasce no clique e MORRE ao fechar — o que também para o som, sem precisar
 * falar com a API do player.
 *
 * ── Sem vídeo, sem botão ──────────────────────────────────────────────────
 * Até 2026-09-14 isto era um `<button>` sem ação, sem vídeo nenhum por trás.
 * Sem link cadastrado no painel, a capa continua (é arte do arquivo), mas sem a
 * pílula de play: play que não toca é promessa falsa.
 */
export function VideoPlayer({
  image,
  videoId,
  videoFile,
  frameClassName,
  compact = false,
}: {
  image: string;
  /** Já validado por `youtubeId` — nunca a URL crua do painel. */
  videoId?: string;
  /**
   * Vídeo ENVIADO pelo painel (MP4/WebM servido pelo backend). O painel só
   * deixa uma fonte por vez; se as duas existirem, o arquivo vale.
   */
  videoFile?: string;
  /**
   * Moldura do player. Padrão = a do desktop (1146×609 na coordenada do
   * arquivo); a home MOBILE passa uma fluida.
   */
  frameClassName?: string;
  /** Pílula de play menor, para a moldura estreita do celular. */
  compact?: boolean;
}) {
  const frame =
    frameClassName ??
    "absolute top-0 left-[674px] h-[609px] w-[1146px] overflow-hidden rounded-[30px]";

  const thumb = (
    <Image
      src={image}
      alt=""
      width={1146}
      height={609}
      aria-hidden
      className="play-thumb size-full object-cover"
    />
  );

  if (!videoId && !videoFile) {
    return <div className={frame}>{thumb}</div>;
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger
        aria-label="Assistir ao vídeo de apresentação"
        className={`play-button ${frame}`}
      >
        {thumb}
        {compact ? (
          <span className="absolute inset-0 flex scale-[0.55] items-center justify-center">
            <PlayPill />
          </span>
        ) : (
          <PlayPill />
        )}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px]" />

        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[1146px] max-w-[calc(100vw-40px)] -translate-x-1/2 -translate-y-1/2 outline-none">
          <Dialog.Title className="sr-only">Vídeo de apresentação</Dialog.Title>
          <Dialog.Description className="sr-only">
            {videoFile ? "Vídeo" : "Vídeo do YouTube"}. Pressione Esc para
            fechar.
          </Dialog.Description>

          <div className="relative aspect-video w-full overflow-hidden rounded-[20px] border border-white/10 bg-black">
            {videoFile ? (
              // Nasce no clique e morre ao fechar, como o iframe: o download só
              // começa para quem pediu, e fechar para o som. `preload=metadata`
              // + Range (206) do backend = começa a tocar antes do fim.
              <video
                src={videoFile}
                controls
                autoPlay
                playsInline
                preload="metadata"
                className="absolute inset-0 size-full"
              >
                Seu navegador não conseguiu tocar este vídeo.
              </video>
            ) : (
              <iframe
                src={youtubeEmbedUrl(videoId as string)}
                title="Vídeo de apresentação da Lets4Trade"
                // Só o que o player precisa. Sem `allow-same-origin` explícito
                // aqui não há `sandbox` — o YouTube recusa tocar dentro de um.
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute inset-0 size-full"
              />
            )}
          </div>

          <Dialog.Close className="absolute -top-[56px] right-0 flex h-[44px] items-center rounded-full border border-brand-border bg-[image:var(--brand-surface-fill)] px-[22px] font-poppins text-[14px] font-bold text-white transition-opacity hover:opacity-90">
            Fechar
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * A pílula de vidro (`backdrop-blur` 46.8px) com o anel de texto girando em
 * volta do ícone. O anel gira só para quem não pediu menos movimento —
 * `motion-safe`: animação contínua em loop é justamente o caso que
 * `prefers-reduced-motion` existe para cobrir.
 */
function PlayPill() {
  return (
    <span
      className="play-pill absolute inset-0 m-auto flex size-[191.56px] items-center justify-center rounded-full backdrop-blur-[46.8px]"
      style={{
        backgroundImage:
          "linear-gradient(142.13deg, rgba(254,248,255,0.189) 1.8%, rgba(254,248,255,0) 99.75%)",
      }}
    >
      <Image
        src="/icons/home/circle-text.svg"
        alt=""
        width={128}
        height={128}
        aria-hidden
        className="size-[127.7px] motion-safe:animate-[spin_12s_linear_infinite]"
      />

      <span
        className="play-core absolute flex size-[68px] items-center justify-center rounded-full"
        style={{
          backgroundImage:
            "linear-gradient(131.59deg, #ff7300 13.819%, #ff4d00 89.223%)",
        }}
      >
        <Image
          src="/icons/home/media-video.svg"
          alt=""
          width={15}
          height={16}
          aria-hidden
          className="h-[16px] w-[15px]"
        />
      </span>
    </span>
  );
}
