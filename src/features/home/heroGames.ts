/**
 * Cards do carrossel do hero (Figma 1075:4856 fechado, 1075:4914 aberto).
 *
 * Cada card tem 336×758 e eles ficam SOBREPOSTOS no estado fechado —
 * posicionados a cada 150px numa faixa de 936px, o que produz o efeito de
 * baralho aberto. Não é um carrossel de itens lado a lado enquanto está
 * fechado; vira um quando a moeda é clicada.
 *
 * A geometria do personagem e do logo muda em cada card (posição, tamanho e
 * raio do blur), então mora aqui em vez de no componente. Os valores vêm do
 * arquivo; padronizá-los desalinharia as artes, que foram recortadas em
 * proporções diferentes.
 *
 * As artes vêm do arquivo. O render do nó devolve os personagens VAZIOS (PNG
 * transparente) — quem tem os pixels é a imagem de origem do fill, obtida pelo
 * `download_assets` do MCP. Cada personagem foi casado ao seu card comparando
 * com o export composto do carrossel; os logos, por identidade de bytes com os
 * logos nomeados da seção de guias.
 *
 * Os PNGs foram reduzidos para 800×1200 (2× o maior tamanho de exibição, que é
 * 379×439): os originais somavam ~14 MB para aparecer com menos de 400px de
 * largura.
 */
export type HeroGame = {
  key: string;
  name: string;
  character: string;
  /** Posição/tamanho do personagem dentro do card de 336×758. */
  char: { left: number; top: number; width: number; height: number; blur: number };
  logo: string;
  /** `centered` posiciona o logo pelo centro do card, com deslocamento fino. */
  logoBox: { offsetX: number; top: number; width: number; height: number; blur?: number };
};

export const HERO_GAMES: HeroGame[] = [
  {
    key: "diablo",
    name: "Diablo",
    character: "/images/games/char-1.webp",
    char: { left: 10, top: 130, width: 315.712, height: 419.156, blur: 9.5 },
    logo: "/images/games/logo-1.png",
    logoBox: { offsetX: -0.48, top: 600, width: 218.23, height: 91 },
  },
  {
    key: "path-of-exile-2",
    name: "Path of Exile 2",
    character: "/images/games/char-2.webp",
    char: { left: -27.69, top: 120, width: 379.384, height: 435, blur: 12.083 },
    logo: "/images/games/logo-2.png",
    logoBox: { offsetX: -0.02, top: 590, width: 142.436, height: 117, blur: 4.228 },
  },
  {
    key: "path-of-exile",
    name: "Path of Exile",
    character: "/images/games/char-3.webp",
    char: { left: -17, top: 131, width: 367.371, height: 418.423, blur: 7.224 },
    logo: "/images/games/logo-3.png",
    logoBox: { offsetX: 2, top: 591, width: 138.667, height: 104, blur: 4.73 },
  },
  {
    key: "last-epoch",
    name: "Last Epoch",
    character: "/images/games/char-4.webp",
    char: { left: 6.96, top: 110, width: 321.423, height: 439, blur: 9 },
    logo: "/images/games/logo-4.png",
    logoBox: { offsetX: -0.3, top: 596, width: 171.409, height: 106 },
  },
  {
    key: "arc-raiders",
    name: "ARC Raiders",
    character: "/images/games/char-5.webp",
    char: { left: -1.39, top: 143, width: 341.783, height: 407, blur: 10.5 },
    logo: "/images/games/logo-5.png",
    logoBox: { offsetX: 0.19, top: 613, width: 152.375, height: 53 },
  },
];

/**
 * Geometria do slot do hero, do arquivo.
 *
 * Os cards têm 336×758 e o arquivo desenha DOIS arranjos deles, que são os
 * dois extremos da animação:
 *
 *   fechado (1075:4856) — passo de 150px, cinco cards sobrepostos ocupando
 *                         exatamente os 936px do slot;
 *   aberto  (1075:4914) — passo de 361px (336 do card + 25 de gap), SEIS cards
 *                         lado a lado somando 2141px. É mais largo que o slot,
 *                         e é por isso que o estado aberto rola.
 */
export const HERO_CARD_WIDTH = 336;
export const HERO_CLOSED_STEP = 150;
export const HERO_OPEN_STEP = 361;
/** Faixa VISÍVEL dos cards: o que sobra da linha de 1820 depois do banner. */
export const HERO_DECK_WIDTH = 936;
export const HERO_HEIGHT = 758;

/**
 * O banner e o vão até os cards. `HERO_DECK_LEFT` é onde a esteira começa
 * dentro da linha de 1820 — e também até onde ela pode correr para a esquerda
 * antes de ficar escondida atrás do banner, que é fixo e fica por cima.
 */
export const HERO_BANNER_WIDTH = 859;
export const HERO_GAP = 25;
export const HERO_DECK_LEFT = HERO_BANNER_WIDTH + HERO_GAP;
export const HERO_ROW_WIDTH = HERO_DECK_LEFT + HERO_DECK_WIDTH;

/**
 * Moeda "4" (Figma 945:901), 150×150 — o gatilho que abre o carrossel.
 *
 * As coordenadas são as do arquivo trazidas para a origem do slot: o frame põe
 * a moeda em x=1329 e o slot começa em x=934 (395 de diferença); no eixo Y a
 * moeda está em 768 e o slot começa em 120 (648). Ela nasce praticamente
 * centrada no slot (395 + 75 = 470, contra os 468 do meio) e desce 40px abaixo
 * da borda de baixo dos cards — daí o recorte do slot precisar ficar aberto no
 * eixo vertical.
 */
export const HERO_COIN = { left: 395, top: 648, size: 150 };
