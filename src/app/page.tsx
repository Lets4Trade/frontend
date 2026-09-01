import type { Metadata } from "next";
import Image from "next/image";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { FaqSection } from "@/features/home/FaqSection";
import { GuidesSection } from "@/features/home/GuidesSection";
import { HeroSection } from "@/features/home/HeroSection";
import { HomeNav } from "@/features/home/HomeNav";
import { ReviewsSection } from "@/features/home/ReviewsSection";
import { TeamSection } from "@/features/home/TeamSection";
import { VideoSection } from "@/features/home/VideoSection";

const OG_TITLE = "Lets4Trade";
const OG_DESCRIPTION = "Sua loja de gamecoins.";

export const metadata: Metadata = {
  title: OG_TITLE,
  description: OG_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    url: "/",
    type: "website",
    siteName: OG_TITLE,
  },
};

/**
 * Home — Figma nó 131:1504 (1920×5770).
 *
 * Construída por seções. O design tem 50px de margem lateral, então o conteúdo
 * é uma faixa de 1820px centrada.
 *
 * As margens entre as seções são a DIFERENÇA entre as coordenadas do arquivo,
 * não valores escolhidos: cada seção tem altura fixa e conhecida, então o
 * espaçamento é `topoDaPróxima - fimDaAnterior`. Os pontos de referência, no
 * eixo Y do frame de 1920:
 *
 *   1076  divisor sob a navegação
 *   1127  bloco do vídeo (topo do player)   → fim em 1736
 *   1835  "NOSSAS REVIEWS"                  → fim em 2470
 *   2577  "EQUIPE LETS 4 TRADE"             → fim em 3596 (divisor)
 *   3696  "GUIAS POPULARES"                 → fim em 4216
 *   4316  "DÚVIDAS SOBRE A EMPRESA"         → fim em 5116
 *   5216  rodapé
 */
export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-brand-bg">
      <SiteHeader />

      {/*
        A moldura reproduz o frame de 1920 do arquivo, mas ela ENCOLHE até 1820 —
        que é a largura real do conteúdo. Os 100px que sobram são as duas
        margens de 50, e são elas que cedem primeiro.

        Sem isso a home tinha barra de rolagem horizontal em QUALQUER monitor de
        1920: a barra vertical come ~18px, sobram 1902 de área útil, e uma faixa
        rígida de 1920 não cabe. Agora a margem vira 41px nesse caso — diferença
        que ninguém enxerga — e a barra some.

        `overflow-x: clip` (e não `hidden`) corta o que sangra para fora da
        moldura — o mapa-múndi e os brilhos, que no arquivo o próprio frame
        recorta — sem criar um container de rolagem, o que quebraria as
        animações presas à rolagem.

        Abaixo de 1820 o `min-w` segura e a rolagem volta: aí o conteúdo
        realmente não cabe. Ver a pendência de layout para telas pequenas em
        .claude/context/open-questions.md.
      */}
      <main className="flex-1 overflow-x-auto">
        <div className="relative mx-auto w-full max-w-[1920px] min-w-[1820px] overflow-x-clip">
          <HomeBackdrop />

          <div className="mx-auto w-[1820px] pt-[37px] pb-[100px]">
            <HeroSection />
            <HomeNav />

            {/* Divisor em y=1076 no design. A faixa de navegação acima ocupa até
              1007 (a caixa do grupo 796:1624), então 69px fecham a diferença. */}
            <hr className="mt-[69px] border-0 border-t border-brand-hairline" />

            <div className="mt-[50px]">
              <VideoSection />
            </div>

            <div className="mt-[99px]">
              <ReviewsSection />
            </div>

            <div className="mt-[107px]">
              <TeamSection />
            </div>

            <div className="mt-[100px]">
              <GuidesSection />
            </div>

            <div className="mt-[100px]">
              <FaqSection />
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

/**
 * Camada decorativa do frame (Figma 362:800 "Effect 2", 567:1710 "Ellipse 8",
 * 945:901 e 269:488). São filhos diretos do frame Home, não de uma seção: ficam
 * atrás de tudo e atravessam os limites das seções, então moram aqui.
 *
 * As coordenadas do arquivo têm origem no topo do frame — que é o topo do
 * CABEÇALHO, 83px acima desta faixa. Daí o desconto de 83 em cada `top`.
 *
 * Os dois brilhos vêm como SVG com o desfoque já rasterizado. Reproduzi-los com
 * `filter: blur()` custaria caro: são raios de 192px e 250px sobre áreas de até
 * 671×1742, e o compositor refaz esse desfoque a cada repaint. O SVG é
 * desenhado uma vez.
 *
 * O invólucro recorta para que o topo negativo do primeiro brilho não gere
 * rolagem vertical dentro do `main`, que é um container de rolagem horizontal.
 */
function HomeBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <Image
        src="/images/home/glow-hero.svg"
        alt=""
        width={508}
        height={1012}
        className="absolute -top-[83px] left-0 h-[1012px] w-[508px] max-w-none"
      />

      <Image
        src="/images/home/glow-guias.svg"
        alt=""
        width={671}
        height={1742}
        className="absolute top-[2308.09px] left-0 h-[1742px] w-[671px] max-w-none"
      />

      {/* Par do brilho acima, do outro lado (567:1712). É o fundo quente por
          trás do mapa-múndi: vai da seção da equipe até a faixa dos guias, e o
          centro da elipse cai FORA do frame, à direita — o que aparece é a
          borda dela. */}
      <Image
        src="/images/home/glow-equipe.svg"
        alt=""
        width={700}
        height={1663}
        className="absolute top-[2614.97px] left-[1220.5px] h-[1663px] w-[700px] max-w-none"
      />

      {/* Emblema "4" entre os cards do hero (945:901). */}
      <Image
        src="/images/home/emblema-4.png"
        alt=""
        width={150}
        height={150}
        className="absolute top-[685px] left-[1329px] size-[150px]"
      />

      {/* Botão de contato flutuante (269:488): mesmo vidro dos cards — preto a
          10%, contorno branco a 10% —, mas com desfoque de 10,8px em vez de 40.
          Entra como ARTE, sem ação: o design não diz para onde ele leva.
          Ver .claude/context/open-questions.md. */}
      <span className="absolute top-[847px] left-[1798px] flex size-[72px] items-center justify-center rounded-full border border-white/10 bg-black/10 backdrop-blur-[10.8px]">
        <Image
          src="/icons/home/chat-dialog.svg"
          alt=""
          width={24}
          height={24}
          className="size-[24px]"
        />
      </span>
    </div>
  );
}
