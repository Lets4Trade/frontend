import Link from "next/link";
import type { ReactNode } from "react";
import { CONTENT_IMAGE, IMGUR_IMAGE, isBodyImage } from "@/features/game/sectionContent";
import { backendAsset } from "@/lib/publicApi";

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
 *   ![legenda](link) numa linha só (com `images`; ver `parseBlocks`)
 *
 * Qualquer outra coisa sai como texto literal. Link com outro esquema vira
 * texto simples (o rótulo), sem `href`.
 *
 * `images` liga a linha de imagem (ver `parseBlocks`) — blog e "Texto
 * formatado" do construtor desde 2026-10-16.
 */
export function Markdown({ source, images = false }: { source: string; images?: boolean }) {
  return <>{parseBlocks(source, { images }).map((block, index) => renderBlock(block, index))}</>;
}

/**
 * Imagem do texto: arte do painel (`/uploads/pages/`, servida pela API) ou link
 * direto do Imgur. `<img>` e não `next/image`: a proporção é qualquer uma (a
 * largura é a da coluna, a altura vem da arte) e GIF do Imgur continua animado.
 * `no-referrer`: o Imgur não fica sabendo qual página da loja o cliente abriu.
 */
export function BodyImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const url = IMGUR_IMAGE.test(src) ? src : CONTENT_IMAGE.test(src) ? backendAsset(src) : null;
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      // `self-start`: dentro de coluna flex a `<img>` esticaria até a largura
      // toda — imagem pequena ficaria ampliada e borrada.
      className={className ?? "h-auto max-w-full self-start rounded-[14px]"}
    />
  );
}

export type MdBlock =
  | { kind: "h2" | "h3" | "p"; text: string }
  | { kind: "ul" | "ol"; items: string[] }
  | { kind: "img"; src: string; alt: string };

/**
 * `keepLineBreaks`: linhas seguidas do mesmo parágrafo ficam separadas por
 * `\n` (quem desenha usa `whitespace-pre-line`) em vez de juntadas com espaço.
 * É o que a descrição do jogo promete a quem edita (2026-10-08).
 *
 * `images` (2026-10-16, textos da página do pacote): `![alt](/uploads/pages/<id>.webp)`
 * vira bloco de imagem (no meio de uma linha, quebra o parágrafo em volta). Só arte enviada pelo
 * painel (`CONTENT_IMAGE`) ou link direto do Imgur (`IMGUR_IMAGE`, pedido do
 * usuário no mesmo dia); outro endereço some — imagem de host livre seria
 * pixel de rastreamento de terceiro em cada visita. Desligado, a linha segue
 * como texto.
 */
export function parseBlocks(
  source: string,
  { keepLineBreaks = false, images = false }: { keepLineBreaks?: boolean; images?: boolean } = {},
): MdBlock[] {
  const blocks: MdBlock[] = [];
  let paragraph: string[] = [];
  let list: { kind: "ul" | "ol"; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ kind: "p", text: paragraph.join(keepLineBreaks ? "\n" : " ") });
    paragraph = [];
  };
  const flushList = () => {
    if (list) blocks.push(list);
    list = null;
  };

  let text = source.replace(/\r\n?/g, "\n");
  // Imagem no MEIO de uma linha também vale: ela ganha linha própria (o texto
  // antes e depois vira parágrafo). Sem isto, `![a](…)` colado num parágrafo
  // apareceria como link "!a" — e quem edita moveu a imagem "como quis".
  if (images) text = text.replace(/[ \t]*(!\[[^\]\n]*\]\([^)\s]+\))[ \t]*/g, "\n$1\n");

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line === "") {
      flushParagraph();
      flushList();
      continue;
    }

    const image = images ? /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(line) : null;
    if (image) {
      flushParagraph();
      flushList();
      if (isBodyImage(image[2])) blocks.push({ kind: "img", src: image[2], alt: image[1].trim() });
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
    case "img":
      return <BodyImage key={index} src={block.src} alt={block.alt} />;
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
