/**
 * Cards da seção "EQUIPE LETS 4 TRADE" (Figma 578:1736 e irmãos).
 *
 * Os sete cards têm 361×446 e NÃO formam grade: cada um tem posição própria,
 * espalhada sobre o mapa-múndi do fundo (o desenho sugere "time distribuído").
 * `left`/`top` são as coordenadas do arquivo já convertidas para a origem da
 * seção — o topo do título (y=2577 no frame de 1920) e os 50px de margem da
 * página descontados do eixo X. EDDMAX começa ACIMA do título, daí o topo
 * negativo.
 *
 * ⚠️ `photo` aponta para arquivos que ainda NÃO existem — o export do Figma
 * está bloqueado pelo limite mensal do plano Starter. Os slots estão com a
 * geometria certa (261×316,36 a 50px das bordas do card); basta soltar os PNGs
 * em `public/images/team/`. Ver .claude/context/open-questions.md.
 */
export type TeamMember = {
  name: string;
  photo: string;
  left: number;
  top: number;
};

export const TEAM_CARD_WIDTH = 361;
export const TEAM_CARD_HEIGHT = 446;
/** Foto dentro do card: 50px de folga em cima e nas laterais. */
export const TEAM_PHOTO_WIDTH = 261;
export const TEAM_PHOTO_HEIGHT = 316.36;

export const TEAM: TeamMember[] = [
  { name: "DANIEL", photo: "/images/team/daniel.png", left: 82, top: -1 },
  { name: "EDDMAX", photo: "/images/team/eddmax.png", left: 1372, top: -66 },
  { name: "LUAN", photo: "/images/team/luan.png", left: 1377, top: 408 },
  { name: "YURI", photo: "/images/team/yuri.png", left: 707, top: 469 },
  { name: "ROGUE", photo: "/images/team/rogue.png", left: 79, top: 479 },
  { name: "GUS", photo: "/images/team/gus.png", left: 1050, top: 511 },
  { name: "ZEZÃO", photo: "/images/team/zezao.png", left: 382, top: 514 },
];
