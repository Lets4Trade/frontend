"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import {
  HERO_BANNER_WIDTH,
  HERO_CARD_WIDTH,
  HERO_CLOSED_STEP,
  HERO_COIN,
  HERO_DECK_LEFT,
  HERO_DECK_WIDTH,
  HERO_GAMES,
  HERO_GAP,
  HERO_HEIGHT,
  HERO_OPEN_STEP,
  type HeroGame,
} from "./heroGames";

/** Seis slots: os cinco jogos do arquivo mais o card "EM BREVE". */
const SLOT_COUNT = HERO_GAMES.length + 1;
const COMING_SOON_INDEX = SLOT_COUNT - 1;

/** 5 × 361 + 336 = 2141px, a largura do arranjo aberto. */
const TRACK_WIDTH = (SLOT_COUNT - 1) * HERO_OPEN_STEP + HERO_CARD_WIDTH;

/** O quanto a esteira anda até a borda direita do último card encostar no fim da linha. */
const MAX_OFFSET = TRACK_WIDTH - HERO_DECK_WIDTH;

/** Precisa bater com a duração declarada em `.hero-slot` / `.hero-track`. */
const TRANSITION_MS = 700;

/** Abaixo disso o gesto foi um clique, não um arrasto — e o link do card vale. */
const DRAG_SLOP = 6;

/**
 * Slot direito do hero: o baralho FECHADO que vira o carrossel ABERTO
 * (Figma 1075:4856 → 1075:4914).
 *
 * Estado inicial: os cinco cards sobrepostos, com a arte dessaturada, e a
 * moeda "4" na frente deles. Clicar na moeda abre o baralho — os cards se
 * separam para o passo de 361px do arquivo, ganham cor, e o sexto card
 * ("EM BREVE") entra pela direita.
 *
 * A abertura é de MÃO ÚNICA, e é o que o pedido descreve. Não há gesto de
 * fechar no arquivo, e inventar um obrigaria a escolher onde a moeda ficaria
 * depois — coisa que o design não diz.
 *
 * POR QUE ISTO É CLIENT COMPONENT e o resto do hero não: o estado aberto, a
 * parada da esteira e o arrasto precisam morar em algum lugar. O banner à
 * esquerda continua no servidor, e é ele que carrega a maior parte do peso.
 *
 * GEOMETRIA — este componente ocupa a linha INTEIRA de 1820, não só os 936px
 * dos cards, mas o RECORTE da esteira começa na borda direita do banner (859) e
 * não no vão de 25px. É o que faz o card sumir exatamente onde o banner acaba,
 * como se passasse por trás dele, em vez de ser cortado 25px adiante e deixar
 * uma faixa vazia.
 *
 * Recortar em 859 em vez de deixar a esteira correr LITERALMENTE por baixo do
 * banner é deliberado: o banner é um cartão de VIDRO (o SVG é translúcido) e o
 * brilho laranja do fundo da home atravessa ele hoje. Um card passando por trás
 * apareceria através do vidro junto com o brilho; e tapar o banner com preto
 * para resolver isso apagaria o brilho.
 */
