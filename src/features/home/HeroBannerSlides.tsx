"use client";

import Image from "next/image";
import { useState } from "react";
import { editAdd, editItem } from "@/features/site/editing/attrs";
import { useBannerAutoplay } from "@/features/game/useBannerAutoplay";
import type { SectionItemView } from "@/features/site/content";
import { HERO_BANNER_WIDTH, HERO_DOTS_TOP, HERO_UPLOAD_HEIGHT } from "./heroGames";

// Toda arte termina na linha dos cards da direita (2026-11-18): abaixo dela
// ficam as barrinhas, a legenda e os atalhos. Era 643 (enviada) / 758 (padrão).

/**
 * As artes do banner do hero (Figma 131:1504), com os indicadores do arquivo.
 *
 * ── O que mudou em 2026-09-15 ──────────────────────────────────────────────
 * O arquivo desenha TRÊS barrinhas sob o banner, e a home tinha uma arte só:
 * os indicadores eram enfeite, e não havia onde pôr a segunda e a terceira
 * imagem. Agora as artes são uma LISTA (`home:hero-banner`), editável na
 * própria página, e cada barrinha corresponde a uma delas.
 *
 * ── Passa sozinho, com o timer do banner do jogo ───────────────────────────
 * Desde 2026-11-23 (pedido do usuário) troca a cada 6 s com o MESMO
 * `useBannerAutoplay` da página de jogo: pausa com o mouse em cima ou o foco
 * nas barrinhas, com a aba em segundo plano e com "reduzir movimento"; clicar
 * numa barrinha reinicia a contagem. Antes (2026-08-31 a 11-23) só trocava no
 * clique, pela regra "nada anima sozinho" da home.
 *
 * ── Sem lista, nada muda ───────────────────────────────────────────────────
 * Sem nenhuma arte cadastrada, desenha a do campo de imagem da sessão (ou o SVG
 * do arquivo) e as três barrinhas do desenho — exatamente como a home era.
 */
export function HeroBannerSlides({
  fallbackImage,
  items,
}: {
  /** A arte da sessão, usada quando ainda não há lista. */
  fallbackImage: string;
  items: SectionItemView[];
}) {
  const slides = items.filter((item) => item.image);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = Math.min(active, Math.max(slides.length - 1, 0));
  useBannerAutoplay({ count: slides.length, current, setActive, paused });

  return (
    <>
      {slides.length === 0 ? (
        <Image
          // Sem lista ainda: no editor, clicar aqui CRIA a primeira arte do
          // banner. A imagem da sessão continua sendo o padrão desenhado.
          {...editAdd("home:hero-banner", "imagem do banner")}
          src={fallbackImage}
          alt=""
          width={859}
          height={HERO_UPLOAD_HEIGHT}
          aria-hidden
          priority
          className="absolute top-0 left-0 overflow-hidden rounded-[30px] object-cover"
          style={{ width: HERO_BANNER_WIDTH, height: HERO_UPLOAD_HEIGHT }}
        />
      ) : (
        // Caixa do tamanho do banner só para pausar com o mouse em cima; as
        // artes continuam no mesmo lugar (absolutas, topo-esquerda).
        <div
          className="absolute top-0 left-0"
          style={{ width: HERO_BANNER_WIDTH, height: HERO_UPLOAD_HEIGHT }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
        {slides.map((item, index) => (
          <Image
            key={item.id}
            {...editItem("home:hero-banner", item.id, "image")}
            src={item.image ?? fallbackImage}
            alt=""
            width={859}
            height={HERO_UPLOAD_HEIGHT}
            aria-hidden={index !== current}
            // A primeira entra no caminho crítico (é o topo da home); as outras
            // só aparecem depois de um clique.
            priority={index === 0}
            className="absolute top-0 left-0 overflow-hidden rounded-[30px] object-cover"
            style={{
              width: HERO_BANNER_WIDTH,
              height: HERO_UPLOAD_HEIGHT,
              // `visibility` e não desmontar: trocar de arte não deve custar um
              // carregamento novo a cada clique.
              visibility: index === current ? "visible" : "hidden",
            }}
          />
        ))}
        </div>
      )}

      {/* Indicadores: barras de 40×3 a cada 50px, como no arquivo. Sem lista,
          as três do desenho; com lista, uma por arte. */}
      {/* Centradas sob o banner (2026-11-18, pedido do usuário). */}
      <div
        className="absolute left-1/2 flex -translate-x-1/2 gap-[10px]"
        style={{ top: HERO_DOTS_TOP }}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        {(slides.length > 0 ? slides : [null, null, null]).map((item, index) => {
          const isActive = slides.length > 0 ? index === current : index === 0;
          const total = slides.length > 0 ? slides.length : 3;

          return (
            <button
              key={item?.id ?? index}
              type="button"
              onClick={() => setActive(index)}
              disabled={slides.length === 0}
              // Numeração, e NÃO o título do item: o título é gerado ("Novo
              // imagem do banner") e sairia igual nas três barrinhas, que é o
              // pior rótulo possível para quem navega por leitor de tela.
              aria-label={`Ver imagem ${index + 1} de ${total}`}
              aria-current={isActive ? "true" : undefined}
              className="relative block h-[3px] w-[40px] disabled:cursor-default"
            >
              {isActive ? (
                <>
                  <span
                    aria-hidden
                    className="absolute inset-0 blur-[1.55px]"
                    style={{
                      backgroundImage:
                        "linear-gradient(175.17deg, #ff7300 13.819%, #ff4d00 89.223%)",
                    }}
                  />
                  <span
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        "linear-gradient(175.17deg, #ff7300 13.819%, #ff4d00 89.223%)",
                    }}
                  />
                </>
              ) : (
                <span className="absolute inset-0 bg-[#3b3b3b]" />
              )}
            </button>
          );
        })}
      </div>

    </>
  );
}
