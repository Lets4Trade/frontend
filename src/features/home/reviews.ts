/**
 * Depoimentos do carrossel "NOSSAS REVIEWS" (Figma 547:1251).
 *
 * O carrossel do design tem 1820px de largura visível e OITO cards de 288px
 * dispostos a cada 313px (288 + 25 de vão), começando em -329. Ou seja: o
 * primeiro e o último ficam cortados pelas bordas — é o estado "peek" clássico
 * de carrossel, e está assim no arquivo.
 *
 * `left` guarda a posição EXATA do design (relativa ao frame do carrossel), e
 * não um índice, porque os cards não começam em zero. Derivar de `index * 313`
 * daria o mesmo resultado só se eu somasse o deslocamento inicial em todo
 * lugar; guardar o valor lido do arquivo evita esse erro silencioso.
 *
 * Os avatares vieram do arquivo, casados nome a nome pelo código de referência
 * do nó — a ordem em que o MCP devolve as imagens não acompanha a ordem visual
 * dos cards, então casar por posição trocaria os rostos.
 */
export type Review = {
  /** Posição no eixo X dentro do frame do carrossel, como no arquivo. */
  left: number;
  name: string;
  avatar: string;
  body: string;
};

/** Largura do card e passo entre eles (288 + 25 de vão), do design. */
export const REVIEW_CARD_WIDTH = 288;
export const REVIEW_CARD_HEIGHT = 387;
export const REVIEW_CARD_STEP = 313;

/**
 * O X do PRIMEIRO card. Os demais saem daí, somando o passo.
 *
 * O arquivo escreve as oito posições uma a uma (-329, -16, 297...), mas elas
 * formam uma progressão exata de 313px. Guardar o início e o passo é o que faz
 * a esteira funcionar com QUALQUER quantidade de depoimentos — e a lista agora
 * vem do banco, onde o admin adiciona e remove.
 */
export const REVIEW_FIRST_LEFT = -329;