export function HeroDeck() {
  const [open, setOpen] = useState(false);
  /**
   * Quanto a esteira já andou, em pixels. É um número LIVRE, não um índice de
   * card, e isso é proposital: o encaixe de card em card faria a esteira parar
   * sempre com a borda de um card exatamente onde o banner termina — o passo
   * (361) é o card (336) mais o vão (25), então a conta sempre cai redonda. Na
   * prática nunca se veria um card meio escondido atrás do banner, que é
   * justamente a leitura que o movimento tem que dar. As setas continuam
   * andando de card em card.
   */
  const [offset, setOffset] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [dragging, setDragging] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Gesto em curso. Vive em `ref` porque muda a cada `pointermove`. */
  const drag = useRef<{ id: number; x: number; base: number; moved: number } | null>(
    null,
  );
  /** Um arrasto termina em `click`. Sem isto, soltar sobre um card navegaria. */
  const swallowClick = useRef(false);

  useEffect(
    () => () => {
      if (settle.current) clearTimeout(settle.current);
    },
    [],
  );

  /**
   * A posição da esteira é escrita direto no DOM, e não pela prop `style`.
   *
   * Durante o arrasto ela muda a cada `pointermove` — re-renderizar seis cards
   * com `backdrop-filter: blur(40px)` nessa frequência é exatamente o que
   * derruba o quadro. Como o React não gerencia esse `transform`, ele também
   * não o reescreve sozinho ao fim do gesto: daí este efeito devolver a esteira
   * à parada oficial assim que o arrasto acaba.
   */
  useEffect(() => {
    if (!dragging && trackRef.current) {
      trackRef.current.style.transform = `translate3d(${-offset}px, 0, 0)`;
    }
  }, [offset, dragging]);

  /**
   * Liga `will-change` só pela duração do movimento. Deixá-lo fixo manteria
   * seis camadas com `backdrop-filter` promovidas na GPU o tempo todo — que é
   * exatamente o custo que este hero não pode pagar (ver `globals.css`).
   */
  const markAnimating = useCallback(() => {
    setAnimating(true);
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => setAnimating(false), TRANSITION_MS + 80);
  }, []);

  // A moeda sai de cena ao abrir. Sem realocar o foco ele cairia no `<body>` e
  // quem navega por teclado recomeçaria do topo da página.
  useEffect(() => {
    if (open) nextRef.current?.focus();
  }, [open]);

  /** Setas: um card por clique, encostando nas pontas. */
  function goBy(delta: number) {
    setOffset(clamp(offset + delta, 0, MAX_OFFSET));
    markAnimating();
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!open || event.button !== 0) return;
    swallowClick.current = false;
    drag.current = { id: event.pointerId, x: event.clientX, base: offset, moved: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = drag.current;
    if (!gesture || gesture.id !== event.pointerId || !trackRef.current) return;

    const dx = event.clientX - gesture.x;
    gesture.moved = Math.max(gesture.moved, Math.abs(dx));
    const at = clamp(gesture.base - dx, 0, MAX_OFFSET);
    trackRef.current.style.transform = `translate3d(${-at}px, 0, 0)`;
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = drag.current;
    if (!gesture || gesture.id !== event.pointerId) return;

    drag.current = null;
    setDragging(false);
    swallowClick.current = gesture.moved > DRAG_SLOP;

    setOffset(clamp(gesture.base - (event.clientX - gesture.x), 0, MAX_OFFSET));
  }

  return (
    <div
      className="hero-deck absolute inset-0 z-0"
      data-open={open}
      data-animating={animating || undefined}
      data-dragging={dragging || undefined}
    >
      <div
        className="hero-viewport absolute top-0 right-0 bottom-0"
        style={{ left: HERO_BANNER_WIDTH }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        // O `click` do link chega DEPOIS do `pointerup`; interceptá-lo na
        // captura é o que impede um arrasto de virar navegação.
        onClickCapture={(event) => {
          if (!swallowClick.current) return;
          swallowClick.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
        // Segura o arrasto nativo de imagem e de link, que roubaria o gesto.
        onDragStart={(event) => event.preventDefault()}
      >
        <div
          ref={trackRef}
          className="hero-track absolute top-0 h-full"
          // O recorte já começa em 859, então dentro dele o primeiro card fica
          // no vão de 25px — que é o `HERO_DECK_LEFT` visto de dentro.
          style={{ left: HERO_GAP, width: TRACK_WIDTH }}
        >
          {HERO_GAMES.map((game, index) => (
            <HeroSlot key={game.key} index={index}>
              <GameCard game={game} index={index} />
            </HeroSlot>
          ))}

          <HeroSlot index={COMING_SOON_INDEX}>
            <ComingSoonCard index={COMING_SOON_INDEX} />
          </HeroSlot>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          setOpen(true);
          markAnimating();
        }}
        tabIndex={open ? -1 : 0}
        aria-hidden={open || undefined}
        className="hero-coin absolute"
        style={{
          left: HERO_DECK_LEFT + HERO_COIN.left,
          top: HERO_COIN.top,
          width: HERO_COIN.size,
          height: HERO_COIN.size,
        }}
      >
        {/* `priority` porque a moeda deixou de ser enfeite: enquanto ela não
            carrega, o hero é um baralho cinza sem nenhuma pista de que existe
            alguma coisa para clicar. É o mesmo critério do banner. */}
        <Image
          src="/images/home/emblema-4.png"
          alt=""
          width={HERO_COIN.size}
          height={HERO_COIN.size}
          aria-hidden
          priority
          className="size-full"
        />
        <span className="sr-only">Abrir o carrossel de jogos</span>
      </button>

      <HeroArrow
        direction="prev"
        onClick={() => goBy(-HERO_OPEN_STEP)}
        disabled={offset <= 0}
        open={open}
      />
      <HeroArrow
        ref={nextRef}
        direction="next"
        onClick={() => goBy(HERO_OPEN_STEP)}
        disabled={offset >= MAX_OFFSET}
        open={open}
      />
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * O deslocamento que leva o slot da posição ABERTA (a de repouso no CSS) para a
 * FECHADA. Ver o comentário do bloco `.hero-slot` em `globals.css` sobre por
 * que a posição de repouso é a aberta, e não o contrário.
 *
 * O card "EM BREVE" não existe no baralho fechado: ele descansa encostado na
 * borda direita da linha, e entra deslizando na abertura.
 */
function closedShift(index: number) {
  if (index === COMING_SOON_INDEX) {
    return HERO_DECK_WIDTH - index * HERO_OPEN_STEP;
  }
  return index * (HERO_CLOSED_STEP - HERO_OPEN_STEP);
}

/**
 * O slot carrega a POSIÇÃO do card no baralho; o card carrega a REAÇÃO ao
 * cursor. São dois elementos porque `transform` é uma propriedade só: se o
 * deslocamento do baralho e a escala do `:hover` morassem no mesmo elemento, um
 * sobrescreveria o outro.
 */
function HeroSlot({ index, children }: { index: number; children: ReactNode }) {
  return (
    <div
      className="hero-slot absolute top-0"
      style={
        {
          left: index * HERO_OPEN_STEP,
          width: HERO_CARD_WIDTH,
          height: HERO_HEIGHT,
          "--hero-closed": `${closedShift(index)}px`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

/**
 * `--hero-i` é o índice do card e só serve para escalonar o atraso da animação
 * de entrada. Vai como variável CSS em vez de `animationDelay` calculado aqui
 * para que o tempo do escalonamento (90ms) fique junto do resto da animação,
 * em `globals.css`, e não dividido entre dois arquivos.
 */
function GameCard({ game, index }: { game: HeroGame; index: number }) {
  return (
    <a
      href={`/games/${game.key}`}
      aria-label={game.name}
      className="hero-card absolute inset-0 block overflow-hidden rounded-[30px] border border-white/10 bg-black/10 backdrop-blur-[40px]"
      style={{ "--hero-i": index } as CSSProperties}
    >
      {/* Personagem: uma cópia borrada atrás da nítida faz o halo. */}
      <CharacterArt game={game} blurred />
      <CharacterArt game={game} />

      <div className="hero-rule absolute top-[549px] left-[25px] h-px w-[286px] bg-white/5" />

      {game.logoBox.blur ? <LogoArt game={game} blurred /> : null}
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

/**
 * O desfoque vai por VARIÁVEL, não por `filter` no `style`: `filter` é uma
 * propriedade só, e o estado fechado precisa somar `grayscale(1)` a ela. Se o
 * blur ficasse inline, a regra do cinza o apagaria. Ver `globals.css`.
 */
function CharacterArt({ game, blurred }: { game: HeroGame; blurred?: boolean }) {
  return (
    <Image
      src={game.character}
      alt=""
      width={Math.round(game.char.width)}
      height={Math.round(game.char.height)}
      aria-hidden
      className="hero-art absolute object-bottom"
      style={
        {
          left: game.char.left,
          top: game.char.top,
          width: game.char.width,
          height: game.char.height,
          "--hero-blur": blurred ? `${game.char.blur}px` : undefined,
        } as CSSProperties
      }
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
      className="hero-logo absolute -translate-x-1/2 object-contain"
      style={
        {
          left: `calc(50% + ${offsetX}px)`,
          top,
          width,
          height,
          "--hero-blur": blurred && blur ? `${blur}px` : undefined,
        } as CSSProperties
      }
    />
  );
}

/** Faixa "Linear Brilho" (1075:4951/4952): laranja no meio, transparente nas pontas. */
const EDGE_GLOW =
  "linear-gradient(90deg, rgba(255,115,0,0) 0%, #ff7300 49.825%, rgba(255,115,0,0) 100%)";

/**
 * Card "EM BREVE" (Figma 1075:4946) — o sexto do arranjo aberto, e o único que
 * não existe no baralho fechado.
 *
 * Não tem personagem, logo, régua nem ícone de maximizar: só o vidro, o brilho
 * laranja na borda de cima e os dois textos. Também não é link — não há para
 * onde ir.
 */
function ComingSoonCard({ index }: { index: number }) {
  return (
    <div
      className="hero-card absolute inset-0 overflow-hidden rounded-[30px] border border-white/10 bg-black/10 backdrop-blur-[40px]"
      style={{ "--hero-i": index } as CSSProperties}
    >
      {/* Duas faixas de 286px centradas (o card tem 336, sobram 25 de cada
          lado). A de baixo é a linha; a de cima é a mesma faixa desfocada, que
          faz o halo — o arquivo desenha as duas separadas. */}
      <span
        aria-hidden
        className="absolute -top-px left-[25px] h-[2.5px] w-[286px] blur-[3.5px]"
        style={{ backgroundImage: EDGE_GLOW }}
      />
      <span
        aria-hidden
        className="absolute top-[0.5px] left-[25px] h-[1.5px] w-[286px]"
        style={{ backgroundImage: EDGE_GLOW }}
      />

      <p className="absolute top-[314px] left-[25px] w-[247px] font-poppins text-[65px] leading-none font-semibold text-white">
        EM
        <br />
        BREVE
      </p>

      {/* `nowrap` porque a caixa do arquivo tem 105×15 — quinze pixels de
          altura é UMA linha. Nossa Helvetica Neue mede um pouco mais larga que
          a do Figma e quebraria em duas dentro dos 105. */}
      <p className="absolute top-[459px] left-[25px] w-[105px] text-center font-helvetica text-[16px] leading-normal font-medium tracking-[0.16px] whitespace-nowrap text-brand-placeholder">
        Novos Games
      </p>
    </div>
  );
}

/**
 * Seta do carrossel. Só aparece no estado aberto, mas fica SEMPRE no DOM: é o
 * que permite mandar o foco para ela no instante em que a moeda desaparece, sem
 * depender de um frame de montagem.
 *
 * Elas continuam existindo mesmo com o arrasto ligado: são o afordance visível
 * e o único caminho por teclado.
 *
 * O ícone é o `chevron-down` do projeto girado — mesmo traço do resto da home e
 * um arquivo a menos para o navegador baixar.
 */
function HeroArrow({
  direction,
  onClick,
  disabled,
  open,
  ref,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
  open: boolean;
  ref?: Ref<HTMLButtonElement>;
}) {
  const isNext = direction === "next";
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      tabIndex={open ? 0 : -1}
      aria-hidden={!open || undefined}
      className="hero-arrow absolute top-[calc(50%-24px)] flex size-[48px] items-center justify-center rounded-full border border-white/25 bg-black/70"
      // A seta da esquerda encosta na borda da faixa VISÍVEL (logo depois do
      // banner), não na do componente, que hoje cobre a linha inteira.
      style={isNext ? { right: 16 } : { left: HERO_DECK_LEFT + 16 }}
    >
      <Image
        src="/icons/chevron-down.svg"
        alt=""
        width={18}
        height={18}
        aria-hidden
        className={`size-[18px] ${isNext ? "-rotate-90" : "rotate-90"}`}
      />
      <span className="sr-only">
        {isNext ? "Próximos jogos" : "Jogos anteriores"}
      </span>
    </button>
  );
}
