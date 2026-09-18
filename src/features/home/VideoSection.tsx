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
/**
 * Os textos do bloco, com o padrão do arquivo do Figma como reserva. Num lugar
 * só porque a versão MOBILE da home (`mobile/MobileHome.tsx`) desenha os
 * mesmos textos — duas cópias do padrão divergiriam na primeira edição.
 */
export function videoTexts(extra: (name: string, fallback: string) => string) {
  return {
    saudacao: extra("saudacao", "Muito prazer, sou o Eddmax!"),
    apresentacao: extra(
      "apresentacao",
      "Quer saber se pode confiar no nosso trabalho? Dá uma olhada no nosso vídeo de apresentação no YouTube. Nos comentários, nossos clientes contam um pouco sobre a experiência deles conosco e a dedicação que colocamos em cada serviço prestado. ❤",
    ),
    chamada: extra("chamada", "Clique aqui e veja com seus próprios olhos nossos feedbacks:"),
    botao: extra("botao", "VEJA NOSSAS REFERÊNCIAS"),
    convite: extra("convite", "E fique a vontade para deixar seu feedback também!"),
    assinaturaNome: extra("assinatura-nome", "EDDMAX"),
    assinaturaCargo: extra("assinatura-cargo", "CEO - LETS4TRADE"),
  };
}

/** A miniatura padrão do vídeo, quando o admin não subiu outra. */
const VIDEO_THUMB = "/images/video-thumb.png";

/** A foto padrão da assinatura, quando o admin não subiu outra. */
const CEO_AVATAR = "/images/home/eddmax.png";

export function VideoSection({
  title = "CLIENTES 100%\nSATISFEITOS",
  image = VIDEO_THUMB,
  avatar = CEO_AVATAR,
  videoUrl,
  videoFile,
  extra = (_name: string, fallback: string) => fallback,
}: {
  title?: string;
  image?: string;
  /** Foto da assinatura do CEO — a SEGUNDA arte da sessão. */
  avatar?: string;
  /**
   * Os textos EXTRAS da sessão (apresentação, chamada, botão, assinatura).
   * Vêm da tela de edição; o padrão é o texto do arquivo do Figma, escrito aqui
   * junto de onde ele é desenhado.
   */
  extra?: (name: string, fallback: string) => string;
  /**
   * O link do YouTube, digitado no painel ("Home - Vídeo"). Só o ID é
   * aproveitado — ver `youtube.ts`. Link inválido conta como ausente.
   */
  videoUrl?: string;
  /** Vídeo ENVIADO pelo painel (URL já conferida em `content.ts`). */
  videoFile?: string;
}) {
  const videoId = youtubeId(videoUrl);
  const t = videoTexts(extra);
  // Qual fonte vale hoje — o editor de páginas lê isto para abrir o painel do
  // vídeo já dizendo o que está tocando. Na loja é só um atributo.
  const current = videoFile ? "file" : videoId ? "link" : "none";

  return (
    <section className="relative h-[609px]">
      {/* Título: Poppins SemiBold 65 em duas linhas, caixa de 547 (526:1064). */}
      {/* `whitespace-pre-line`: o título vem da tela "Edição de sessões" e a
          quebra dele é uma quebra de linha de verdade no campo, não um `<br>`
          que o admin teria que digitar. O padrão do arquivo tem duas linhas. */}
      <h2 data-edit-field="home:video:title" className="absolute top-[93px] left-0 w-[547px] text-center font-poppins text-[65px] leading-none font-semibold whitespace-pre-line text-white">
        {title}
      </h2>

      {/* No arquivo a primeira frase é Bold e branca, e o resto Regular em
          #d8d8d8 — é um único bloco de texto com dois estilos, não dois
          parágrafos. */}
      <p className="absolute top-[254px] left-0 w-[570px] text-center font-helvetica text-[18px] leading-[normal] tracking-[0.18px] whitespace-pre-line text-brand-placeholder">
        <strong data-edit-field="home:video:extra.saudacao" className="font-bold text-white">
          {t.saudacao}
        </strong>{" "}
        <span data-edit-field="home:video:extra.apresentacao">
          {t.apresentacao}
        </span>
        {"\n\n"}
        <span data-edit-field="home:video:extra.chamada">
          {t.chamada}
        </span>
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
        <span data-edit-field="home:video:extra.botao">
          {t.botao}
        </span>
      </a>

      <p
        data-edit-field="home:video:extra.convite"
        className="absolute top-[486px] left-[2px] w-[568px] text-center font-helvetica text-[16px] leading-[normal] tracking-[0.16px] text-brand-placeholder"
      >
        {t.convite}
      </p>

      {/* Assinatura do CEO (avatar 529:1068, nome 529:1067, cargo 819:108). */}
      {/* No editor, clicar na foto troca a SEGUNDA arte da sessão (a
          primeira é a capa do vídeo). */}
      <Image
        src={avatar}
        alt=""
        width={60}
        height={60}
        aria-hidden
        data-edit-image="home:video"
        data-edit-slot="secondary"
        className="absolute top-[544px] left-0 size-[60px] rounded-full object-cover"
      />
      <p
        data-edit-field="home:video:extra.assinatura-nome"
        className="absolute top-[552px] left-[75px] font-poppins text-[18px] leading-[26px] font-bold text-white"
      >
        {t.assinaturaNome}
      </p>
      <p
        data-edit-field="home:video:extra.assinatura-cargo"
        className="absolute top-[580px] left-[75px] font-poppins text-[12px] leading-[13px] font-medium tracking-[0.12px] text-white/80"
      >
        {t.assinaturaCargo}
      </p>

      {/* `data-edit-image`: no editor do painel, clicar na capa troca a arte da
          sessão. Na loja é só um atributo — nenhum JavaScript a mais. */}
      <div
        data-edit-video="home:video"
        data-video-current={current}
        data-video-link={videoId ? videoUrl : ""}
      >
        <VideoPlayer image={image} videoId={videoId} videoFile={videoFile} />
      </div>
    </section>
  );
}
