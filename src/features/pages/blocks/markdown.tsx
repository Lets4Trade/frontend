import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Markdown RESTRITO do bloco "Texto formatado" (2026-09-25).
 *
 * ── Por que um parser próprio, e pequeno ──────────────────────────────────
 * O texto é escrito pelo cliente e desenhado para TODO visitante. Uma
 * biblioteca de Markdown completa aceita HTML cru, imagens remotas e links
 * `javascript:` — cada um exigiria configuração para desligar, e um esquecimento
 * vira XSS. Aqui o texto vira ELEMENTOS React (nunca `dangerouslySetInnerHTML`),
 * e só existe o que está listado:
 *
 *   ## título · ### subtítulo · **negrito** · *itálico*
 *   - lista · 1. lista numerada · [texto](https://… ou /caminho)
 *
 * Qualquer outra coisa sai como texto literal. Link com outro esquema vira
 * texto simples (o rótulo), sem `href`.
 */
export function Markdown({ source }: { source: string }) {
  return <>{parseBlocks(source).map((block, index) => renderBlock(block, index))}</>;
}

type MdBlock =
  | { kind: "h2" | "h3" | "p"; text: string }
  | { kind: "ul" | "ol"; items: string[] };

export function parseBlocks(source: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  let paragraph: string[] = [];
  let list: { kind: "ul" | "ol"; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ kind: "p", text: paragraph.join(" ") });
    paragraph = [];
  };
  const flushList = () => {
    if (list) blocks.push(list);
    list = null;
  };

  for (const raw of source.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (line === "") {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ kind: heading[1].length === 2 ? "h2" : "h3", text: heading[2] });
      continue;
    }

    const bullet = /^[-*]\s+(.+)$/.exec(line);
    const numbered = /^\d{1,3}[.)]\s+(.+)$/.exec(line);
    const item = bullet ?? numbered;
    if (item) {
      flushParagraph();
      const kind = bullet ? "ul" : "ol";
      if (!list || list.kind !== kind) {
        flushList();
        list = { kind, items: [] };
      }
      list.items.push(item[1]);
      continue;
    }

    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return blocks;
}

/** Destino permitido: https:// ou caminho interno (sem `//`, que seria outro host). */
export function safeHref(href: string): string | null {
  if (/^https:\/\/[^\s]+$/.test(href)) return href;
  if (/^\/(?!\/)[A-Za-z0-9\-_/?=&#.%]*$/.test(href)) return href;
  return null;
}

const INLINE = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\([^)\s]+\))/g;

export function renderInline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, index) => {
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={index} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const href = safeHref(link[2]);
      if (!href) return <span key={index}>{link[1]}</span>;
      const className = "text-brand-orange underline-offset-2 hover:underline";
      return href.startsWith("https://") ? (
        <a key={index} href={href} target="_blank" rel="noopener noreferrer" className={className}>
          {link[1]}
        </a>
      ) : (
        <Link key={index} href={href} className={className}>
          {link[1]}
        </Link>
      );
    }
    return part;
  });
}

function renderBlock(block: MdBlock, index: number) {
  switch (block.kind) {
    case "h2":
      return (
        <h3 key={index} className="font-helvetica text-[22px] leading-[28px] font-bold text-white">
          {renderInline(block.text)}
        </h3>
      );
    case "h3":
      return (
        <h4 key={index} className="font-helvetica text-[18px] leading-[24px] font-bold text-white">
          {renderInline(block.text)}
        </h4>
      );
    case "p":
      return (
        <p key={index} className="font-poppins text-[16px] leading-[27px] text-brand-fg-muted">
          {renderInline(block.text)}
        </p>
      );
    case "ul":
    case "ol": {
      const Tag = block.kind;
      return (
        <Tag
          key={index}
          className={`flex flex-col gap-[6px] pl-[22px] font-poppins text-[16px] leading-[26px] text-brand-fg-muted ${
            block.kind === "ul" ? "list-disc" : "list-decimal"
          } marker:text-brand-orange`}
        >
          {block.items.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </Tag>
      );
    }
  }
}
