import Image from "next/image";
import { REVIEWS, REVIEW_CARD_HEIGHT, REVIEW_CARD_WIDTH, REVIEW_COUNT, type Review } from "./reviews";

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
        src="/images/home/deco-prisma.png"
        alt=""
        width={186}
        height={186}
        aria-hidden
        className="pointer-events-none absolute -top-[223px] left-[444.95px] size-[186.12px] object-contain"
      />

      {/* Render decorativo à direita do título (Figma 848:104). */}
      <Image
        src="/images/home/deco-reviews.png"
        alt=""
        width={128}
        height={141}
        aria-hidden
        className="pointer-events-none absolute top-[4.96px] left-[1692px] h-[140.97px] w-[128px] object-contain"
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

      {/* Risco de brilho que sai da borda direita da pílula (Figma 547:1318). */}
      <span
        aria-hidden
        className="absolute top-0 left-[275px] h-[2px] w-[249px]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(255,255,255,0.25), rgba(255,255,255,0))",
        }}
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
 * ⚠️ Estrela DESENHADA, não exportada do Figma — o export está bloqueado pelo
 * limite do plano. A cor (#00CB45) e a caixa (16×16) vieram do inspector; a
 * forma é uma estrela de 5 pontas genérica. Substituir pelo SVG do arquivo
 * quando houver export. Ver .claude/context/open-questions.md.
 */
function StarIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-[16px] shrink-0" fill="#00cb45">
      <path d="M8 .8l2.2 4.46 4.92.72-3.56 3.47.84 4.9L8 12.03l-4.4 2.32.84-4.9L.88 5.98l4.92-.72L8 .8z" />
    </svg>
  );
}

/**
 * Faixa de 1820×387 com os oito cards.
 *
 * `overflow-hidden` + posição absoluta reproduz o arquivo tal como está: os
 * cards das pontas (VICC e LIKEZY) ficam cortados pelas bordas. O design não
 * traz setas nem indicadores para esta faixa, então ela é estática — mesmo
 * critério do carrossel do hero. Ver .claude/context/open-questions.md.
 */
function ReviewCarousel() {
  return (
    <div className="absolute top-[248px] left-0 h-[387px] w-[1820px] overflow-hidden">
      {/* A `<ul>` precisa gerar caixa (e não `display: contents`) porque é ela
          que a rolagem desloca — ver `.reviews-strip` em `globals.css`. */}
      <ul className="reviews-strip absolute inset-0">
        {REVIEWS.map((review) => (
          <ReviewCard key={review.name} review={review} />
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
 * ⚠️ Em Windows/Linux, onde a Helvetica Neue cai em Arial (~10% mais larga), o
 * depoimento mais longo perde a última linha. Com a fonte real ele cabe. É o
 * mesmo efeito colateral já registrado para as outras telas.
 */
function ReviewCard({ review }: { review: Review }) {
  return (
    <li
      className="review-card absolute top-0 rounded-[30px] border border-white/10 bg-black/10"
      style={{ left: review.left, width: REVIEW_CARD_WIDTH, height: REVIEW_CARD_HEIGHT }}
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
