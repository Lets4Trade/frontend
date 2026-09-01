import Image from "next/image";
import { Button } from "@/components/ui/Button";

/**
 * Bloco "CLIENTES 100% SATISFEITOS" com o vídeo de apresentação
 * (Figma: título 526:1064, texto 526:1065, botão 761:1430, vídeo 507:423).
 *
 * Como as demais seções da home, é uma tela posicionada: cada filho fica na
 * coordenada do arquivo, com a origem no topo do vídeo (y=1127 no frame de
 * 1920) e o eixo X descontado dos 50px de margem da página. Altura: do vídeo
 * (1127) ao fim dele (1736) = 609.
 *
 * A coluna da esquerda é CENTRADA, não alinhada à margem: no arquivo o botão
 * fica em x=196, que é exatamente o centro dos 570px da caixa de texto
 * (50 + (570-276)/2 = 197). Título e parágrafo seguem o mesmo eixo.
 */
export function VideoSection() {
  return (
    <section className="relative h-[609px]">
      {/* Título: Poppins SemiBold 65 em duas linhas, caixa de 547 (526:1064). */}
      <h2 className="absolute top-[93px] left-0 w-[547px] text-center font-poppins text-[65px] leading-none font-semibold text-white">
        CLIENTES 100%
        <br />
        SATISFEITOS
      </h2>

      {/* No arquivo a primeira frase é Bold e branca, e o resto Regular em
          #d8d8d8 — é um único bloco de texto com dois estilos, não dois
          parágrafos. */}
      <p className="absolute top-[254px] left-0 w-[570px] text-center font-helvetica text-[18px] leading-[normal] tracking-[0.18px] text-brand-placeholder">
        <strong className="font-bold text-white">
          Muito prazer, sou o Eddmax!{" "}
        </strong>
        Quer saber se pode confiar no nosso trabalho? Dá uma olhada no nosso
        vídeo de apresentação no YouTube. Nos comentários, nossos clientes
        contam um pouco sobre a experiência deles conosco e a dedicação que
        colocamos em cada serviço prestado. ❤
        <br />
        <br />
        Clique aqui e veja com seus próprios olhos nossos feedbacks:
      </p>

      {/* 276×50 em x=196. O `variant="primary"` já é o retângulo do arquivo
          (#FF7300 chapado, contorno branco 15%, texto preto Poppins Bold 16);
          a sombra vem do filtro do próprio nó: dy 16, blur 18,5, preto 25%. */}
      <Button
        variant="primary"
        className="absolute top-[411px] left-[146px] w-[276px] px-0 shadow-[0_16px_18.5px_rgba(0,0,0,0.25)]"
      >
        VEJA NOSSAS REFERÊNCIAS
      </Button>

      <p className="absolute top-[486px] left-[2px] w-[568px] text-center font-helvetica text-[16px] leading-[normal] tracking-[0.16px] text-brand-placeholder">
        E fique a vontade para deixar seu feedback também!
      </p>

      {/* Assinatura do CEO (avatar 529:1068, nome 529:1067, cargo 819:108). */}
      <Image
        src="/images/home/eddmax.png"
        alt=""
        width={60}
        height={60}
        aria-hidden
        className="absolute top-[544px] left-0 size-[60px] rounded-full object-cover"
      />
      <p className="absolute top-[552px] left-[75px] font-poppins text-[18px] leading-[26px] font-bold text-white">
        EDDMAX
      </p>
      <p className="absolute top-[580px] left-[75px] font-poppins text-[12px] leading-[13px] font-medium tracking-[0.12px] text-white/80">
        CEO - LETS4TRADE
      </p>

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
 */
function VideoPlayer() {
  return (
    <button
      type="button"
      aria-label="Assistir ao vídeo de apresentação"
      className="play-button absolute top-0 left-[674px] h-[609px] w-[1146px] overflow-hidden rounded-[30px]"
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
