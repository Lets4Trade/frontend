import Image from "next/image";
import Link from "next/link";
import type { GameBanner, GameNewsItem, GamePage, GameReference } from "./types";

/**
 * As seções editáveis da página de jogo: banner, referências, notícias e FAQ.
 *
 * Todas SOMEM quando o admin não tem conteúdo para elas, em vez de mostrarem o
 * retângulo cinza que o arquivo usa como espaço reservado. Um bloco vazio no ar
 * é pior do que a seção não existir, e a ordem delas vem de `page.sections`.
 */

/** Banner do topo (1146:386): 1714×490 com os pontinhos de slide. */
export function BannerSection({ banners }: { banners: GameBanner[] }) {
  if (banners.length === 0) return null;
  const [first] = banners;

  return (
    <section className="relative h-[490px] overflow-hidden rounded-[30px] border border-white/10 bg-[#2f2f2f]">
      {first.href ? (
        <Link href={first.href} className="absolute inset-0">
          <BannerArt banner={first} />
        </Link>
      ) : (
        <BannerArt banner={first} />
      )}

      {/* Indicadores: barras de 40×3 a cada 50px, a ativa em degradê laranja
          com uma cópia borrada atrás fazendo o brilho — o mesmo tratamento do
          banner do hero da home. */}
      {banners.length > 1 ? (
        <div className="absolute bottom-[28px] left-[50px] flex gap-[10px]">
          {banners.map((banner, index) => (
            <span key={banner.id} className="relative block h-[3px] w-[40px]">
              {index === 0 ? (
                <>
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-[image:var(--brand-orange-gradient)] blur-[1.55px]"
                  />
                  <span className="absolute inset-0 bg-[image:var(--brand-orange-gradient)]" />
                </>
              ) : (
                <span className="absolute inset-0 bg-[#3b3b3b]" />
              )}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function BannerArt({ banner }: { banner: GameBanner }) {
  return (
    <Image
      src={banner.image.src}
      alt={banner.image.alt ?? ""}
      width={banner.image.width}
      height={banner.image.height}
      priority
      className="size-full object-cover"
    />
  );
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
 */
export function GameFaqSection({ groups }: { groups: GamePage["faq"] }) {
  if (groups.length === 0) return null;

  return (
    <section className="rounded-[30px] border border-brand-border bg-[image:var(--brand-surface-fill)] px-[24px] py-[49px]">
      {groups.map((group, index) => (
        <div key={group.id} className={index > 0 ? "mt-[59px]" : undefined}>
          <div className="flex items-start gap-[22px]">
            <span
              aria-hidden
              className="mt-[2px] h-[31px] w-[4px] shrink-0 rounded-[29px] bg-[image:var(--brand-orange-gradient)]"
            />
            <h2 className="font-helvetica text-[25px] leading-none font-bold tracking-[0.25px] text-white">
              {group.title}
            </h2>
          </div>

          <dl className="mt-[24px] pl-[26px]">
            {group.items.map((item, itemIndex) => (
              <div key={item.id} className={itemIndex > 0 ? "mt-[35px]" : undefined}>
                <dt className="font-helvetica text-[20px] leading-none font-bold tracking-[0.2px] text-white">
                  {item.question}
                </dt>
                <dd className="mt-[10px] max-w-[1575px] font-helvetica text-[18px] leading-[normal] tracking-[0.18px] text-brand-placeholder">
                  {item.answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </section>
  );
}
