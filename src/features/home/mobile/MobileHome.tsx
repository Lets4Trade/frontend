import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { CountUp } from "@/components/ui/CountUp";
import type { SectionItemView, SectionView } from "@/features/site/content";
import { cn } from "@/lib/cn";
import { BLOG_CARD } from "../guides";
import type { HomeBlock } from "../homeBlocks";
import { getMenuGames, type MenuGame } from "@/features/game/menuGames";
import { NAV_ITEMS } from "../HomeNav";
import { reveal, revealDelay } from "../reveal";
import { Stars } from "../ReviewsSection";
import { TEAM_DEFAULT_BODY } from "../TeamSection";
import { VideoPlayer } from "../VideoPlayer";
import { videoTexts } from "../VideoSection";
import { youtubeId, youtubeWatchUrl } from "../youtube";
import { MobileGamesMenu } from "./MobileGamesMenu";
import { MobileHeroBanner } from "./MobileHeroBanner";
import { NavTileFace } from "./NavTileFace";
import { MobileStickyNav } from "./MobileStickyNav";

/**
 * A home no CELULAR (Figma 2667:1864, frame de 402px).
 *
 * ── Por que componentes próprios, e não os do desktop encolhidos ──────────
 * O desktop (Figma 131:1504) é uma tela POSICIONADA: cada texto e card tem a
 * coordenada do frame de 1920. O mobile não é o mesmo desenho menor — a ordem
 * interna muda (a capa do vídeo sobe acima do texto, a equipe vira grade de
 * duas colunas, os guias empilham). Reaproveitar o desktop com `transform:
 * scale` daria letras de 7px.
 *
 * ── O que é compartilhado ─────────────────────────────────────────────────
 * Os DADOS: as mesmas sessões e listas do banco, a mesma ordem e visibilidade
 * do editor (`orderBlocks`), e os mesmos textos padrão (`videoTexts`,
 * `TEAM_DEFAULT_BODY`). Editar no painel muda as duas versões.
 *
 * ── Sem atributos de edição ───────────────────────────────────────────────
 * Estes blocos NÃO levam `data-edit-*`. O editor de páginas trabalha no
 * desenho desktop e lê a ordem dos itens pelo DOM; cópias escondidas dos
 * mesmos itens bagunçariam o "mover" e o "remover".
 *
 * Medidas: frame de 402 com 25px de margem (conteúdo de 352), lidas da imagem
 * do Figma em resolução reduzida — o MCP bateu no limite do plano antes do
 * contexto completo (2026-09-18). Proporções conferidas, px finos estimados.
 */

/** Divisor entre seções, como no desenho mobile. */
function Divider() {
  return <hr className="border-0 border-t border-brand-hairline" />;
}

export function buildMobileHomeBlocks(
  section: (key: string) => SectionView,
  items: (key: string) => SectionItemView[],
): HomeBlock[] {
  return [
    {
      key: "hero",
      gap: 0,
      node: (
        <MobileHeroBanner
          fallbackImage={section("hero").imageUrl ?? "/images/hero-banner.svg"}
          caption={section("hero").title}
          items={items("hero-banner")}
        />
      ),
    },
    {
      key: "navegacao",
      gap: 24,
      node: <MobileNav stats={items("navegacao")} />,
    },
    {
      key: "video",
      gap: 24,
      node: <MobileVideo section={section("video")} />,
    },
    {
      key: "reviews",
      gap: 40,
      node: <MobileReviews section={section("reviews")} items={items("reviews")} />,
    },
    {
      key: "equipe",
      gap: 40,
      node: <MobileTeam section={section("equipe")} items={items("equipe")} />,
    },
    {
      key: "guias",
      gap: 40,
      node: <MobileGuides title={section("guias").title} items={items("guias")} />,
    },
    {
      key: "faq",
      gap: 40,
      node: <MobileFaq title={section("faq").title} items={items("faq")} />,
    },
  ];
}

// ─────────────────────────────── navegação ───────────────────────────────

/**
 * Atalhos + contadores. ASSÍNCRONO desde 2026-09-24: lê a lista de jogos para o
 * dropdown do GAMES — a MESMA leitura cacheada do cabeçalho (`getMenuGames`),
 * que o Next deduplica na requisição, então não é uma ida a mais ao backend.
 */
