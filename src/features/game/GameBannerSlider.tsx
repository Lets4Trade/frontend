"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { GameBanner } from "./types";

/** Tempo de cada banner na tela quando ele passa sozinho. */
const INTERVAL_MS = 6000;
/** Arrasto mínimo (px) para o toque contar como "trocar de banner". */
const SWIPE_PX = 50;

/**
 * Banner do topo da página de jogo (1146:386, 1714×490) como SLIDER
 * (2026-10-08, pedido do usuário: "tenho que poder colocar múltiplas imagens").
 *
 * ── Movimento ───────────────────────────────────────────────────────────────
 * Passa sozinho a cada 6s (regra de 2026-09-24: movimento com papel; aqui o
 * papel é mostrar que há mais de uma arte). PAUSA com o mouse em cima, com o
 * foco dentro (teclado), com a aba em segundo plano e sempre que o sistema
 * pede menos movimento (`prefers-reduced-motion`). Trocar à mão reinicia a
 * contagem, para o banner escolhido não sumir logo em seguida.
 *
 * ── Controles ───────────────────────────────────────────────────────────────
 * Setas laterais (aparecem no hover/foco; em tela de toque, sempre), as
 * barrinhas do arquivo viram botões, arrastar no toque troca, e ← → no teclado
 * quando o foco está no slider. Slide escondido fica `inert`: o link dele não
 * recebe foco nem clique.
 */
export function GameBannerSlider({
  banners,
  autoPlay = true,
}: {
  banners: GameBanner[];
  /** Desligado na prévia do builder: lá quem troca é quem edita. */
  autoPlay?: boolean;
}) {
  const count = banners.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  // A lista pode encolher (banner removido no builder) com o índice no fim.
  const current = Math.min(active, Math.max(count - 1, 0));

  const go = (index: number) => setActive(((index % count) + count) % count);

  useEffect(() => {
    if (!autoPlay || paused || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => {
      if (!document.hidden) setActive((value) => (Math.min(value, count - 1) + 1) % count);
    }, INTERVAL_MS);
    return () => window.clearTimeout(timer);
    // `current` reinicia a contagem a cada troca, inclusive a feita à mão.
  }, [autoPlay, paused, count, current]);

  // Toque: guarda onde começou; ao soltar, um arrasto largo troca de banner e
  // anula o clique que viria em seguida (senão abriria o link do slide).
  const swipe = useRef<{ x: number; moved: boolean } | null>(null);
  function onPointerDown(event: PointerEvent) {
    if (event.pointerType === "mouse") return;
    swipe.current = { x: event.clientX, moved: false };
  }
  function onPointerUp(event: PointerEvent) {
    const start = swipe.current;
    if (!start || count < 2) return;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) >= SWIPE_PX) {
      start.moved = true;
      go(current + (dx < 0 ? 1 : -1));
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    if (count < 2) return;
    if (event.key === "ArrowRight") go(current + 1);
    else if (event.key === "ArrowLeft") go(current - 1);
    else return;
    event.preventDefault();
  }

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Banners"
      // Celular (2026-10-09): mais baixo e com o canto menor — 490px de altura
      // ocupavam mais da metade da tela.
      className="group relative h-[180px] touch-pan-y overflow-hidden rounded-[20px] border border-white/10 bg-[#2f2f2f] sm:h-[280px] lg:h-[490px] lg:rounded-[30px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onClickCapture={(event) => {
        if (swipe.current?.moved) event.preventDefault();
        swipe.current = null;
      }}
    >
      {banners.map((banner, index) => {
        const isActive = index === current;
        return (
          <div
            key={banner.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} de ${count}`}
            aria-hidden={!isActive}
            inert={!isActive}
            className={`absolute inset-0 transition-opacity duration-700 ease-out motion-reduce:transition-none ${
              isActive ? "opacity-100" : "opacity-0"
            }`}
          >
            {banner.href ? (
              <Link href={banner.href} className="absolute inset-0">
                <BannerArt banner={banner} priority={index === 0} />
              </Link>
            ) : (
              <BannerArt banner={banner} priority={index === 0} />
            )}
          </div>
        );
      })}

      {count > 1 ? (
        <>
          <ArrowButton side="left" label="Banner anterior" onClick={() => go(current - 1)} />
          <ArrowButton side="right" label="Próximo banner" onClick={() => go(current + 1)} />

          {/* Indicadores: barras de 40×3 a cada 50px, a ativa em degradê
              laranja com uma cópia borrada atrás fazendo o brilho (o mesmo
              tratamento do hero da home). O botão é mais alto que a barra
              para o dedo acertar. */}
          <div className="absolute bottom-[18px] left-[50px] flex gap-[10px]">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => go(index)}
                aria-label={`Ver banner ${index + 1} de ${count}`}
                aria-current={index === current ? "true" : undefined}
                className="flex h-[23px] w-[40px] items-center"
              >
                <span className="relative block h-[3px] w-full">
                  {index === current ? (
                    <>
                      <span
                        aria-hidden
                        className="absolute inset-0 bg-[image:var(--brand-orange-gradient)] blur-[1.55px]"
                      />
                      <span className="absolute inset-0 bg-[image:var(--brand-orange-gradient)]" />
                    </>
                  ) : (
                    <span className="absolute inset-0 bg-[#3b3b3b]" />
                  )}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function BannerArt({ banner, priority }: { banner: GameBanner; priority: boolean }) {
  return (
    <Image
      src={banner.image.src}
      alt={banner.image.alt ?? ""}
      width={banner.image.width}
      height={banner.image.height}
      // Só o primeiro entra no caminho crítico (é o topo da página).
      priority={priority}
      className="size-full object-cover"
    />
  );
}

function ArrowButton({
  side,
  label,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 ${side === "left" ? "left-[20px]" : "right-[20px]"} flex size-[46px] -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 hover:bg-black/75 focus-visible:opacity-100 [@media(hover:none)]:opacity-100`}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth={2.2}>
        <path d={side === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
