import Image from "next/image";
import { Button } from "@/components/ui/Button";

/**
 * Bloco "CLIENTES 100% SATISFEITOS" com o vídeo de apresentação
 * (Figma 526:1064 e 507:423).
 *
 * Layout do design: coluna de texto à esquerda (x=50, largura ~570) e o vídeo
 * de 1146×609 à direita, em x=724.
 *
 * ⚠️ APROXIMAÇÕES: os tamanhos de fonte do título, do parágrafo e do botão NÃO
 * foram lidos do arquivo — o limite mensal do MCP do Figma estourou antes. Os
 * valores abaixo foram deduzidos das caixas de texto da metadata (título 547×136
 * em duas linhas, parágrafo 570×132) e do padrão das outras telas. Conferir
 * quando houver chamadas disponíveis. Ver .claude/context/open-questions.md.
 */
export function VideoSection() {
  return (
    <section className="flex items-start gap-[104px] pt-[144px]">
      <div className="w-[570px] shrink-0">
        {/* APROXIMADO: 44px deduzido da caixa de 547×136 em duas linhas. */}
        <h2 className="font-helvetica text-[44px] leading-[54px] font-bold text-white">
          CLIENTES 100%
          <br />
          SATISFEITOS
        </h2>

        {/* APROXIMADO: 15px deduzido da caixa de 570×132 com ~6 linhas. */}
        <p className="mt-[25px] font-helvetica text-[15px] leading-[22px] text-brand-placeholder">
          Muito prazer, sou o Eddmax! Quer saber se pode confiar no nosso
          trabalho? Dá uma olhada no nosso vídeo de apresentação no YouTube. Nos
          comentários, nossos clientes contam um pouco sobre a experiência deles
          conosco e a dedicação que colocamos em cada serviço prestado. ❤ Clique
          aqui e veja com seus próprios olhos nossos feedbacks:
        </p>

        <Button variant="primary" className="mt-[25px] w-[276px] px-0">
          VER NO YOUTUBE
        </Button>

        <p className="mt-[25px] font-helvetica text-[14px] leading-[15px] text-brand-placeholder">
          E fique a vontade para deixar seu feedback também!
        </p>

        {/* Assinatura do CEO. */}
        <div className="mt-[43px] flex items-center gap-[15px]">
          <span className="block size-[60px] shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5" />
          <span>
            <span className="block font-poppins text-[18px] leading-[26px] font-bold text-white">
              EDDMAX
            </span>
            <span className="block font-poppins text-[12px] leading-[13px] font-medium tracking-[0.12px] text-white/80">
              CEO - LETS4TRADE
            </span>
          </span>
        </div>
      </div>

      <VideoPlayer />
    </section>
  );
}

/**
 * Player: thumbnail com o botão de play centralizado. O botão é uma pílula de
 * vidro (`backdrop-blur` 46.8px) com o anel de texto girando em volta do ícone.
 *
 * O anel gira só para quem não pediu menos movimento — `motion-safe`. Animação
 * contínua em loop é justamente o caso que `prefers-reduced-motion` existe para
 * cobrir.
 *
 * O `-mt-[94px]` não é ajuste fino: no arquivo o vídeo começa em y=1127 e o
 * título da coluna da esquerda em y=1220. Alinhados pelo topo do flex, o vídeo
 * descia 94px, esticava a seção e empurrava TODAS as seções seguintes da home.
 */
function VideoPlayer() {
  return (
    <button
      type="button"
      aria-label="Assistir ao vídeo de apresentação"
      className="play-button relative -mt-[94px] h-[609px] w-[1146px] shrink-0 overflow-hidden rounded-[30px]"
    >
      <Image
        src="/images/video-thumb.png"
        alt=""
        width={1146}
        height={609}
        aria-hidden
        className="play-thumb size-full object-cover"
      />

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
    </button>
  );
}
