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
 * ⚠️ `avatar` aponta para arquivos que ainda NÃO existem — o export do Figma
 * está bloqueado pelo limite mensal do plano Starter. Os slots estão com a
 * geometria certa (42×42, círculo); basta soltar os PNGs em
 * `public/images/reviews/`. Ver .claude/context/open-questions.md.
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

export const REVIEWS: Review[] = [
  {
    left: -329,
    name: "VICC",
    avatar: "/images/reviews/vicc.png",
    body: "Fiquei realmente impressionado com a qualidade do serviço da LETS4TRADE. Comprei moedas para Diablo e todo o processo foi extremamente rápido e transparente. A entrega aconteceu em poucos minutos, exatamente como prometido. Além disso, o suporte foi muito educado e tirou todas as minhas dúvidas antes de finalizar a compra. É muito bom encontrar uma loja que passa confiança assim. Recomendo demais!",
  },
  {
    left: -16,
    name: "MIKEEZ",
    avatar: "/images/reviews/mikeez.png",
    body: "Era minha primeira vez comprando moedas online e eu estava com receio, mas a equipe da LETS4TRADE deixou tudo muito simples. O atendimento foi rápido, direto e super atencioso. Comprei moedas de Path of Exile 2 e chegou tudo certinho, sem qualquer problema. A loja é organizada, o processo é claro e a entrega é realmente imediata. Experiência excelente, com certeza volto a comprar.",
  },
  {
    left: 297,
    name: "MARSH",
    avatar: "/images/reviews/marsh.png",
    body: "LETS4TRADE me surpreendeu muito pela eficiência! Fiz o pedido, paguei e em questão de minutos minhas moedas já estavam na minha conta. Achei muito profissional o jeito que eles conduzem tudo, desde a comunicação até a confirmação da entrega. É ótimo quando encontramos um serviço que funciona exatamente como deveria. Loja rápida, confiável e com preços muito bons. Recomendo sem pensar duas vezes.",
  },
  {
    left: 610,
    name: "NUKETOWN",
    avatar: "/images/reviews/nuketown.png",
    body: "Já comprei moedas em outras lojas, mas nenhuma chegou perto da experiência que tive com a LETS4TRADE. A plataforma é simples, a compra é rápida e a entrega foi instantânea. O suporte também merece elogios — educados, prestativos e totalmente dispostos a ajudar. Dá pra ver que é um serviço sério, feito com foco no cliente. Continuarei comprando com eles sem dúvida.",
  },
  {
    left: 923,
    name: "ALICE3K",
    avatar: "/images/reviews/alice3k.png",
    body: "Serviço impecável! Precisei de moedas para Diablo e a LETS4TRADE entregou muito acima das minhas expectativas. A transação foi rápida, segura e sem nenhuma complicação. Gostei também da transparência: tudo é explicado de forma clara, desde o processo até o tempo de entrega. Experiência excelente do início ao fim. Loja totalmente confiável.",
  },
  {
    left: 1236,
    name: "MACHIDA",
    avatar: "/images/reviews/machida.png",
    body: "Eu gosto de testar várias lojas para ver qual é realmente boa, e posso dizer que a LETS4TRADE entrou no meu top 1. O atendimento foi rápido e educado, o processo de compra foi fácil e a entrega aconteceu em minutos. Fiquei impressionado com a eficiência e profissionalismo. As moedas chegaram certinho e sem qualquer risco. Muito satisfeito!",
  },
  {
    left: 1549,
    name: "ANINHA",
    avatar: "/images/reviews/aninha.png",
    body: "A LETS4TRADE definitivamente ganhou minha confiança. Fiz uma compra de moedas para Path of Exile e tudo aconteceu de maneira muito ágil. O suporte acompanhou a transação e deixou tudo bem seguro. Foi uma experiência tranquila, rápida e sem qualquer dor de cabeça. O tipo de loja que você compra uma vez e já vira cliente fiel.",
  },
  {
    left: 1862,
    name: "LIKEZY",
    avatar: "/images/reviews/likezy.png",
    body: "Experiência perfeita do começo ao fim. A LETS4TRADE tem um sistema extremamente simples e eficiente. Paguei e em menos de cinco minutos minhas moedas já estavam disponíveis. O atendimento é excelente e a equipe sempre responde com clareza e rapidez. Dá pra ver que é uma loja séria e comprometida com o cliente. Recomendo para qualquer jogador que precisa de moedas de forma segura.",
  },
];

/** Total de avaliações exibido à esquerda da pílula de estrelas (Figma 617:821). */
export const REVIEW_COUNT = 515;
