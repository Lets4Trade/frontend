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
 * ⚠️ `art` e `logo` apontam para arquivos que ainda NÃO existem — o export do
 * Figma está bloqueado pelo limite mensal do plano Starter. Os slots estão com
 * a geometria certa; basta soltar os PNGs em `public/images/guides/`.
 * Ver .claude/context/open-questions.md.
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
};

const LOREM =
  "There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour, or randomised wordS.";

export const GUIDES: Guide[] = [
  {
    key: "diablo",
    title: "GUIA DIABLO",
    body: LOREM,
    art: "/images/guides/diablo.png",
    logo: "/images/guides/logo-diablo.png",
    left: 0,
    top: 2,
    width: 417,
    height: 438,
    logoBox: { left: 25, top: 25, width: 86.09, height: 44 },
  },
  {
    key: "path-of-exile",
    title: "GUIA PATH OF EXILE",
    body: LOREM,
    art: "/images/guides/path-of-exile.png",
    logo: "/images/guides/logo-path-of-exile.png",
    left: 457,
    top: 1,
    width: 417,
    height: 438,
    logoBox: { left: 25, top: 25, width: 66.67, height: 50 },
  },
  {
    key: "path-of-exile-2",
    title: "GUIA PATH OF EXILE 2",
    body: LOREM,
    art: "/images/guides/path-of-exile-2.png",
    logo: "/images/guides/logo-path-of-exile-2.png",
    left: 924,
    top: 0,
    width: 417,
    height: 438,
    logoBox: { left: 25, top: 25, width: 71, height: 58.32 },
  },
  {
    key: "last-epoch",
    title: null,
    body: "There are many variations of passages of Lorem Ipsum available, but the majority have suffered...",
    art: "/images/guides/last-epoch.png",
    logo: "/images/guides/logo-last-epoch.png",
    left: 1391,
    top: 1,
    width: 417,
    height: 206,
    logoBox: { left: 25, top: 21.91, width: 66, height: 40.81 },
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
