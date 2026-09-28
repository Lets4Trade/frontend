import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { BlogCard, PostMeta } from "@/features/blog/BlogCard";
import { getBlogPost } from "@/features/blog/data";
import { newsArticleJsonLd, serializeJsonLd } from "@/features/blog/seo";
import { Markdown } from "@/features/pages/blocks/markdown";

type RouteParams = { slug: string };

export async function generateMetadata({ params }: { params: Promise<RouteParams> }): Promise<Metadata> {
  const { slug } = await params;
  // Mesma leitura da página (memorizada pelo `fetch` do Next na renderização).
  const post = await getBlogPost(slug);
  if (!post) return {};

  const title = `${post.title} | Lets4Trade`;
  return {
    title,
    description: post.excerpt,
    alternates: { canonical: post.href },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: post.href,
      type: "article",
      siteName: "Lets4Trade",
      ...(post.publishedAt ? { publishedTime: post.publishedAt } : {}),
      ...(post.cover ? { images: [{ url: post.cover, alt: post.title }] } : {}),
    },
    twitter: {
      card: post.cover ? "summary_large_image" : "summary",
      title: post.title,
      description: post.excerpt,
      ...(post.cover ? { images: [post.cover] } : {}),
    },
  };
}

/**
 * Matéria `/noticias/[slug]` — NÃO está no Figma (contrato `blog.md`).
 *
 * Mesma linguagem visual da lista: capa grande de raio 30, título Poppins
 * Bold, a linha jogo · data do card, corpo em Markdown RESTRITO (o renderer dos
 * blocos de página: vira elementos React, nunca HTML cru) e, no fim, até três
 * "Mais notícias" do mesmo jogo com o card compacto.
 *
 * A coluna de leitura tem 860px: linha longa demais cansa, e o corpo é texto
 * corrido — a faixa de 1714 da lista fica para a capa e os relacionados.
 */
export default async function NoticiaPage({ params }: { params: Promise<RouteParams> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  // Inexistente, rascunho ou slug fora do formato: 404 (fail secure).
  if (!post) notFound();

  return (
    <div className="flex min-h-dvh flex-col bg-brand-bg">
      <SiteHeader />

      {/* JSON-LD: `<script>` é a recomendação do Next 16 (guia json-ld). O
          conteúdo é JSON com `<` escapado — `serializeJsonLd` — e é a ÚNICA
          injeção de texto cru da página; o corpo passa pelo Markdown restrito. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(newsArticleJsonLd(post)) }}
      />

      <main className="flex-1">
        <article className="mx-auto w-full max-w-[1746px] px-4 pt-[25px] pb-[80px] sm:px-6 xl:px-[16px]">
          <Link
            href="/noticias"
            className="inline-block font-poppins text-[15px] font-semibold text-brand-fg-muted transition-colors hover:text-brand-orange"
          >
            ← Voltar às notícias
          </Link>

          {post.cover ? (
            <div className="relative mt-[25px] aspect-video w-full overflow-hidden rounded-[30px] border-2 border-white/10 lg:aspect-[1714/600]">
              <Image
                src={post.cover}
                alt=""
                fill
                priority
                sizes="(min-width: 1746px) 1714px, 100vw"
                className="object-cover"
              />
            </div>
          ) : null}

          <div className="mx-auto mt-[40px] max-w-[860px]">
            <h1 className="font-poppins text-[28px] leading-[36px] font-bold tracking-[0.3px] text-white lg:text-[36px] lg:leading-[46px]">
              {post.title}
            </h1>

            <PostMeta post={post} className="mt-[20px]" />

            {post.excerpt ? (
              <p className="mt-[30px] font-helvetica text-[18px] leading-[28px] text-brand-placeholder">
                {post.excerpt}
              </p>
            ) : null}

            <hr className="mt-[30px] border-0 border-t border-white/10" />

            <div className="mt-[30px] flex flex-col gap-[18px]">
              <Markdown source={post.body} />
            </div>
          </div>
        </article>

        {post.related.length > 0 ? (
          <section
            aria-labelledby="mais-noticias"
            className="mx-auto w-full max-w-[1746px] px-4 pb-[120px] sm:px-6 xl:px-[16px]"
          >
            <hr className="border-0 border-t border-white/10" />
            <h2
              id="mais-noticias"
              className="mt-[50px] font-poppins text-[22px] leading-none font-bold tracking-[0.22px] text-white"
            >
              MAIS NOTÍCIAS
            </h2>
            <ul className="mt-[30px] grid grid-cols-1 gap-[30px] md:grid-cols-2 lg:grid-cols-3 lg:gap-[50px]">
              {post.related.map((item) => (
                <li key={item.slug}>
                  <BlogCard post={item} variant="compact" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  );
}
