"use client";

import Image from "next/image";
import { useState } from "react";
import type { SectionItemView } from "@/features/site/content";

/**
 * O topo da home no CELULAR (Figma 2667:1864): um card só, com as artes do
 * banner e as barrinhas — o baralho de jogos do desktop não cabe em 402px e o
 * desenho mobile o tira.
 *
 * Mesma regra do `HeroBannerSlides` do desktop: as artes vêm da lista
 * `home:hero-banner`, trocam no CLIQUE (nada anima sozinho na home), e sem lista
 * aparece a arte da sessão com as três barrinhas do desenho.
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
  const total = slides.length > 0 ? slides.length : 3;

  return (
    <section className="relative aspect-[352/338] w-full overflow-hidden rounded-[24px] border border-white/10 bg-brand-surface">
      {slides.length === 0 ? (
        <Image src={fallbackImage} alt="" fill priority sizes="100vw" aria-hidden className="object-cover" />
      ) : (
        slides.map((item, index) => (
          <Image
            key={item.id}
            src={item.image ?? fallbackImage}
            alt=""
            fill
            sizes="100vw"
            priority={index === 0}
            aria-hidden={index !== active}
            className="object-cover"
            style={{ visibility: index === active ? "visible" : "hidden" }}
          />
        ))
      )}

      <div className="absolute bottom-[58px] left-[25px] flex gap-[10px]">
        {Array.from({ length: total }, (_, index) => {
          const isActive = index === (slides.length > 0 ? active : 0);
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
