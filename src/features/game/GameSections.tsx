import Image from "next/image";
import Link from "next/link";
import { parseBlocks, renderInline } from "@/features/pages/blocks/markdown";
import { GameBannerSlider } from "./GameBannerSlider";
import type { GameDescriptionGroup } from "./description";
import { FAQ_DESCRIPTION_GROUP } from "./types";
import type { GameBanner, GameNewsItem, GamePage, GameReference } from "./types";

/**
 * As seções editáveis da página de jogo: banner, referências, notícias e FAQ.
 *
 * Todas SOMEM quando o admin não tem conteúdo para elas, em vez de mostrarem o
 * retângulo cinza que o arquivo usa como espaço reservado. Um bloco vazio no ar
 * é pior do que a seção não existir, e a ordem delas vem de `page.sections`.
 */

/**
 * Banner do topo (1146:386): 1714×490. Desde 2026-10-08 é um SLIDER com todas
 * as artes cadastradas no builder (ver `GameBannerSlider`).
 */
export function BannerSection({ banners }: { banners: GameBanner[] }) {
  return <GameBannerSlider banners={banners} />;
}

/** "REFERÊNCIAS" (1524:515): título, botão à direita e quatro cards de 391×299. */
export function ReferencesSection({
  references,
}: {
  references: GamePage["references"];
}) {
  if (references.items.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between gap-[25px]">
        <h2 className="font-helvetica text-[22px] leading-none font-bold tracking-[0.22px] text-white">
          {references.title}
        </h2>

        <Link
          href={references.ctaHref}
          className="inline-flex h-[50px] min-w-[276px] items-center justify-center rounded-full border border-[var(--brand-stroke-soft)] bg-[image:var(--brand-orange-gradient)] px-6 font-poppins text-[16px] font-bold tracking-[0.16px] text-black transition-opacity hover:opacity-90"
        >
          {references.ctaLabel}
        </Link>
      </div>

      <div className="mt-[50px] grid grid-cols-[repeat(auto-fill,391px)] justify-between gap-[50px]">
        {references.items.map((item) => (
          <ReferenceCard key={item.id} reference={item} />
        ))}
      </div>
    </section>
  );
}

function ReferenceCard({ reference }: { reference: GameReference }) {
  return (
    <article className="h-[299px] w-[391px] overflow-hidden rounded-[30px] border border-white/10 bg-black/10 px-[25px] pt-[27px]">
      <div className="flex items-center gap-[15px]">
        {reference.avatar ? (
          <Image
            src={reference.avatar.src}
            alt=""
            width={42}
            height={42}
            aria-hidden
            className="size-[42px] rounded-full object-cover"
          />
        ) : null}
        <p className="font-poppins text-[18px] leading-[27px] font-bold tracking-[0.36px] text-white">
          {reference.author}
        </p>
      </div>

      <Stars rating={reference.rating} />

      {/* `line-clamp` porque o depoimento é escrito pelo admin e o card tem
          altura fixa no arquivo — sem o corte, um texto longo vazaria por cima
          do card de baixo. */}
      <p className="mt-[15px] line-clamp-[8] font-helvetica text-[16px] leading-[normal] tracking-[0.16px] text-brand-placeholder">
        {reference.body}
      </p>
    </article>
  );
}

/** Cinco caixinhas de 28px a cada 33; as apagadas ficam sem a estrela. */
function Stars({ rating }: { rating: number }) {
  const filled = Math.round(Math.min(Math.max(rating, 0), 5));
  return (
    <p className="mt-[15px] flex gap-[5px]" aria-label={`${filled} de 5 estrelas`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          aria-hidden
          className="flex size-[28px] items-center justify-center rounded-[4px] border border-white/10 bg-black"
        >
          {index < filled ? (
            <Image
              src="/icons/game/star.svg"
              alt=""
              width={16}
              height={16}
              className="size-[16px]"
            />
          ) : null}
        </span>
      ))}
    </p>
  );
}

