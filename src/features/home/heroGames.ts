/**
 * Cards do carrossel do hero (Figma 1075:4856).
 *
 * Cada card tem 336×758 e eles ficam SOBREPOSTOS — posicionados a cada 150px
 * numa faixa de 936px, o que produz o efeito de baralho aberto. Não é um
 * carrossel de itens lado a lado.
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

/** Largura de cada card e o passo horizontal entre eles, do design. */
export const HERO_CARD_WIDTH = 336;
export const HERO_CARD_STEP = 150;
export const HERO_HEIGHT = 758;
