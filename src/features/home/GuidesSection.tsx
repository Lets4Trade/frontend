import Image from "next/image";
import { RichText } from "@/features/site/richText";
import Link from "next/link";
import type { ReactNode } from "react";
import { safeLinkHref } from "@/features/game/storefrontTabs";
import type { SectionItemView } from "@/features/site/content";
import { reveal, revealDelay } from "./reveal";
import { blogCardTexts, type BlogCardTexts } from "./blogCard";
import { VisitBlogCard } from "./VisitBlogCard";
import { sectionItemToNews } from "./homeNews";
import { CompactNewsCard, NewsCard } from "@/features/game/GameSections";

/** Card do arquivo: 417×438, com vão de 40px entre colunas (457 − 417). */
const GUIDE_CARD_WIDTH = 417;
const GUIDE_CARD_HEIGHT = 438;
/** Card BAIXO da quarta coluna (417×206), com 26px até o do blog (232 − 206). */
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
  blogCard = blogCardTexts((_name, fallback) => fallback),
}: {
  title?: string;
  items?: SectionItemView[];
  /** Textos e link do card "VISITAR BLOG" (extras da sessão, ver `blogCard.ts`). */
  blogCard?: BlogCardTexts;
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
        className="deco-float pointer-events-none absolute -top-[148px] left-[1664px] h-[171.16px] w-[156.75px] object-cover"
        style={{ ["--float-dur" as string]: "8s", ["--float-delay" as string]: "-3s", ["--float-rot" as string]: "-3deg" }}
      />

      <h2
        id="guides-title"

        data-edit-field="home:guias:title"
        data-edit-rich=""
        {...reveal("mask")}
        className="absolute top-0 left-0 w-[601px] font-helvetica text-[30px] leading-[normal] font-bold tracking-[0.3px] text-white"
      >
        <RichText value={title} />
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
          {/* Mesmo card da página de jogo (2026-11-22, pedido do usuário):
              capa 16:9 inteira em cima, texto embaixo. */}
          {tall.map((guide, index) => (
            <li
              key={guide.id}
              {...reveal("rise")}
              className="shrink-0"
              style={{ width: GUIDE_CARD_WIDTH, height: GUIDE_CARD_HEIGHT, ...revealDelay(index + 1) }}
            >
              <NewsCard item={sectionItemToNews(guide)} fluid />
            </li>
          ))}

          {/* `justify-end`: sem o guia baixo, o card do blog fica na BASE da
              coluna, alinhado ao rodapé dos altos (2026-10-09). */}
          <li
            className="flex shrink-0 flex-col justify-end"
            style={{ width: GUIDE_CARD_WIDTH, height: GUIDE_CARD_HEIGHT, gap: COMPACT_GAP }}
          >
            {compact ? (
              <div {...reveal("rise")} style={revealDelay(tall.length + 1)}>
                <CompactNewsCard item={sectionItemToNews(compact)} fluid />
              </div>
            ) : null}
            <VisitBlogCard
              texts={blogCard}
              width={GUIDE_CARD_WIDTH}
              editKey="home:guias"
              revealAttrs={reveal("rise")}
              style={revealDelay(tall.length + 2)}
            />
          </li>
        </ul>
      </div>
    </section>
  );
}

/**
 * O card INTEIRO vira link quando o guia tem "Link do guia" (2026-10-06: o
 * campo existia no painel e o card o ignorava). Envolve o conteúdo em vez de
 * cobrir com uma camada por cima: no editor da home cada pedaço continua sendo
 * o alvo do clique (o editor cancela a navegação de links). Link fora da
 * allowlist (interno ou https) é ignorado.
 */
export function GuideLink({ href, children }: { href?: string; children: ReactNode }) {
  const safe = safeLinkHref(href);
  if (!safe) return <>{children}</>;
  return (
    <Link href={safe} className="absolute inset-0 block">
      {children}
    </Link>
  );
}
