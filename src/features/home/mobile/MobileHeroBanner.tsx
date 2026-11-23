"use client";

import Image from "next/image";
import { useState } from "react";
import type { SectionItemView } from "@/features/site/content";
import { useBannerAutoplay } from "@/features/game/useBannerAutoplay";
import { useBannerSwipe } from "@/features/game/useBannerSwipe";
import { HERO_BANNER_WIDTH, HERO_DEFAULT_ART, HERO_UPLOAD_HEIGHT } from "../heroGames";

/**
 * A arte ENVIADA ocupa a faixa de cima, na MESMA proporção do banner do
 * computador (859×549) — 2026-11-23, pedido do usuário: antes o card tinha
 * proporção fixa 352/338 e a arte cortava 5–8% de cada lateral. Abaixo dela,
 * os 77px das barrinhas e da legenda. A padrão do desenho ocupa o card todo.
 */
const ART_RATIO = `${HERO_BANNER_WIDTH} / ${HERO_UPLOAD_HEIGHT}`;
const FOOTER_HEIGHT = 77;

function artBox(src: string) {
  return src === HERO_DEFAULT_ART ? "inset-0" : "inset-x-0 top-0";
}

function artStyle(src: string) {
  return src === HERO_DEFAULT_ART ? undefined : { aspectRatio: ART_RATIO };
}

/**
 * O topo da home no CELULAR (Figma 2667:1864): um card só, com as artes do
 * banner e as barrinhas — o baralho de jogos do desktop não cabe em 402px e o
 * desenho mobile o tira.
 *
 * Mesma regra do `HeroBannerSlides` do desktop: as artes vêm da lista
 * `home:hero-banner`, passam sozinhas com o timer do banner do jogo
 * (`useBannerAutoplay`, 2026-11-23), trocam no clique e arrastando com o dedo
 * (`useBannerSwipe`, 2026-11-23); sem lista aparece a
 * arte da sessão com as três barrinhas do desenho.
 */
export function MobileHeroBanner({
  fallbackImage,
  caption,
  items,
}: {
  fallbackImage: string;
  caption: string;
  items: SectionItemView[];
}) {
  const slides = items.filter((item) => item.image);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = Math.min(active, Math.max(slides.length - 1, 0));
  useBannerAutoplay({ count: slides.length, current, setActive, paused });
  const count = slides.length;
  const swipe = useBannerSwipe({
    enabled: count > 1,
    onSwipe: (step) => setActive((((current + step) % count) + count) % count),
  });
  const total = slides.length > 0 ? slides.length : 3;

  return (
    <section
      className="relative w-full touch-pan-y overflow-hidden rounded-[24px] border border-white/10 bg-brand-surface"
      {...swipe}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* A altura do card vem daqui: arte na proporção do computador + faixa. */}
      <div aria-hidden className="w-full" style={{ aspectRatio: ART_RATIO }} />
      <div aria-hidden style={{ height: FOOTER_HEIGHT }} />

      {slides.length === 0 ? (
        <div className={`absolute ${artBox(fallbackImage)}`} style={artStyle(fallbackImage)}>
          <Image src={fallbackImage} alt="" fill priority sizes="100vw" aria-hidden className="object-cover" />
        </div>
      ) : (
        slides.map((item, index) => (
          <div
            key={item.id}
            className={`absolute ${artBox(item.image ?? fallbackImage)}`}
            style={{ ...artStyle(item.image ?? fallbackImage), visibility: index === current ? "visible" : "hidden" }}
          >
            <Image
              src={item.image ?? fallbackImage}
              alt=""
              fill
              sizes="100vw"
              priority={index === 0}
              aria-hidden={index !== current}
              className="object-cover"
            />
          </div>
        ))
      )}

      <div className="absolute bottom-[58px] left-[25px] flex gap-[10px]">
        {Array.from({ length: total }, (_, index) => {
          const isActive = index === (slides.length > 0 ? current : 0);
          return (
            <button
              key={index}
              type="button"
              onClick={() => setActive(index)}
              disabled={slides.length === 0}
              aria-label={`Ver imagem ${index + 1} de ${total}`}
              aria-current={isActive ? "true" : undefined}
              className="relative block h-[3px] w-[40px] disabled:cursor-default"
            >
              <span
                className="absolute inset-0"
                style={
                  isActive
                    ? { backgroundImage: "linear-gradient(175.17deg, #ff7300 13.819%, #ff4d00 89.223%)" }
                    : { backgroundColor: "#3b3b3b" }
                }
              />
            </button>
          );
        })}
      </div>

      <p className="absolute bottom-[25px] left-[25px] font-helvetica text-[16px] font-bold text-white">
        {caption}
      </p>
    </section>
  );
}
