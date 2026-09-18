import Image from "next/image";
import { editItem } from "@/features/site/editing/attrs";
import Link from "next/link";
import type { SectionItemView } from "@/features/site/content";
import { BLOG_CARD } from "./guides";

/** Card do arquivo: 417×438, com vão de 40px entre colunas (457 − 417). */
const GUIDE_CARD_WIDTH = 417;
const GUIDE_CARD_HEIGHT = 438;
/** Card BAIXO da quarta coluna (417×206), com 26px até o do blog (232 − 206). */
const COMPACT_HEIGHT = 206;
const COMPACT_GAP = 26;
/** Três colunas altas + a quarta, que empilha um guia baixo e o blog. */
const TALL_GUIDES = 3;

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
export function GuidesSection({
  title = "GUIAS POPULARES",
  items = [],
}: {
  title?: string;
  items?: SectionItemView[];
}) {
  const tall = items.slice(0, TALL_GUIDES);
  const compact = items[TALL_GUIDES];

  return (
    <section aria-labelledby="guides-title" className="relative">
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

        data-edit-field="home:guias:title"
        className="absolute top-0 left-0 w-[601px] font-helvetica text-[30px] leading-[normal] font-bold tracking-[0.3px] text-white"
      >
        {title}
      </h2>

      {/*
        ── Quatro colunas, como no arquivo (pedido em 2026-09-17) ─────────────
        Colunas 1–3: os três primeiros guias, altos (417×438). Coluna 4: o
        quarto guia BAIXO (417×206) com o card "VISITAR BLOG" embaixo — as duas
        linhas da última coluna. Guias além do quarto não aparecem: a faixa tem
        lugar para quatro.

        A fileira ainda FLUI (não voltou às coordenadas absolutas do arquivo):
        apagar o segundo guia puxa os seguintes para a esquerda em vez de abrir
        um buraco.
      */}
      {/* `pt` e NÃO `mt`: o título desta seção é ABSOLUTO (top 0), então o
          espaço abaixo dele tem que vir de dentro. Com margem, os 80px
          COLAPSAVAM para fora da `<section>` (ela não tem borda nem padding) e
          empurravam a seção inteira — os cards subiam para cima do título.
          Defeito real, visível na home publicada; achado em 2026-09-15. */}
      <div className="ml-[6px] w-[1808px] pt-[80px]">
        <ul className="flex gap-[40px]">
          {tall.map((guide) => (
            <GuideCard key={guide.id} guide={guide} />
          ))}

          <li
            className="flex shrink-0 flex-col"
            style={{ width: GUIDE_CARD_WIDTH, gap: COMPACT_GAP }}
          >
            {compact ? (
              <ul>
                <GuideCard guide={compact} compact />
              </ul>
            ) : null}
            <BlogCard />
          </li>
        </ul>
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
function GuideCard({
  guide,
  compact = false,
}: {
  guide: SectionItemView;
  /** O card BAIXO da quarta coluna (417×206), com as medidas do arquivo. */
  compact?: boolean;
}) {
  const height = compact ? COMPACT_HEIGHT : GUIDE_CARD_HEIGHT;
  // Card baixo: sem título no arquivo, resumo a 147px. Se o admin der um
  // título, ele entra acima do resumo e os dois sobem juntos.
  const titleTop = compact ? 105 : 308;
  const bodyTop = compact ? (guide.title ? 135 : 147) : guide.title ? 345 : 147;

  return (
    <li
      className="guide-card relative shrink-0 overflow-hidden rounded-[30px] border border-white/10"
      style={{ width: GUIDE_CARD_WIDTH, height }}
    >
      {/* Sem arte, o card fica no preto do tema em vez de transparente — os
          degradês por cima só fazem sentido sobre alguma coisa. */}
      {guide.image ? (
        <Image
          {...editItem("home:guias", guide.id, "image")}
          src={guide.image}
          alt=""
          width={GUIDE_CARD_WIDTH}
          height={height}
          aria-hidden
          className="guide-art absolute inset-0 size-full object-cover"
        />
      ) : (
        <span
          {...editItem("home:guias", guide.id, "image")}
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-brand-surface"
        />
      )}

      {/* Os dois degradês do arquivo, agora com medidas FIXAS: eram do dado
          (`guide.scrim`) porque o card curto do arquivo tinha valores próprios,
          e com a fileira uniforme todos os cards têm a mesma altura. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0"
        style={{
          height: compact ? 68 : 147,
          backgroundImage: "linear-gradient(180deg, #000 0%, rgba(0,0,0,0) 100%)",
        }}
      />

      {/* No card baixo o degradê do rodapé só fecha em preto no fim (arquivo). */}
      <span
        aria-hidden
        className="guide-scrim absolute inset-x-0"
        style={
          compact
            ? {
                top: 83,
                height: 123,
                backgroundImage: "linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 100%)",
              }
            : {
                top: 240,
                height: 198,
                backgroundImage: "linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 60%)",
              }
        }
      />

      {/* O logo tem tamanho próprio por jogo no arquivo (86×44, 66×50, 71×58...).
          Com a arte vindo do painel não dá para saber a proporção de antemão:
          a caixa é fixa e o `object-contain` encaixa qualquer uma dentro dela
          sem deformar. */}
      {guide.secondaryImage ? (
        <Image
          {...editItem("home:guias", guide.id, "secondaryImage")}
          src={guide.secondaryImage}
          alt=""
          width={90}
          height={58}
          aria-hidden
          className="guide-logo absolute top-[25px] left-[25px] h-[58px] w-[90px] object-contain object-left"
        />
      ) : (
        // Sem logo, um espaço marcado no mesmo lugar: na loja ele é invisível e
        // não recebe clique; no editor é onde se arrasta a arte do jogo.
        <span
          {...editItem("home:guias", guide.id, "secondaryImage")}
          aria-hidden
          className="pointer-events-none absolute top-[25px] left-[25px] h-[58px] w-[90px]"
        />
      )}

      {guide.title ? (
        <h3
          {...editItem("home:guias", guide.id, "title")}
          style={{ top: titleTop }}
          className="guide-text absolute left-[26px] font-poppins text-[18px] leading-[normal] font-semibold tracking-[0.09px] text-white"
        >
          {guide.title}
        </h3>
      ) : null}

      <p
        {...editItem("home:guias", guide.id, "body")}
        // No card baixo o resumo corta em duas linhas: não há altura para mais.
        className={`guide-text absolute left-[26px] w-[365px] font-helvetica text-[16px] leading-[normal] tracking-[0.16px] text-brand-placeholder ${compact ? "line-clamp-2" : ""}`}
        style={{ top: bodyTop }}
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
      // `block` e não `absolute`: o card agora é o último item da fileira que
      // flui, e não mais um elemento solto sob o quarto guia.
      className="blog-card relative block overflow-hidden rounded-[30px] border border-white/10 bg-black"
      style={{ width: BLOG_CARD.width, height: BLOG_CARD.height }}
    >
      {/* Elipse 791:1600 — centro (-6,81; 30,94), girada 77°. */}
      <span
        aria-hidden
        className="blog-glow blog-glow-a absolute top-[-52.41px] left-[-77.83px] h-[166.69px] w-[142.03px] rotate-[77deg] rounded-full blur-[54.14px]"
        style={{
          backgroundImage:
            "linear-gradient(262.85deg, var(--brand-orange), var(--brand-orange-shade))",
        }}
      />
      {/* Elipse 791:1602 — centro (128,38; 0,09), girada -110°. */}
      <span
        aria-hidden
        className="blog-glow blog-glow-b absolute top-[-93.63px] left-[48.52px] h-[187.45px] w-[159.71px] -rotate-[110deg] rounded-full bg-brand-orange-deep blur-[75px]"
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
