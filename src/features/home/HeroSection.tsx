import Image from "next/image";
import { HeroDeck } from "./HeroDeck";
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
}: {
  image?: string;
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
      <HeroBanner image={image} caption={caption} />
    </section>
  );
}

/**
 * Banner à esquerda. A arte inteira (o cartão de vidro e o logo) é um único SVG
 * exportado do Figma — só os pontinhos e a legenda ficam por cima, porque são
 * estado de interface e precisam reagir ao slide ativo.
 */
function HeroBanner({ image, caption }: { image: string; caption: string }) {
  return (
    <div
      className="absolute top-0 left-0 z-10 rounded-[30px]"
      style={{ width: HERO_BANNER_WIDTH, height: HERO_HEIGHT }}
    >
      <Image
        src={image}
        alt=""
        width={859}
        height={758}
        aria-hidden
        priority
        className="absolute inset-0 size-full overflow-hidden rounded-[30px]"
      />

      {/* Indicadores: 3 barras de 40×3 a cada 50px. A ativa tem o degradê
          laranja com uma cópia borrada atrás fazendo o brilho. */}
      <div className="absolute top-[663px] left-[50px] flex gap-[10px]">
        {[0, 1, 2].map((i) => (
          <span key={i} className="relative block h-[3px] w-[40px]">
            {i === 0 ? (
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
          </span>
        ))}
      </div>

      <p className="absolute top-[691px] left-[50px] font-helvetica text-[18px] leading-[17px] font-bold tracking-[0.18px] text-white">
        {caption}
      </p>
    </div>
  );
}
