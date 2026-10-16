"use client";

import { useRef } from "react";
import { InlineVideo, useAutoplayInView } from "@/features/home/InlineAutoplayVideo";

/**
 * O player do bloco "Vídeo" (2026-10-16): toca sozinho, mudo, quando o bloco
 * aparece na tela — ver `InlineAutoplayVideo`. Antes disso (e para quem pediu
 * menos movimento ou economia de dados) fica uma capa escura com o play; o
 * clique monta o player na hora.
 *
 * Capa PRÓPRIA, não a miniatura do YouTube (`i.ytimg.com`): a CSP só libera
 * imagem externa no checkout, e buscar a miniatura no Google já entregaria o
 * IP do visitante antes de ele chegar ao vídeo.
 */
export function VideoBlockPlayer({ videoId, title }: { videoId: string; title: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const { active, visible, activate } = useAutoplayInView(boxRef);

  return (
    <div
      ref={boxRef}
      className="relative aspect-video w-full overflow-hidden rounded-[30px] border border-brand-border bg-black"
    >
      {active ? (
        <InlineVideo videoId={videoId} title={title} visible={visible} />
      ) : (
        <button
          type="button"
          onClick={activate}
          aria-label={`Assistir: ${title}`}
          className="play-button group absolute inset-0 size-full bg-[radial-gradient(ellipse_at_center,rgba(255,115,0,0.18),transparent_65%)]"
        >
          <span
            aria-hidden
            className="play-core absolute inset-0 m-auto flex size-[68px] items-center justify-center rounded-full bg-[image:var(--brand-orange-gradient)]"
          >
            <svg viewBox="0 0 24 24" className="ml-[3px] size-[22px]" fill="white" aria-hidden>
              <path d="M7 5v14l12-7z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
