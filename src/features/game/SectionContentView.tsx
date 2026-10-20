import type { ReactNode } from "react";
import { BodyImage, parseBlocks, renderInline } from "@/features/pages/blocks/markdown";
import { backendAsset } from "@/lib/publicApi";
import {
  MARKER_COLOR_CLASS,
  MARKER_GLYPH,
  type ServiceSection,
} from "./sectionContent";

/**
 * Uma seção de texto da coluna esquerda (formato v2, `sectionContent.ts`):
 * título, texto formatado com imagem, e o marcador escolhido na frente de cada
 * item de lista.
 *
 * Desenhada em DOIS lugares, com a tipografia de cada um: a página do pacote /
 * aba (`page`) e o painel que segue o mouse no card de pacote (`popover`).
 *
 * Nada aqui passa por `dangerouslySetInnerHTML`: o Markdown restrito vira
 * elementos React, e só a arte enviada pelo painel vira `<img>`.
 */

type Variant = "page" | "popover";

const STYLE: Record<
  Variant,
  {
    title: string;
    text: string;
    heading: string;
    subheading: string;
    gap: string;
    listGap: string;
    /** Cor do marcador sem escolha — a que cada tela já usava antes do editor. */
    markerColor: string;
    icon: string;
  }
> = {
  page: {
    title: "font-helvetica text-[18px] leading-none font-bold tracking-[0.18px] text-white",
    text: "font-helvetica text-[16px] leading-[27px] tracking-[0.16px] text-brand-placeholder",
    heading: "font-helvetica text-[18px] leading-[26px] font-bold text-white",
    subheading: "font-helvetica text-[16px] leading-[24px] font-bold text-white",
    gap: "mt-[15px] flex flex-col gap-[12px]",
    listGap: "",
    markerColor: "",
    // Linha de 27px: ícone de 18px, centrado na primeira linha.
    icon: "mt-[4.5px] size-[18px]",
  },
  popover: {
    title: "font-poppins text-[15px] leading-[22px] font-bold tracking-[0.15px] text-white",
    text: "font-helvetica text-[14px] leading-[22px] tracking-[0.14px] text-brand-placeholder",
    heading: "font-poppins text-[15px] leading-[22px] font-bold text-white",
    subheading: "font-poppins text-[14px] leading-[22px] font-bold text-white",
    gap: "mt-[6px] flex flex-col gap-[8px]",
    listGap: "flex flex-col gap-[4px]",
    markerColor: "text-brand-orange",
    icon: "mt-[3px] size-[16px]",
  },
};

export function SectionContentView({
  section,
  variant = "page",
}: {
  section: ServiceSection;
  variant?: Variant;
}) {
  const style = STYLE[variant];
  const markerColor = section.markerColor ? MARKER_COLOR_CLASS[section.markerColor] : style.markerColor;

  function marker(index: number, ordered: boolean): ReactNode {
    if (ordered) {
      return (
        <span aria-hidden className={`shrink-0 tabular-nums ${markerColor}`}>
          {index + 1}.
        </span>
      );
    }
    const kind = section.marker ?? "dot";
    if (kind === "none") return null;
    if (kind === "icon") {
      const src = backendAsset(section.markerIcon);
      return src ? (
        // Arte do painel, já em WebP ≤ 1600px e quadrada o bastante: `<img>`
        // simples, sem o otimizador — ele exigiria a dimensão de antemão.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" aria-hidden className={`shrink-0 object-contain ${style.icon}`} />
      ) : (
        <span aria-hidden className={`shrink-0 ${markerColor}`}>
          {MARKER_GLYPH.dot}
        </span>
      );
    }
    return (
      <span aria-hidden className={`shrink-0 ${markerColor}`}>
        {MARKER_GLYPH[kind]}
      </span>
    );
  }

  function list(items: readonly ReactNode[], ordered: boolean, key?: number) {
    const Tag = ordered ? "ol" : "ul";
    return (
      <Tag key={key} className={style.listGap || undefined}>
        {items.map((item, index) => (
          <li key={index} className={`flex gap-[8px] ${style.text}`}>
            {marker(index, ordered)}
            <span className="min-w-0 break-words">{item}</span>
          </li>
        ))}
      </Tag>
    );
  }

  const body = section.body
    ? parseBlocks(section.body, { keepLineBreaks: true, images: true }).map((block, index) => {
        switch (block.kind) {
          case "h2":
            return (
              <p key={index} className={style.heading}>
                {renderInline(block.text)}
              </p>
            );
          case "h3":
            return (
              <p key={index} className={style.subheading}>
                {renderInline(block.text)}
              </p>
            );
          case "p":
            return (
              <p key={index} className={`whitespace-pre-line break-words ${style.text}`}>
                {renderInline(block.text)}
              </p>
            );
          case "ul":
          case "ol":
            return list(
              block.items.map((item) => renderInline(item)),
              block.kind === "ol",
              index,
            );
          case "img":
            return <BodyImage key={index} src={block.src} alt={block.alt} eager={variant === "popover"} />;
        }
      })
    : null;

  const hasItems = section.items.length > 0;

  return (
    <>
      {section.title ? (
        variant === "page" ? (
          <h2 className={style.title}>{section.title}</h2>
        ) : (
          <p className={style.title}>{section.title}</p>
        )
      ) : null}
      {hasItems || body ? (
        <div className={section.title ? style.gap : style.gap.replace(/^mt-\[[^\]]+\]\s*/, "")}>
          {hasItems ? list(section.items, false) : null}
          {body}
        </div>
      ) : null}
    </>
  );
}
