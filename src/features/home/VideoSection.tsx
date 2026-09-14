import Image from "next/image";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { VideoPlayer } from "./VideoPlayer";
import { youtubeId, youtubeWatchUrl } from "./youtube";

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
/** A miniatura padrão do vídeo, quando o admin não subiu outra. */
const VIDEO_THUMB = "/images/video-thumb.png";

export function VideoSection({
  title = "CLIENTES 100%\nSATISFEITOS",
  image = VIDEO_THUMB,
  videoUrl,
}: {
  title?: string;
  image?: string;
  /**
   * O link do YouTube, digitado no painel ("Home - Vídeo"). Só o ID é
   * aproveitado — ver `youtube.ts`. Link inválido conta como ausente.
   */
  videoUrl?: string;
}) {
  const videoId = youtubeId(videoUrl);

  return (
    <section className="relative h-[609px]">
      {/* Título: Poppins SemiBold 65 em duas linhas, caixa de 547 (526:1064). */}
      {/* `whitespace-pre-line`: o título vem da tela "Edição de sessões" e a
          quebra dele é uma quebra de linha de verdade no campo, não um `<br>`
          que o admin teria que digitar. O padrão do arquivo tem duas linhas. */}
      <h2 className="absolute top-[93px] left-0 w-[547px] text-center font-poppins text-[65px] leading-none font-semibold whitespace-pre-line text-white">
        {title}
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
      {/* Era um `<Button>` sem ação nenhuma. O texto logo acima diz que os
          feedbacks estão nos comentários do vídeo, então é para lá que ele
          leva — em nova aba, porque sai da loja. Sem vídeo, desce até as
          reviews da própria home, que é a outra prova que a página tem. */}
      <a
        href={videoId ? youtubeWatchUrl(videoId) : "#reviews"}
        {...(videoId ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className={cn(
          buttonVariants({ variant: "primary" }),
          "absolute top-[411px] left-[146px] w-[276px] px-0 shadow-[0_16px_18.5px_rgba(0,0,0,0.25)]",
        )}
      >
        VEJA NOSSAS REFERÊNCIAS
      </a>

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

      <VideoPlayer image={image} videoId={videoId} />
    </section>
  );
}
