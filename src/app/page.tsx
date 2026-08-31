import type { Metadata } from "next";
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

      <main className="flex-1 overflow-x-auto">
        <div className="mx-auto w-[1920px] px-[50px] pt-[37px] pb-[100px]">
          <HeroSection />
          <HomeNav />

          {/* Divisor em y=1076 no design. A faixa de navegação acima termina em
              1007 porque o número e o rótulo dos contadores se sobrepõem no
              arquivo (o rótulo começa em 988, 3px antes de o número acabar) e
              aqui eles são empilhados. 69px fecha essa diferença e faz todas as
              seções seguintes caírem na coordenada exata do design. */}
          <hr className="mt-[69px] border-0 border-t border-brand-hairline" />

          <VideoSection />

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
      </main>

      <SiteFooter />
    </div>
  );
}


