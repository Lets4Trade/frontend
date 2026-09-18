import { HeroBannerSlides } from "./HeroBannerSlides";
import { HeroDeck } from "./HeroDeck";
import type { SectionItemView } from "@/features/site/content";
import { HERO_BANNER_WIDTH, HERO_HEIGHT, type HeroSlide } from "./heroGames";

/**
 * Hero da home (Figma 131:1504) — banner de 859×758 à esquerda e o slot de
 * jogos de 936×758 à direita, com 25px entre eles e 50px de margem.
 *
 * O slot da direita é o único pedaço interativo: começa como o baralho fechado
 * (1075:4856) e vira o carrossel (1075:4914) quando a moeda é clicada. Está em
 * `HeroDeck`, que é client component; o banner continua no servidor.
 *
 * AS DUAS PEÇAS SE SOBREPÕEM, não são colunas de um `flex`: o `HeroDeck` cobre
 * a linha inteira e ancora nela o recorte da esteira, a moeda e as setas. O
 * banner vem DEPOIS no DOM e com `z-10` — a esteira some na borda dele, mas o
 * card sob o cursor sobe para `z-index: 1` e sem isso poderia passar na frente.
 */
/** A arte padrão do topo, quando o admin não subiu outra. */
const HERO_ART = "/images/hero-banner.svg";

export function HeroSection({
  image = HERO_ART,
  caption = "Sua Loja de Gamecoins",
  slides,
  bannerImages = [],
}: {
  image?: string;
  /**
   * As artes do BANNER (as três barrinhas do arquivo). Lista própria
   * (`home:hero-banner`), separada dos cards do carrossel ao lado.
   */
  bannerImages?: SectionItemView[];
  /** Os cards do carrossel, já resolvidos por `buildHeroSlides`. */
  slides: HeroSlide[];
  /**
   * A legenda sob o banner.
   *
   * Era texto fixo, e a seção "Home - Hero" da tela de edição salvava um título
   * que NADA desenhava — o campo prometia um efeito que não acontecia. Agora é
   * esta linha.
   */
  caption?: string;
}) {
  return (
    <section className="relative" style={{ height: HERO_HEIGHT }}>
      <HeroDeck slides={slides} />
      <HeroBanner image={image} caption={caption} bannerImages={bannerImages} />
    </section>
  );
}

/**
 * Banner à esquerda. A arte inteira (o cartão de vidro e o logo) é um único SVG
 * exportado do Figma — só os pontinhos e a legenda ficam por cima, porque são
 * estado de interface e precisam reagir ao slide ativo.
 */
function HeroBanner({
  image,
  caption,
  bannerImages,
}: {
  image: string;
  caption: string;
  bannerImages: SectionItemView[];
}) {
  return (
    <div
      className="absolute top-0 left-0 z-10 rounded-[30px]"
      style={{ width: HERO_BANNER_WIDTH, height: HERO_HEIGHT }}
    >
      <HeroBannerSlides fallbackImage={image} items={bannerImages} />

      <p data-edit-field="home:hero:title" className="absolute top-[691px] left-[50px] font-helvetica text-[18px] leading-[17px] font-bold tracking-[0.18px] text-white">
        {caption}
      </p>
    </div>
  );
}
