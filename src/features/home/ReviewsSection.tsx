import Image from "next/image";
import type { ComponentProps, CSSProperties } from "react";
import {
  REVIEWS,
  REVIEW_CARD_HEIGHT,
  REVIEW_CARD_WIDTH,
  REVIEW_COUNT,
  REVIEW_LOOP_WIDTH,
  type Review,
} from "./reviews";

/**
 * Seção "NOSSAS REVIEWS" (Figma: título 537:1080, subtítulo 537:1105,
 * pílula de estrelas 537:1081 e carrossel 547:1251).
 *
 * A seção é uma tela posicionada: cada filho fica em coordenada absoluta lida
 * do arquivo, com a origem no topo do título (y=1835 no frame de 1920) e o eixo
 * X deslocado dos 50px de margem da página. O design não forma grade regular
 * — os cards do carrossel começam em -329 e o contador fica colado na margem
 * esquerda —, então reproduzir em fluxo exigiria margens arbitrárias. É o mesmo
 * critério já usado em `TierCard` e `OrderCard`.
 *
 * Altura: do título (1835) ao fim do carrossel (2470) = 635.
 *
 * Tipografia lida no inspector do Figma: título Poppins SemiBold 65 / +0.5%,
 * subtítulo Helvetica Neue Bold 18 / +1%. `leading-[normal]` reproduz o "Auto"
 * do Figma, que é a métrica da própria fonte — fixar um valor em px erraria,
 * porque as caixas de texto do arquivo têm altura manual e não batem entre si.
 */
export function ReviewsSection() {
  return (
    <section aria-labelledby="reviews-title" className="relative h-[635px]">
      {/* Prisma decorativo (Figma 567:1446). Fica ACIMA da origem da seção, no
          vão entre o bloco do vídeo e o título — daí o topo negativo. */}
      <Image
        src="/images/home/deco-prisma.webp"
        alt=""
        width={186}
        height={186}
        aria-hidden
        className="pointer-events-none absolute -top-[223px] left-[444.95px] size-[186.12px] object-cover"
      />

      {/* Render decorativo à direita do título (Figma 848:104). */}
      <Image
        src="/images/home/deco-reviews.webp"
        alt=""
        width={128}
        height={141}
        aria-hidden
        className="pointer-events-none absolute top-[4.96px] left-[1692px] h-[140.97px] w-[128px] object-cover"
      />

      <h2
        id="reviews-title"
        className="absolute top-0 left-[542px] w-[736px] text-center font-poppins text-[65px] leading-[normal] font-semibold tracking-[0.325px] text-white"
      >
        NOSSAS REVIEWS
      </h2>

      <p className="absolute top-[104px] left-[687px] w-[446px] text-center font-helvetica text-[18px] leading-[normal] font-bold tracking-[0.18px] text-white">
        O que nossos clientes falam de nós?
      </p>

      <RatingPill />

      {/* Contador na margem esquerda (Figma 622:851): bolinha de 5px + texto com
          o número em negrito e a palavra em regular ("Mixed" no inspector). */}
      <span
        aria-hidden
        className="absolute top-[173px] -left-px size-[5px] rounded-full bg-brand-orange"
      />
      <p className="absolute top-[161px] left-[14px] font-poppins text-[20px] leading-[normal] text-white">
        <strong className="font-bold">{REVIEW_COUNT}</strong> Reviews
      </p>

      <ReviewCarousel />
    </section>
  );
}

/**
 * Pílula 288×45 com 5 estrelas (Figma 537:1081).
 *
 * A pílula NÃO tem preenchimento — só o contorno branco a 10% (1px, inside).
 * As estrelas aparecem duas vezes: a cópia borrada 2px abaixo é o brilho do
 * design (grupos "Brilho stars" e "Group 8355", em y=2005 e y=2003).
 */
function RatingPill() {
  return (
    <div className="absolute top-[153px] left-[766px] h-[45px] w-[288px] rounded-[30px] border border-white/10">
      <Stars className="absolute top-[17px] left-[84px] blur-[3px]" />
      <Stars className="absolute top-[15px] left-[84px]" />

      {/* Risco de brilho na borda de cima da pílula, derivado do "Linear Brilho"
          do arquivo (547:1318). Mesmo desenho da `GlowBar`: some nas duas
          pontas, com o verde das estrelas no meio.
          Os 249px são a largura do nó no arquivo — sobra ~19px de cada lado da
          pílula de 288, o que faz o risco morrer antes da curva da borda. */}
      <span
        aria-hidden
        className="absolute -top-[2px] left-1/2 h-[2px] w-[249px] -translate-x-1/2 bg-linear-to-r from-transparent via-[#00cb45] to-transparent"
      />
    </div>
  );
}

