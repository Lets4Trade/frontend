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
        src="/images/home/deco-guias.webp"
        alt=""
        width={157}
        height={171}
        aria-hidden
        className="pointer-events-none absolute -top-[148px] left-[1664px] h-[171.16px] w-[156.75px] object-cover"
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
 * São DOIS degradês: um do topo para baixo (preto → transparente) que dá
 * contraste ao logo, e outro do rodapé para cima, que trava em preto opaco a
 * 55,769% da sua altura e é o que sustenta título e resumo.
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
        className="absolute inset-x-0 top-0"
        style={{
          height: guide.scrim.topHeight,
          backgroundImage: "linear-gradient(180deg, #000 0%, rgba(0,0,0,0) 100%)",
        }}
      />

      <span
        aria-hidden
        className="guide-scrim absolute inset-x-0"
        style={{
          top: guide.scrim.bottomTop,
          height: guide.scrim.bottomHeight,
          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 ${guide.scrim.bottomStop})`,
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
 * O fundo é PRETO, não laranja: o laranja vem de duas elipses desfocadas que
 * entram pela borda superior e são cortadas pelo card. Elas estão no arquivo
 * como SVG com o blur já rasterizado; aqui são dois elementos com `filter:
 * blur()`, o que reproduz o mesmo desenho sem carregar dois arquivos.
 *
 * A geometria sai da caixa NÃO rotacionada de cada elipse (raios 71,01×83,35 e
 * 79,86×93,72), centrada no ponto do arquivo e depois girada — os retângulos
 * que o inspector mostra são a caixa envolvente já rotacionada e não servem
 * para posicionar direto.
 */
function BlogCard() {
  return (
    <Link
      href={BLOG_CARD.href}
      className="blog-card absolute overflow-hidden rounded-[30px] border border-white/10 bg-black"
      style={{
        left: BLOG_CARD.left,
        top: BLOG_CARD.top,
        width: BLOG_CARD.width,
        height: BLOG_CARD.height,
      }}
    >
      {/* Elipse 791:1600 — centro (-6,81; 30,94), girada 77°. */}
      <span
        aria-hidden
        className="blog-glow blog-glow-a absolute top-[-52.41px] left-[-77.83px] h-[166.69px] w-[142.03px] rotate-[77deg] rounded-full blur-[54.14px]"
        style={{ backgroundImage: "linear-gradient(262.85deg, #ff7300, #b24400)" }}
      />
      {/* Elipse 791:1602 — centro (128,38; 0,09), girada -110°. */}
      <span
        aria-hidden
        className="blog-glow blog-glow-b absolute top-[-93.63px] left-[48.52px] h-[187.45px] w-[159.71px] -rotate-[110deg] rounded-full bg-[#ff4d00] blur-[75px]"
      />

      <span className="absolute top-[129px] left-[26px] block font-poppins text-[18px] leading-[normal] font-semibold tracking-[0.09px] text-white">
        {BLOG_CARD.title}
      </span>

      <span className="absolute top-[166px] left-[25px] block font-helvetica text-[16px] leading-[normal] tracking-[0.16px] text-brand-placeholder">
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
