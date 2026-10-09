import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { BLOG_CARD_EXTRA, type BlogCardTexts } from "./blogCard";
import { BLOG_CARD } from "./guides";

/**
 * Card "VISITAR BLOG" (Figma 791:1595) — fecha a quarta coluna de GUIAS
 * POPULARES e, desde 2026-10-09, a de NOTÍCIAS na página de jogo.
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
 *
 * A LARGURA varia (417 nos guias, 391 nas notícias); a seta acompanha a borda
 * direita (49px dela, como no arquivo) e o texto corta antes de chegar nela.
 */
export function VisitBlogCard({
  texts,
  width = BLOG_CARD.width,
  height = BLOG_CARD.height,
  editKey,
  className = "",
  style,
  revealAttrs,
}: {
  texts: BlogCardTexts;
  width?: number;
  height?: number;
  /**
   * Chave da sessão (`home:guias`) quando o card é editável no desenho: título
   * e texto ganham `data-edit-field` dos textos extras.
   */
  editKey?: string;
  className?: string;
  style?: CSSProperties;
  /** Marcação de entrada da home (`reveal`); fora dela, nada. */
  revealAttrs?: Record<string, string>;
}) {
  const textWidth = width - 25 - 60;

  return (
    <Link
      href={texts.href}
      {...revealAttrs}
      className={`blog-card relative block shrink-0 overflow-hidden rounded-[30px] border border-white/10 bg-black ${className}`}
      style={{ width, height, ...style }}
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

      <span
        data-edit-field={editKey ? `${editKey}:extra.${BLOG_CARD_EXTRA.title}` : undefined}
        className="absolute top-[129px] left-[26px] block truncate font-poppins text-[18px] leading-[normal] font-semibold tracking-[0.09px] text-white"
        style={{ maxWidth: textWidth }}
      >
        {texts.title}
      </span>

      <span
        data-edit-field={editKey ? `${editKey}:extra.${BLOG_CARD_EXTRA.subtitle}` : undefined}
        className="absolute top-[166px] left-[25px] block truncate font-helvetica text-[16px] leading-[normal] tracking-[0.16px] text-brand-placeholder"
        style={{ maxWidth: textWidth }}
      >
        {texts.subtitle}
      </span>

      <Image
        src="/icons/home/arrow-double-right.svg"
        alt=""
        width={24}
        height={24}
        aria-hidden
        className="blog-arrow absolute top-[157px] size-[24px]"
        style={{ left: width - 49 }}
      />
    </Link>
  );
}
