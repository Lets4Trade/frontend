"use client";

import Image from "next/image";
import { useState } from "react";
import { editAdd, editItem } from "@/features/site/editing/attrs";
import type { SectionItemView } from "@/features/site/content";
import { HERO_BANNER_WIDTH, HERO_HEIGHT } from "./heroGames";

/**
 * As artes do banner do hero (Figma 131:1504), com os indicadores do arquivo.
 *
 * ── O que mudou em 2026-09-15 ──────────────────────────────────────────────
 * O arquivo desenha TRÊS barrinhas sob o banner, e a home tinha uma arte só:
 * os indicadores eram enfeite, e não havia onde pôr a segunda e a terceira
 * imagem. Agora as artes são uma LISTA (`home:hero-banner`), editável na
 * própria página, e cada barrinha corresponde a uma delas.
 *
 * ── Troca no clique, nunca sozinha ─────────────────────────────────────────
 * Passar sozinho contrariaria a regra de movimento da home ("nada anima
 * sozinho", decidida em 2026-08-31) e competiria com o carrossel de cards ao
 * lado, que é o elemento interativo do hero. Quem troca é quem clica.
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
          height={758}
          aria-hidden
          priority
          className="absolute inset-0 size-full overflow-hidden rounded-[30px] object-cover"
          style={{ width: HERO_BANNER_WIDTH, height: HERO_HEIGHT }}
        />
      ) : (
        slides.map((item, index) => (
          <Image
            key={item.id}
            {...editItem("home:hero-banner", item.id, "image")}
            src={item.image ?? fallbackImage}
            alt=""
            width={859}
            height={758}
            aria-hidden={index !== active}
            // A primeira entra no caminho crítico (é o topo da home); as outras
            // só aparecem depois de um clique.
            priority={index === 0}
            className="absolute inset-0 size-full overflow-hidden rounded-[30px] object-cover"
            style={{
              width: HERO_BANNER_WIDTH,
              height: HERO_HEIGHT,
              // `visibility` e não desmontar: trocar de arte não deve custar um
              // carregamento novo a cada clique.
              visibility: index === active ? "visible" : "hidden",
            }}
          />
        ))
      )}

      {/* Indicadores: barras de 40×3 a cada 50px, como no arquivo. Sem lista,
          as três do desenho; com lista, uma por arte. */}
      <div className="absolute top-[663px] left-[50px] flex gap-[10px]">
        {(slides.length > 0 ? slides : [null, null, null]).map((item, index) => {
          const isActive = slides.length > 0 ? index === active : index === 0;
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
