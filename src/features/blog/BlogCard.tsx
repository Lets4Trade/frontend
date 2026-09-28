import Image from "next/image";
import Link from "next/link";
import type { BlogCardView } from "./types";

/**
 * Card de notícia — Figma 1889:864 (lista `/noticias`).
 *
 * `wide` (a lista): 1714×376, borda 2px branca a 10%, raio 30. Capa de 513×372
 * à esquerda + divisor de 1px; à direita, com 50px de recuo, título (y=50),
 * resumo (y=92, até 4 linhas) e a linha jogo · data (y=194). Abaixo de 1024px
 * empilha: capa 16:9 em cima (regra do contrato).
 *
 * `compact` (fora do Figma): o mesmo card em coluna, para "Mais notícias" no
 * fim da matéria — três lado a lado não cabem no formato largo.
 *
 * O card INTEIRO é o link (pedido do contrato). Um `<Link>` envolvendo o
 * `<article>` e nenhum outro elemento interativo dentro — link dentro de link é
 * HTML inválido e confunde leitor de tela.
 */
export function BlogCard({
  post,
  variant = "wide",
  headingLevel = "h3",
  priority = false,
}: {
  post: BlogCardView;
  variant?: "wide" | "compact";
  headingLevel?: "h2" | "h3";
  /** Só o primeiro card da lista (acima da dobra). */
  priority?: boolean;
}) {
  const Heading = headingLevel;
  const wide = variant === "wide";

  return (
    <Link
      href={post.href}
      className="group block rounded-[30px] outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
    >
      <article
        className={
          wide
            ? "flex flex-col overflow-hidden rounded-[30px] border-2 border-white/10 transition-colors group-hover:border-white/20 lg:h-[376px] lg:flex-row"
            : "flex h-full flex-col overflow-hidden rounded-[30px] border-2 border-white/10 transition-colors group-hover:border-white/20"
        }
      >
        <div
          className={
            wide
              ? "relative aspect-video w-full shrink-0 bg-[#2f2f2f] lg:aspect-auto lg:h-full lg:w-[513px]"
              : "relative aspect-video w-full shrink-0 bg-[#2f2f2f]"
          }
        >
          {post.cover ? (
            <Image
              src={post.cover}
              alt=""
              fill
              // A capa é decorativa: o título logo ao lado já descreve a
              // matéria, e repeti-lo no `alt` faria o leitor de tela ler duas vezes.
              sizes={wide ? "(min-width: 1024px) 513px, 100vw" : "(min-width: 1024px) 540px, 100vw"}
              priority={priority}
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : null}
        </div>

        {/* Divisor vertical de 1px (horizontal quando empilhado). */}
        <span
          aria-hidden
          className={wide ? "h-px w-full shrink-0 bg-white/10 lg:h-full lg:w-px" : "h-px w-full bg-white/10"}
        />

        <div
          className={
            wide
              ? "flex min-w-0 flex-1 flex-col px-[20px] py-[24px] lg:px-[50px] lg:pt-[48px] lg:pb-0"
              : "flex min-w-0 flex-1 flex-col px-[24px] py-[24px]"
          }
        >
          <Heading className="line-clamp-2 font-poppins text-[18px] leading-[27px] font-bold tracking-[0.36px] text-white">
            {post.title}
          </Heading>

          {post.excerpt ? (
            <p
              className={`mt-[15px] max-w-[1099px] font-helvetica text-[16px] leading-[20px] tracking-[0.16px] text-brand-placeholder ${
                wide ? "line-clamp-4" : "line-clamp-3"
              }`}
            >
              {post.excerpt}
            </p>
          ) : null}

          <PostMeta post={post} className={wide ? "mt-[22px]" : "mt-auto pt-[20px]"} />
        </div>
      </article>
    </Link>
  );
}

/**
 * Linha "logo · jogo | data" (y=194 no card): círculo de 45px com a logo do
 * jogo em fundo escuro (cinza sem jogo/arte), nome em Poppins SemiBold 16,
 * divisor 1×29 a 20% e a data dd/mm/aa.
 */
export function PostMeta({ post, className = "" }: { post: BlogCardView; className?: string }) {
  return (
    <div className={`flex items-center gap-[10px] ${className}`}>
      <span
        aria-hidden
        className={`relative flex size-[45px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 ${
          post.game?.logo ? "bg-[#0a0a0a]" : "bg-[#2f2f2f]"
        }`}
      >
        {post.game?.logo ? (
          <Image src={post.game.logo} alt="" fill sizes="45px" className="object-contain p-[6px]" />
        ) : null}
      </span>
      {post.game ? (
        <>
          <span className="truncate font-poppins text-[16px] leading-[27px] font-semibold text-white">
            {post.game.name}
          </span>
          <span aria-hidden className="h-[29px] w-px shrink-0 bg-white/20" />
        </>
      ) : null}
      {post.date ? (
        <time
          dateTime={post.publishedAt}
          className="shrink-0 font-helvetica text-[16px] tracking-[0.16px] text-brand-placeholder"
        >
          {post.date}
        </time>
      ) : null}
    </div>
  );
}
