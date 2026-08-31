import Image from "next/image";
import type { CSSProperties } from "react";
import {
  HERO_CARD_STEP,
  HERO_CARD_WIDTH,
  HERO_GAMES,
  HERO_HEIGHT,
  type HeroGame,
} from "./heroGames";

/**
 * Hero da home (Figma 131:1504) — banner de 859×758 à esquerda e o carrossel de
 * jogos de 936×758 à direita, com 25px entre eles e 50px de margem.
 */
export function HeroSection() {
  return (
    <section className="flex gap-[25px]">
      <HeroBanner />
      <HeroCarousel />
    </section>
  );
}

/**
 * Banner à esquerda. A arte inteira (o cartão de vidro e o logo) é um único SVG
 * exportado do Figma — só os pontinhos e a legenda ficam por cima, porque são
 * estado de interface e precisam reagir ao slide ativo.
 */
function HeroBanner() {
  return (
    <div className="relative h-[758px] w-[859px] shrink-0 overflow-hidden rounded-[30px]">
      <Image
        src="/images/hero-banner.svg"
        alt=""
        width={859}
        height={758}
        aria-hidden
        priority
        className="absolute inset-0 size-full"
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
        Sua Loja de Gamecoins
      </p>
    </div>
  );
}

/**
 * Carrossel de jogos: cinco cartões de 336px sobrepostos a cada 150px, como um
 * baralho aberto. O container tem 936px — mais estreito que a soma dos cartões,
 * e é essa diferença que cria a sobreposição.
 *
 * A ordem no DOM é a do design (o primeiro card fica por baixo); nenhum
 * `z-index` é necessário porque elementos posicionados empilham na ordem do
 * documento — e é justamente essa ordem que o efeito de baralho aproveita:
 * quem está sob o cursor empurra os SEGUINTES para a direita (`.hero-card:hover
 * ~ .hero-card` em `globals.css`), abrindo espaço para ele aparecer inteiro.
 *
 * O card visível de cada jogo é só a fatia de 150px que os cards de cima não
 * cobrem; por isso o alvo do `:hover` é sempre o card certo, sem nenhum
 * cálculo — o de cima ganha o ponteiro naturalmente.
 */
function HeroCarousel() {
  return (
    <div
      className="hero-deck relative h-[758px] shrink-0"
      style={{ width: HERO_CARD_STEP * (HERO_GAMES.length - 1) + HERO_CARD_WIDTH }}
    >
      {HERO_GAMES.map((game, index) => (
        <GameCard
          key={game.key}
          game={game}
          left={index * HERO_CARD_STEP}
          index={index}
        />
      ))}
    </div>
  );
}

/**
 * `--hero-i` é o índice do card e só serve para escalonar o atraso da animação
 * de entrada. Vai como variável CSS em vez de `animationDelay` calculado aqui
 * para que o tempo do escalonamento (90ms) fique junto do resto da animação,
 * em `globals.css`, e não dividido entre dois arquivos.
 */
function GameCard({
  game,
  left,
  index,
}: {
  game: HeroGame;
  left: number;
  index: number;
}) {
  return (
    <a
      href={`/games/${game.key}`}
      aria-label={game.name}
      className="hero-card absolute top-0 overflow-hidden rounded-[30px] border border-white/10 bg-black/10 backdrop-blur-[40px]"
      style={
        {
          left,
          width: HERO_CARD_WIDTH,
          height: HERO_HEIGHT,
          "--hero-i": index,
        } as CSSProperties
      }
    >
      {/* Personagem: uma cópia borrada atrás da nítida faz o halo. */}
      <CharacterArt game={game} blurred />
      <CharacterArt game={game} />

      <div className="hero-rule absolute top-[549px] left-[25px] h-px w-[286px] bg-white/5" />

      {game.logoBox.blur ? (
        <LogoArt game={game} blurred />
      ) : null}
      <LogoArt game={game} />

      <Image
        src="/icons/home/maximize.svg"
        alt=""
        width={18}
        height={18}
        aria-hidden
        className="hero-zoom absolute top-[715px] left-[calc(50%+125px)] size-[18px]"
      />
    </a>
  );
}

function CharacterArt({ game, blurred }: { game: HeroGame; blurred?: boolean }) {
  return (
    <Image
      src={game.character}
      alt=""
      width={Math.round(game.char.width)}
      height={Math.round(game.char.height)}
      aria-hidden
      className="hero-art absolute object-bottom"
      style={{
        left: game.char.left,
        top: game.char.top,
        width: game.char.width,
        height: game.char.height,
        filter: blurred ? `blur(${game.char.blur}px)` : undefined,
      }}
    />
  );
}

function LogoArt({ game, blurred }: { game: HeroGame; blurred?: boolean }) {
  const { offsetX, top, width, height, blur } = game.logoBox;
  return (
    <Image
      src={game.logo}
      alt=""
      width={Math.round(width)}
      height={Math.round(height)}
      aria-hidden
      className="absolute -translate-x-1/2 object-contain"
      style={{
        left: `calc(50% + ${offsetX}px)`,
        top,
        width,
        height,
        filter: blurred && blur ? `blur(${blur}px)` : undefined,
      }}
    />
  );
}