async function MobileNav({ stats }: { stats: SectionItemView[] }) {
  const games = await getMenuGames();
  return (
    <section>
      <nav id="home-mobile-tabs" aria-label="Seções principais">
        <NavTiles games={games} />
      </nav>

      <div className="mt-[22px]">
        <Divider />
      </div>

      {stats.length > 0 ? (
        <dl className="grid grid-cols-2 gap-[12px] py-[20px] text-center">
          {stats.slice(0, 2).map((stat) => (
            <div key={stat.id}>
              <dt className="sr-only">{stat.body}</dt>
              <dd className="font-poppins text-[32px] leading-[40px] font-semibold text-brand-orange">
                <CountUp value={stat.title} />
              </dd>
              <dd aria-hidden className="mt-[2px] font-poppins text-[12px] leading-[16px] font-bold tracking-[0.12px] text-white/80">
                {stat.body}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <Divider />

      {/* A mesma fileira, flutuando no rodapé da tela quando a de cima sai de
          vista. Ali o dropdown de jogos abre PARA CIMA. */}
      <MobileStickyNav>
        <NavTiles compact games={games} />
      </MobileStickyNav>
    </section>
  );
}

/**
 * Os quatro atalhos da home (mesma lista do desktop, `NAV_ITEMS`).
 *
 * O GAMES não é link: abre o dropdown com os jogos (`MobileGamesMenu`) — para
 * cima na versão compacta (rodapé flutuante), para baixo na do corpo.
 */
export function NavTiles({ compact = false, games }: { compact?: boolean; games: MenuGame[] }) {
  return (
    <ul className="grid grid-cols-4">
      {NAV_ITEMS.map((item) => (
        <li key={item.label} className="flex justify-center">
          {item.label === "GAMES" ? (
            <MobileGamesMenu
              label={item.label}
              icon={item.icon}
              games={games}
              compact={compact}
              side={compact ? "top" : "bottom"}
            />
          ) : (
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className="nav-item flex flex-col items-center"
            >
              <NavTileFace
                label={item.label}
                icon={item.icon}
                active={item.active}
                compact={compact}
                chevron={item.dropdown}
              />
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

// ───────────────────────────────── vídeo ─────────────────────────────────

function MobileVideo({ section }: { section: SectionView }) {
  const t = videoTexts(section.extra);
  const videoId = youtubeId(section.footnote);
  // Mesmo critério do desktop: link próprio do botão, senão o do player.
  const buttonVideoId = youtubeId(section.subtitle) ?? videoId;

  return (
    <section aria-labelledby="video-title-mobile">
      <VideoPlayer
        image={section.imageUrl ?? "/images/video-thumb.png"}
        videoId={videoId}
        videoFile={section.videoUrl}
        compact
        revealKind="wipe"
        frameClassName="play-button relative block aspect-[1146/609] w-full overflow-hidden rounded-[20px]"
      />

      <h2 {...reveal("mask")}
        id="video-title-mobile"
        className="mt-[24px] font-poppins text-[26px] leading-[1.05] font-semibold whitespace-pre-line text-white"
      >
        {section.title}
      </h2>

      <p className="mt-[12px] font-helvetica text-[15px] leading-[1.25] whitespace-pre-line text-brand-placeholder">
        <strong className="font-bold text-white">{t.saudacao}</strong> {t.apresentacao}
      </p>
      <p className="mt-[16px] font-helvetica text-[15px] leading-[1.25] text-brand-placeholder">
        {t.chamada}
      </p>

      <a
        href={buttonVideoId ? youtubeWatchUrl(buttonVideoId) : "#reviews-mobile"}
        {...(buttonVideoId ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className={cn(
          buttonVariants({ variant: "primary" }),
          "cta-sheen relative mx-auto mt-[24px] flex w-full max-w-[285px] shadow-[0_16px_18.5px_rgba(0,0,0,0.25)]",
        )}
      >
        {t.botao}
      </a>

      <p className="mt-[16px] text-center font-helvetica text-[15px] leading-[1.25] text-brand-placeholder italic">
        {t.convite}
      </p>

      <div className="mt-[24px] flex items-center gap-[14px]">
        <Image
          src={section.secondaryImageUrl ?? "/images/home/eddmax.png"}
          alt=""
          width={50}
          height={50}
          aria-hidden
          className="size-[50px] rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="font-poppins text-[16px] leading-[22px] font-bold text-white">{t.assinaturaNome}</p>
          <p className="font-poppins text-[12px] leading-[14px] font-medium text-white/80 italic">{t.assinaturaCargo}</p>
        </div>
        <Image
          src="/images/home/deco-prisma.webp"
          alt=""
          width={56}
          height={56}
          aria-hidden
          className="pointer-events-none size-[56px] object-cover"
        />
      </div>
    </section>
  );
}

// ──────────────────────────────── reviews ────────────────────────────────

function MobileReviews({ section, items }: { section: SectionView; items: SectionItemView[] }) {
  const counter = section.footnote || "515 Reviews";
  return (
    <section id="reviews-mobile" aria-labelledby="reviews-title-mobile" className="relative scroll-mt-[80px]">
      <Divider />

      <Image
        src="/images/home/deco-reviews.webp"
        alt=""
        width={64}
        height={70}
        aria-hidden
        className="pointer-events-none absolute top-[118px] -right-[25px] h-[70px] w-[64px] object-cover"
      />

      <h2 {...reveal("mask")}
        id="reviews-title-mobile"
        className="mt-[40px] text-center font-poppins text-[26px] leading-none font-semibold text-white"
      >
        {section.title || "NOSSAS REVIEWS"}
      </h2>
      <p className="mt-[10px] text-center font-helvetica text-[15px] font-bold text-white">
        {section.subtitle || "O que nossos clientes falam de nós?"}
      </p>

      <div className="relative mx-auto mt-[20px] flex h-[45px] w-[288px] max-w-full items-center justify-center rounded-[30px] border border-white/10">
        <Stars className="absolute blur-[3px]" animated />
        <Stars animated />
        <span
          aria-hidden
          className="absolute -top-[2px] left-1/2 h-[2px] w-[249px] max-w-[86%] -translate-x-1/2 bg-linear-to-r from-transparent via-brand-rating to-transparent"
        />
      </div>

      <p className="mt-[18px] flex items-center justify-center gap-[8px] font-poppins text-[16px] text-white">
        <span aria-hidden className="size-[5px] rounded-full bg-brand-orange" />
        <span>
          <strong className="font-bold">{counter.split(" ")[0]}</strong>
          {counter.includes(" ") ? ` ${counter.slice(counter.indexOf(" ") + 1)}` : ""}
        </span>
      </p>

      {items.length > 0 ? (
        // Carrossel por ARRASTE (scroll-snap nativo, sem JS): um card centrado
        // e as pontas dos vizinhos aparecendo, como no desenho. Sangra até a
        // borda da tela (-mx) para os vizinhos não serem cortados na margem.
        <ul
          aria-label="Depoimentos"
          className="-mx-[25px] mt-[22px] flex snap-x snap-mandatory gap-[16px] overflow-x-auto px-[calc(50%-145px)] pb-[8px] [scrollbar-width:none]"
        >
          {items.map((review) => (
            <li
              key={review.id}
              className="review-card relative w-[290px] shrink-0 snap-center rounded-[30px] border border-white/10 bg-black/10 p-[25px]"
            >
              <div className="flex items-center gap-[15px]">
                {review.image ? (
                  <Image src={review.image} alt="" width={42} height={42} aria-hidden className="size-[42px] rounded-full object-cover" />
                ) : (
                  <span aria-hidden className="size-[42px] rounded-full border border-white/10 bg-white/5" />
                )}
                <p className="font-poppins text-[18px] font-bold tracking-[0.36px] text-white">{review.title}</p>
              </div>
              <p className="mt-[24px] font-helvetica text-[15px] leading-[1.25] text-brand-placeholder">
                {review.body}
              </p>
              <Image
                src="/icons/youtube-color.svg"
                alt="Avaliação publicada no YouTube"
                width={18}
                height={18}
                className="mt-[24px] size-[18px]"
              />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

// ───────────────────────────────── equipe ────────────────────────────────

/**
 * Ordem dos cards no celular, em termos dos LUGARES do desktop (ver
 * `CARD_POSITIONS` em `TeamSection`): o 2º lugar (EDDMAX, à direita do texto)
 * vem sozinho em destaque, e os demais em pares — 1º e 7º, 3º e 5º, 6º e 4º
 * (DANIEL/LUAN, ROGUE/YURI, GUS/ZEZÃO no desenho). Membros além do 7º seguem
 * na ordem da lista.
 */
const MOBILE_TEAM_ORDER = [1, 0, 6, 2, 4, 5, 3];

function MobileTeam({ section, items }: { section: SectionView; items: SectionItemView[] }) {
  const ordered = [
    ...MOBILE_TEAM_ORDER.map((slot) => items[slot]).filter(
      (member): member is SectionItemView => Boolean(member),
    ),
    ...items.slice(MOBILE_TEAM_ORDER.length),
  ];
  const [featured, ...rest] = ordered;

  return (
    <section aria-labelledby="team-title-mobile" className="relative">
      <Divider />

      <div className="relative mt-[40px]">
        <Image
          src="/images/home/deco-equipe.webp"
          alt=""
          width={50}
          height={50}
          aria-hidden
          className="pointer-events-none absolute -top-[20px] -left-[14px] size-[50px] object-cover"
        />
        <h2 {...reveal("mask")} id="team-title-mobile" className="relative font-poppins text-[26px] leading-none font-semibold text-white">
          {section.title || "EQUIPE LETS 4 TRADE"}
        </h2>
      </div>
      <p className="mt-[12px] font-helvetica text-[15px] font-bold text-white">
        {section.subtitle || "Especialistas no que há de melhor no mercado relacionado a ARPGs"}
      </p>
      <p className="mt-[16px] font-helvetica text-[15px] leading-[1.25] whitespace-pre-line text-brand-placeholder">
        {section.body || TEAM_DEFAULT_BODY}
      </p>

      {featured ? (
        <div className="mt-[28px] flex justify-center">
          <MemberCard member={featured} className="w-[216px]" />
        </div>
      ) : null}

      {rest.length > 0 ? (
        <ul className="mt-[18px] grid grid-cols-2 gap-[10px]">
          {rest.map((member, index) => (
            <li key={member.id} {...reveal("rise")} style={revealDelay(index % 2)}>
              <MemberCard member={member} className="w-full" />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** Card da equipe, fluido: a foto de 261×316 mantém a proporção do desktop. */
function MemberCard({ member, className }: { member: SectionItemView; className: string }) {
  return (
    <div
      className={cn(
        "team-card rounded-[24px] border border-white/10 bg-black/10 px-[14%] pt-[14%] pb-[16px] backdrop-blur-[40px]",
        className,
      )}
    >
      {member.image ? (
        <Image
          src={member.image}
          alt={member.title}
          width={261}
          height={316}
          className="team-photo aspect-[261/316] w-full object-contain"
        />
      ) : (
        <span aria-hidden className="block aspect-[261/316] w-full rounded-[16px] border border-dashed border-white/15" />
      )}
      <p className="mt-[14px] text-center font-poppins text-[13px] leading-none font-bold tracking-[0.26px] text-white">
        {member.title}
      </p>
    </div>
  );
}

// ───────────────────────────────── guias ─────────────────────────────────

function MobileGuides({ title, items }: { title: string; items: SectionItemView[] }) {
  // Mesma regra do desktop: 3 guias altos, o 4º baixo, e o "Visitar blog".
  const tall = items.slice(0, 3);
  const compact = items[3];

  return (
    <section aria-labelledby="guides-title-mobile" className="relative">
      <Divider />
      <h2 {...reveal("mask")} id="guides-title-mobile" className="mt-[40px] font-poppins text-[26px] leading-none font-semibold text-white">
        {title || "GUIAS POPULARES"}
      </h2>

      <ul className="mt-[28px] flex flex-col gap-[20px]">
        {tall.map((guide) => (
          <li key={guide.id} {...reveal("rise")}>
            <GuideCard guide={guide} />
          </li>
        ))}
        {compact ? (
          <li {...reveal("rise")}>
            <GuideCard guide={compact} compact />
          </li>
        ) : null}
        <li {...reveal("rise")}>
          <Link
            href={BLOG_CARD.href}
            className="blog-card relative block aspect-[352/174] overflow-hidden rounded-[24px] border border-white/10 bg-black"
          >
            <span
              aria-hidden
              className="blog-glow absolute -top-[60px] -left-[70px] h-[170px] w-[150px] rotate-[77deg] rounded-full blur-[54px]"
              style={{ backgroundImage: "linear-gradient(262.85deg, var(--brand-orange), var(--brand-orange-shade))" }}
            />
            <span
              aria-hidden
              className="blog-glow absolute -top-[90px] left-[40px] h-[190px] w-[160px] -rotate-[110deg] rounded-full bg-brand-orange-deep blur-[75px]"
            />
            <span className="absolute bottom-[42px] left-[25px] font-poppins text-[16px] font-semibold text-white">
              {BLOG_CARD.title}
            </span>
            <span className="absolute bottom-[18px] left-[25px] font-helvetica text-[14px] text-brand-placeholder">
              {BLOG_CARD.subtitle}
            </span>
            <Image
              src="/icons/home/arrow-double-right.svg"
              alt=""
              width={22}
              height={22}
              aria-hidden
              className="absolute right-[25px] bottom-[18px] size-[22px]"
            />
          </Link>
        </li>
      </ul>
    </section>
  );
}

function GuideCard({ guide, compact = false }: { guide: SectionItemView; compact?: boolean }) {
  return (
    <article
      className={cn(
        "guide-card relative overflow-hidden rounded-[24px] border border-white/10 bg-brand-surface",
        compact ? "aspect-[352/206]" : "aspect-[352/340]",
      )}
    >
      {guide.image ? (
        <Image
          src={guide.image}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 400px"
          aria-hidden
          className="guide-art object-cover"
        />
      ) : null}
      <span aria-hidden className="absolute inset-x-0 top-0 h-[40%] bg-linear-to-b from-black to-transparent" />
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-[60%] bg-linear-to-b from-transparent to-black to-60%" />

      {guide.secondaryImage ? (
        <Image
          src={guide.secondaryImage}
          alt=""
          width={80}
          height={50}
          aria-hidden
          className="absolute top-[20px] left-[25px] h-[44px] w-[80px] object-contain object-left"
        />
      ) : null}

      <div className="absolute inset-x-[25px] bottom-[20px]">
        {guide.title ? (
          <h3 className="font-poppins text-[16px] font-semibold text-white">{guide.title}</h3>
        ) : null}
        <p className={cn("mt-[8px] font-helvetica text-[14px] leading-[1.2] text-brand-placeholder", compact && "line-clamp-3")}>
          {guide.body}
        </p>
      </div>
    </article>
  );
}

// ───────────────────────────────── dúvidas ───────────────────────────────

function MobileFaq({ title, items }: { title: string; items: SectionItemView[] }) {
  return (
    <section aria-labelledby="faq-title-mobile">
      <Divider />
      <div className="mt-[40px] overflow-hidden rounded-[24px] border border-white/20 bg-black/10 px-[25px] pt-[28px] pb-[32px] backdrop-blur-[100px]">
        <h2 {...reveal("mask")} id="faq-title-mobile" className="font-poppins text-[20px] leading-none font-semibold text-white">
          {title || "DÚVIDAS SOBRE A EMPRESA"}
        </h2>

        <Image
          src="/images/home/faq-arte.webp"
          alt=""
          width={708}
          height={428}
          aria-hidden
          className="mt-[20px] aspect-[708/428] w-full rounded-[12px] object-cover"
        />

        <dl className="mt-[24px] flex flex-col gap-[24px]">
          {items.map((item) => (
            <div key={item.id} {...reveal("rise")}>
              <dt className="font-poppins text-[16px] leading-[1.2] font-semibold text-white">{item.title}</dt>
              <dd className="mt-[10px] font-helvetica text-[14px] leading-[1.25] text-brand-placeholder">
                {item.body.split(/\n\s*\n/).map((paragraph, i) => (
                  <p key={paragraph.slice(0, 32)} className={i > 0 ? "mt-[10px]" : undefined}>
                    {paragraph}
                  </p>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