/** Cinco estrelas de 16px com 10px de vão, em #00CB45 (lido do arquivo). */
function Stars({ className }: { className?: string }) {
  return (
    <span aria-hidden className={`flex gap-[10px] ${className ?? ""}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon key={i} />
      ))}
    </span>
  );
}

/**
 * Estrela exportada do arquivo (nó 537:1085): pontas arredondadas, não a
 * estrela de cinco bicos afiados. O desenho ocupa 13,33px dentro de uma caixa
 * de 16 — daí o `viewBox` deslocado, que centraliza o glifo na caixa em vez de
 * esticá-lo até as bordas.
 *
 * Fica inline (e não como arquivo) porque a cor vem do design em #00CB45 e um
 * `<img>` não deixa recolorir; são cinco cópias na mesma pílula, mais duas do
 * brilho, então evitar sete requisições vale o path no código.
 */
const STAR_PATH =
  "M4.76878 2.27225C5.61321 0.757417 6.03543 0 6.66667 0C7.29791 0 7.72013 0.757416 8.56456 2.27225L8.78302 2.66416C9.02298 3.09462 9.14296 3.30986 9.33004 3.45187C9.51711 3.59389 9.7501 3.6466 10.2161 3.75203L10.6403 3.84802C12.2801 4.21904 13.1 4.40455 13.2951 5.03182C13.4901 5.6591 12.9312 6.31271 11.8133 7.61995L11.5241 7.95815C11.2064 8.32962 11.0475 8.51536 10.9761 8.74514C10.9046 8.97493 10.9286 9.22274 10.9767 9.71837L11.0204 10.1696C11.1894 11.9137 11.2739 12.7858 10.7632 13.1735C10.2525 13.5612 9.48488 13.2077 7.94955 12.5008L7.55234 12.3179C7.11605 12.117 6.8979 12.0166 6.66667 12.0166C6.43543 12.0166 6.21728 12.117 5.78099 12.3179L5.38378 12.5008C3.84845 13.2077 3.08078 13.5612 2.5701 13.1735C2.05941 12.7858 2.14392 11.9137 2.31293 10.1696L2.35666 9.71837C2.40468 9.22274 2.4287 8.97493 2.35724 8.74514C2.28579 8.51536 2.12695 8.32962 1.80928 7.95815L1.52007 7.61995C0.402166 6.31271 -0.156784 5.6591 0.0382807 5.03182C0.233345 4.40455 1.05324 4.21904 2.69302 3.84802L3.11726 3.75203C3.58323 3.6466 3.81622 3.59389 4.0033 3.45187C4.19037 3.30986 4.31035 3.09462 4.55031 2.66416L4.76878 2.27225Z";

function StarIcon() {
  return (
    <svg
      viewBox="-1.33335 -1.33335 16 16"
      className="size-[16px] shrink-0"
      fill="#00cb45"
    >
      <path d={STAR_PATH} />
    </svg>
  );
}

/**
 * Faixa de 1820×387 com os oito cards, correndo para a esquerda em laço.
 *
 * A fila é desenhada DUAS vezes: a segunda passada fica deslocada em
 * `REVIEW_LOOP_WIDTH`, exatamente o comprimento de um ciclo. Quando a animação
 * termina o percurso, a cópia está no pixel em que a original começou — o
 * quadro final é idêntico ao inicial e o laço reinicia sem emenda. É por isso
 * que existe a duplicata: com uma fila só, sobraria um vão vazio atravessando a
 * tela a cada volta.
 *
 * A cópia é `aria-hidden` — para quem usa leitor de tela são os mesmos oito
 * depoimentos, não dezesseis.
 *
 * O movimento e a pausa no cursor moram em `globals.css` (`.reviews-strip`),
 * junto do resto da linguagem de movimento da página.
 */
function ReviewCarousel() {
  return (
    <div className="reviews-viewport absolute top-[248px] left-0 h-[387px] w-[1820px] overflow-hidden">
      {/* A `<ul>` precisa gerar caixa (e não `display: contents`) porque é ela
          que a animação desloca. */}
      <ul
        className="reviews-strip absolute inset-0"
        style={{ "--reviews-loop": `${REVIEW_LOOP_WIDTH}px` } as CSSProperties}
      >
        {REVIEWS.map((review) => (
          <ReviewCard key={review.name} review={review} />
        ))}
        {REVIEWS.map((review) => (
          <ReviewCard
            key={`${review.name}-clone`}
            review={review}
            offset={REVIEW_LOOP_WIDTH}
            aria-hidden
          />
        ))}
      </ul>
    </div>
  );
}

/**
 * Card 288×387, raio 30, fundo preto a 10% e contorno branco a 10% — os mesmos
 * valores do "Rectangle 6449" lido no inspector.
 *
 * O corpo do depoimento ocupa todo o espaço até o ícone do YouTube (91 a 344) e
 * recorta o excesso. As caixas de texto do arquivo têm alturas manuais
 * inconsistentes (152 a 236px para textos de tamanho parecido), então elas não
 * servem de referência; sem o limite, um depoimento longo passaria por cima do
 * ícone.
 *
 * Com a Helvetica Neue real os dois depoimentos mais longos (VICC e MARSH)
 * passam 2px do recorte — invisível. Antes, no fallback para Arial, o mais
 * longo perdia a última linha inteira.
 */
function ReviewCard({
  review,
  offset = 0,
  ...props
}: {
  review: Review;
  /** Deslocamento da segunda passada da esteira. Zero na fila original. */
  offset?: number;
} & ComponentProps<"li">) {
  return (
    <li
      {...props}
      className="review-card absolute top-0 rounded-[30px] border border-white/10 bg-black/10"
      style={{
        left: review.left + offset,
        width: REVIEW_CARD_WIDTH,
        height: REVIEW_CARD_HEIGHT,
      }}
    >
      <Image
        src={review.avatar}
        alt=""
        width={42}
        height={42}
        aria-hidden
        className="review-avatar absolute top-[25px] left-[25px] size-[42px] rounded-full object-cover"
      />

      <p className="absolute top-[32px] left-[82px] font-poppins text-[18px] leading-[normal] font-bold tracking-[0.36px] text-white">
        {review.name}
      </p>

      <p className="review-body absolute top-[91px] left-[25px] h-[253px] w-[238px] overflow-hidden font-helvetica text-[16px] leading-[normal] tracking-[0.16px] text-brand-placeholder">
        {review.body}
      </p>

      <Image
        src="/icons/youtube-color.svg"
        alt="Avaliação publicada no YouTube"
        width={18}
        height={18}
        className="review-yt absolute top-[344px] left-[25px] size-[18px]"
      />
    </li>
  );
}
