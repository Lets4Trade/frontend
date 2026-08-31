import Image from "next/image";
import Link from "next/link";
import { BLOG_CARD, GUIDES, type Guide } from "./guides";

/**
 * Seção "GUIAS POPULARES" (Figma: título 791:1611, faixa 791:1610).
 *
 * Origem no topo do título (y=3696 no frame de 1920); altura até o fim da faixa
 * (y=4216) = 520.
 *
 * Título em Helvetica Neue Bold 30 / +1% — é o único título de seção da home
 * que NÃO usa Poppins 65: no arquivo ele fica alinhado à margem esquerda, e não
 * centralizado como "NOSSAS REVIEWS" e "EQUIPE LETS 4 TRADE".
 */
export function GuidesSection() {
  return (
    <section aria-labelledby="guides-title" className="relative h-[520px]">
      {/* Render decorativo acima da faixa, à direita (Figma 860:103). */}
      <Image
        src="/images/home/deco-guias.png"
        alt=""
        width={157}
        height={171}
        aria-hidden
        className="pointer-events-none absolute -top-[148px] left-[1664px] h-[171.16px] w-[156.75px] object-contain"
      />

      <h2
        id="guides-title"
        className="absolute top-0 left-0 w-[601px] font-helvetica text-[30px] leading-[normal] font-bold tracking-[0.3px] text-white"
      >
        GUIAS POPULARES
      </h2>

      <div className="absolute top-[80px] left-[6px] h-[440px] w-[1808px]">
        <ul className="contents">
          {GUIDES.map((guide) => (
            <GuideCard key={guide.key} guide={guide} />
          ))}
        </ul>

        <BlogCard />
      </div>
    </section>
  );
}

/**
 * Card de guia: a arte do jogo é o PREENCHIMENTO do card (fill "Image" no
 * inspector), não uma imagem solta dentro dele. Por cima vem o degradê que
 * escurece o rodapé para o texto ficar legível, e só então logo, título e
 * resumo.
 *
 * ⚠️ O degradê do arquivo (Rectangle 6456, 415×300) é um "Linear" cujos stops o
 * inspector não expõe; usamos preto de baixo para cima, que é o efeito visível
 * no design. Há ainda um "Rectangle 6457" posicionado inteiramente FORA do card
 * (começa exatamente na borda direita) que não foi reproduzido — não dá para
 * dizer o que ele desenha sem o export. Ver .claude/context/open-questions.md.
 */
function GuideCard({ guide }: { guide: Guide }) {
  return (
    <li
      className="guide-card absolute overflow-hidden rounded-[30px] border border-white/10"
      style={{ left: guide.left, top: guide.top, width: guide.width, height: guide.height }}
    >
      <Image
        src={guide.art}
        alt=""
        width={guide.width}
        height={guide.height}
        aria-hidden
        className="guide-art absolute inset-0 size-full object-cover"
      />

      <span
        aria-hidden
        className="guide-scrim absolute inset-x-0 bottom-0 h-[300px]"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 55%, #000 100%)",
        }}
      />

      <Image
        src={guide.logo}
        alt=""
        width={Math.round(guide.logoBox.width)}
        height={Math.round(guide.logoBox.height)}
        aria-hidden
        className="guide-logo absolute object-contain"
        style={{
          left: guide.logoBox.left,
          top: guide.logoBox.top,
          width: guide.logoBox.width,
          height: guide.logoBox.height,
        }}
      />

      {guide.title ? (
        <h3 className="guide-text absolute top-[308px] left-[26px] font-poppins text-[18px] leading-[normal] font-semibold tracking-[0.09px] text-white">
          {guide.title}
        </h3>
      ) : null}

      <p
        className="guide-text absolute left-[26px] w-[365px] font-helvetica text-[16px] leading-[normal] tracking-[0.16px] text-brand-placeholder"
        style={{ top: guide.title ? 345 : 147 }}
      >
        {guide.body}
      </p>
    </li>
  );
}

/**
 * Card "VISITAR BLOG" (Figma 791:1595) — o único da faixa que é um link.
 *
 * ⚠️ APROXIMAÇÃO: o fundo é o degradê laranja da marca com dois halos claros,
 * reproduzindo o que se vê no design. Os stops exatos do "Rectangle 6449" desta
 * variante e a cor das duas elipses (791:1600 e 791:1602) não são expostos pelo
 * inspector e o export está bloqueado.
 */
function BlogCard() {
  return (
    <Link
      href={BLOG_CARD.href}
      className="blog-card absolute overflow-hidden rounded-[30px] border border-white/10"
      style={{
        left: BLOG_CARD.left,
        top: BLOG_CARD.top,
        width: BLOG_CARD.width,
        height: BLOG_CARD.height,
        backgroundImage: "linear-gradient(160deg, #ff7300, #ff4d00)",
      }}
    >
      <span
        aria-hidden
        className="blog-glow blog-glow-a absolute top-[-57px] left-[58.42px] h-[175.89px] w-[194.37px] rounded-full bg-white/15 blur-[40px]"
      />
      <span
        aria-hidden
        className="blog-glow blog-glow-b absolute top-[107.19px] left-[67.62px] h-[214.19px] w-[230.77px] rounded-full bg-white/10 blur-[40px]"
      />

      <span className="absolute top-[129px] left-[26px] block font-poppins text-[18px] leading-[normal] font-semibold tracking-[0.09px] text-white">
        {BLOG_CARD.title}
      </span>

      <span className="absolute top-[166px] left-[25px] block font-helvetica text-[15px] leading-[normal] tracking-[0.15px] text-white">
        {BLOG_CARD.subtitle}
      </span>

      <Image
        src="/icons/home/arrow-double-right.svg"
        alt=""
        width={24}
        height={24}
        aria-hidden
        className="blog-arrow absolute top-[157px] left-[368px] size-[24px]"
      />
    </Link>
  );
}