/** "NOTÍCIAS" (1524:516): quatro cards de 391×438. */
export function NewsSection({ news }: { news: GamePage["news"] }) {
  if (news.items.length === 0) return null;

  return (
    <section>
      <h2 className="font-helvetica text-[22px] leading-none font-bold tracking-[0.22px] text-white">
        {news.title}
      </h2>

      <div className="mt-[50px] grid grid-cols-[repeat(auto-fill,391px)] justify-between gap-[50px]">
        {news.items.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function NewsCard({ item }: { item: GameNewsItem }) {
  const card = (
    <article className="relative h-[438px] w-[391px] overflow-hidden rounded-[30px] border border-white/10 bg-[#2f2f2f]">
      <div className="absolute top-px left-px h-[276px] w-[389px] overflow-hidden rounded-t-[30px] bg-[#2f2f2f]">
        {item.image ? (
          <Image
            src={item.image.src}
            alt={item.image.alt ?? ""}
            width={item.image.width}
            height={item.image.height}
            className="size-full object-cover"
          />
        ) : null}
      </div>

      {/* A metade de baixo do card é preta com degradê por cima da arte — é o
          que deixa título e resumo legíveis sobre qualquer imagem. */}
      <div
        aria-hidden
        className="absolute top-[225px] left-px h-[212px] w-[389px] bg-gradient-to-b from-transparent via-black/85 to-black"
      />

      <h3 className="absolute top-[265px] left-[26px] w-[339px] truncate font-poppins text-[18px] leading-[27px] font-semibold tracking-[0.09px] text-white">
        {item.title}
      </h3>

      <p className="absolute top-[302px] left-[26px] line-clamp-2 w-[339px] font-helvetica text-[16px] leading-[normal] tracking-[0.16px] text-brand-placeholder">
        {item.excerpt}
      </p>

      <div className="absolute top-[367px] left-[26px] flex items-center gap-[10px]">
        {item.avatar ? (
          <Image
            src={item.avatar.src}
            alt=""
            width={45}
            height={45}
            aria-hidden
            className="size-[45px] rounded-full object-cover"
          />
        ) : null}
        <span className="font-poppins text-[16px] leading-[27px] font-semibold tracking-[0.08px] text-white">
          {item.tag}
        </span>
        <span aria-hidden className="h-[29px] w-px bg-white/20" />
        <time className="font-helvetica text-[16px] tracking-[0.16px] text-brand-placeholder">
          {item.date}
        </time>
      </div>
    </article>
  );

  return item.href ? (
    <Link href={item.href} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}

/**
 * FAQ (1524:426). No arquivo é um painel só com dois grupos, cada um marcado
 * por uma barrinha laranja de 4×31 à esquerda do título.
 *
 * Grupos e perguntas são listas: o admin acrescenta, remove e reordena sem que
 * nada aqui precise mudar. Por isso o painel também não tem altura fixa.
 *
 * A DESCRIÇÃO do jogo (etapa 9 do builder) toma o lugar do grupo "Dúvidas
 * frequentes" padrão (2026-10-08), com quantos blocos o admin criar: o título
 * de cada um vai na barrinha laranja, cada subtítulo no lugar de uma pergunta
 * e o texto no lugar da resposta. Bloco sem título é só a lista.
 */
export function GameFaqSection({
  groups,
  description,
}: {
  groups: GamePage["faq"];
  description?: GameDescriptionGroup[];
}) {
  // Grupo padrão só aparece com pergunta; bloco da descrição pode ser só um
  // título (o `toGameDescription` já descartou os que não têm nem isso).
  const visible = groups.flatMap((group) => {
    if (group.id === FAQ_DESCRIPTION_GROUP && description) {
      return description.map((block, blockIndex) => ({
        id: `descricao-${blockIndex}`,
        title: block.title,
        items: block.items.map((item, index) => ({
          id: `descricao-${blockIndex}-${index}`,
          question: item.subtitle,
          answer: item.text,
          // Só o texto da descrição tem formatação (negrito, link, lista).
          rich: true,
        })),
      }));
    }
    return group.items.length > 0 ? [group] : [];
  });
  type VisibleItem = (typeof visible)[number]["items"][number] & { rich?: boolean };
  if (visible.length === 0) return null;

  return (
    <section className="rounded-[30px] border border-brand-border bg-[image:var(--brand-surface-fill)] px-[24px] py-[49px]">
      {visible.map((group, index) => (
        <div key={group.id} className={index > 0 ? "mt-[59px]" : undefined}>
          {/* `items-center`: a barrinha (31px) fica no meio do título (25px),
              inclusive quando ele quebra em mais de uma linha. */}
          {group.title ? (
            <div className="flex items-center gap-[22px]">
              <span
                aria-hidden
                className="h-[31px] w-[4px] shrink-0 rounded-[29px] bg-[image:var(--brand-orange-gradient)]"
              />
              <h2 className="font-helvetica text-[25px] leading-none font-bold tracking-[0.25px] text-white">
                {group.title}
              </h2>
            </div>
          ) : null}

          {group.items.length > 0 ? (
            <dl className={`${group.title ? "mt-[24px] " : ""}pl-[26px]`}>
              {group.items.map((item: VisibleItem, itemIndex) => (
                <div key={item.id} className={itemIndex > 0 ? "mt-[35px]" : undefined}>
                  {/* Subtítulo vazio = parágrafo solto (o texto corrido antigo
                      foi migrado assim). */}
                  {item.question ? (
                    <dt className="mb-[10px] font-helvetica text-[20px] leading-none font-bold tracking-[0.2px] text-white">
                      {item.question}
                    </dt>
                  ) : null}
                  <dd className="max-w-[1575px] font-helvetica text-[18px] leading-[normal] tracking-[0.18px] whitespace-pre-line text-brand-placeholder">
                    {item.rich ? <RichAnswer source={item.answer} /> : item.answer}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      ))}
    </section>
  );
}

/**
 * Texto da descrição com o Markdown RESTRITO da loja (`pages/blocks/markdown`):
 * negrito, itálico, link e listas viram elementos React, nunca HTML cru. Com a
 * tipografia das respostas (herdada do `<dd>`) e as quebras de linha mantidas.
 */
function RichAnswer({ source }: { source: string }) {
  return (
    <div className="flex flex-col gap-[12px]">
      {parseBlocks(source, { keepLineBreaks: true }).map((block, index) => {
        if ("items" in block) {
          const List = block.kind;
          return (
            <List
              key={index}
              className={`flex flex-col gap-[6px] pl-[22px] ${
                block.kind === "ul" ? "list-disc" : "list-decimal"
              } marker:text-brand-orange`}
            >
              {block.items.map((entry, entryIndex) => (
                <li key={entryIndex}>{renderInline(entry)}</li>
              ))}
            </List>
          );
        }
        // `##`/`###` no meio do texto: destaque em negrito, sem virar outro
        // nível de título (os títulos da descrição já são os campos dela).
        return (
          <p key={index} className={block.kind === "p" ? undefined : "font-bold text-white"}>
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}
