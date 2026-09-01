/**
 * Cards de "GUIAS POPULARES" (Figma 791:1610).
 *
 * A faixa tem 1808×440 e mistura DOIS formatos: três cards altos de 417×438
 * (arte do jogo ocupando o card inteiro, texto no rodapé) e, na quarta coluna,
 * dois cards baixos de 417×206 empilhados — um de destaque e o de "VISITAR
 * BLOG". Por isso a geometria mora aqui, e não numa grade no componente.
 *
 * O logo de cada jogo tem tamanho próprio (as artes foram recortadas em
 * proporções diferentes), então vai junto do card.
 *
 * Cada card tem DOIS degradês pretos, e não um: um no topo e outro no rodapé.
 * O do topo é o que antes parecia um retângulo solto fora do card no inspector
 * — no arquivo ele é um degradê girado 180°, por isso a caixa aparecia
 * deslocada. Sem ele o logo perde contraste contra artes claras.
 */
export type Guide = {
  key: string;
  /** `null` no card de destaque, que no arquivo não tem título. */
  title: string | null;
  body: string;
  art: string;
  logo: string;
  /** Posição do card dentro da faixa de 1808. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** Caixa do logo, relativa ao card. */
  logoBox: { left: number; top: number; width: number; height: number };
  /**
   * Degradês pretos do card, relativos a ele. `bottomStop` é o ponto em que o
   * preto fica opaco: nos cards altos o arquivo trava em 55,769% e o resto
   * segue chapado; no card baixo o preto só fecha no fim.
   */
  scrim: {
    topHeight: number;
    bottomTop: number;
    bottomHeight: number;
    bottomStop: string;
  };
};

/** Os três cards altos (417×438) compartilham a mesma geometria de degradê. */
const TALL_SCRIM = {
  topHeight: 126,
  bottomTop: 137,
  bottomHeight: 300,
  bottomStop: "55.769%",
} as const;

const LOREM =
  "There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour, or randomised wordS.";

export const GUIDES: Guide[] = [
  {
    key: "diablo",
    title: "GUIA DIABLO",
    body: LOREM,
    art: "/images/guides/diablo.webp",
    logo: "/images/guides/logo-diablo.png",
    left: 0,
    top: 2,
    width: 417,
    height: 438,
    logoBox: { left: 25, top: 25, width: 86.09, height: 44 },
    scrim: TALL_SCRIM,
  },
  {
    key: "path-of-exile",
    title: "GUIA PATH OF EXILE",
    body: LOREM,
    art: "/images/guides/path-of-exile.webp",
    logo: "/images/guides/logo-path-of-exile.png",
    left: 457,
    top: 1,
    width: 417,
    height: 438,
    logoBox: { left: 25, top: 25, width: 66.67, height: 50 },
    scrim: TALL_SCRIM,
  },
  {
    key: "path-of-exile-2",
    title: "GUIA PATH OF EXILE 2",
    body: LOREM,
    art: "/images/guides/path-of-exile-2.webp",
    logo: "/images/guides/logo-path-of-exile-2.png",
    left: 924,
    top: 0,
    width: 417,
    height: 438,
    logoBox: { left: 25, top: 25, width: 71, height: 58.32 },
    scrim: TALL_SCRIM,
  },
  {
    key: "last-epoch",
    title: null,
    body: "There are many variations of passages of Lorem Ipsum available, but the majority have suffered...",
    art: "/images/guides/last-epoch.webp",
    logo: "/images/guides/logo-last-epoch.png",
    left: 1391,
    top: 1,
    width: 417,
    height: 206,
    logoBox: { left: 25, top: 21.91, width: 66, height: 40.81 },
    // Card baixo: o degradê do rodapé fecha em preto só no fim.
    scrim: { topHeight: 68, bottomTop: 83, bottomHeight: 122, bottomStop: "100%" },
  },
];

/** Card "VISITAR BLOG", que fecha a quarta coluna (Figma 791:1595). */
export const BLOG_CARD = {
  left: 1391,
  top: 232,
  width: 417,
  height: 206,
  title: "VISITAR BLOG",
  subtitle: "Veja mais artigos como esses",
  href: "/blog",
};
