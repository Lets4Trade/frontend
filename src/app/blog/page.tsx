import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Pagination } from "@/components/ui/Pagination";
import { BlogCard } from "@/features/blog/BlogCard";
import { BlogFilters } from "@/features/blog/BlogFilters";
import { getBlogGames, getBlogList } from "@/features/blog/data";
import { gameListTitle, getBlogTexts } from "@/features/blog/texts";
import { blogListHref, parseBlogQuery, type BlogQuery } from "@/features/blog/query";
import type { BlogGameRef, BlogListView } from "@/features/blog/types";

type RouteSearch = Record<string, string | string[] | undefined>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<RouteSearch>;
}): Promise<Metadata> {
  const query = parseBlogQuery(await searchParams);
  // Mesma leitura (URL + opções) que a página faz: o `fetch` do Next a
  // memoriza na renderização, então o título não custa outra ida ao backend.
  const games = await getBlogGames();
  const gameName = games.find((game) => game.slug === query.game)?.name;

  const title = gameName ? `Blog de ${gameName} | Lets4Trade` : "Blog | Lets4Trade";
  const description = gameName
    ? `Guias, novidades e atualizações de ${gameName} no blog da Lets4Trade.`
    : "Blog da Lets4Trade: guias, novidades e atualizações dos seus jogos.";
  const canonical = blogListHref({ game: gameName ? query.game : "", search: "", page: 1 });

  return {
    title,
    description,
    alternates: { canonical },
    // Resultado de BUSCA não é página para indexar: seria um endereço por termo
    // digitado, conteúdo duplicado da lista. Os links continuam seguidos.
    ...(query.search ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, url: canonical, type: "website", siteName: "Lets4Trade" },
  };
}

/**
 * BLOG — Figma 1889:864 ("GUIA DE NOTÍCIAS" no arquivo; virou "Blog" em
 * 2026-10-16, pedido do usuário, com `/noticias` redirecionando para cá).
 * Contrato `.claude/context/blog.md`.
 *
 * Faixa de conteúdo de 1714px (x=103 em 1920 = centrada). Ritmo vertical do
 * arquivo, medido como diferença de coordenadas:
 *
 *   108  título (Helvetica Neue Bold 22, caixa 21)  25px abaixo do header de 83
 *   154  filtros por jogo (50 de altura)            25 após o título
 *   257  divisor 1px                                53 após a fileira
 *   307  título da lista (caixa 26)                 50 após o divisor
 *   358  cards                                      25 após o título; vão de 50
 *
 * As duas leituras saem em PARALELO; ambas são cacheadas por 60s com etiqueta
 * derrubada pelo painel (`features/blog/data.ts`).
 */
export default async function NoticiasPage({ searchParams }: { searchParams: Promise<RouteSearch> }) {
  const query = parseBlogQuery(await searchParams);
  // Textos fixos editáveis em Painel → Páginas → Blog (2026-10-16).
  const [games, list, texts] = await Promise.all([getBlogGames(), getBlogList(query), getBlogTexts()]);

  // Nome do jogo filtrado: da fileira de filtros ou, se ele não estiver nela
  // (link antigo), do primeiro card. Sem nenhum dos dois, título neutro.
  const gameName =
    games.find((game) => game.slug === query.game)?.name ??
    list?.items.find((item) => item.game?.slug === query.game)?.game?.name;
  const listTitle = query.game ? gameListTitle(texts.gameListTitle, gameName ?? "") : texts.listTitle;

  return (
    <div className="flex min-h-dvh flex-col bg-brand-bg">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-[1746px] px-4 pt-[25px] pb-[120px] sm:px-6 xl:px-[16px]">
          <h1 className="font-helvetica text-[22px] leading-[21px] font-bold tracking-[0.22px] text-white lg:pl-[9px]">
            {texts.pageTitle}
          </h1>

          <div className="mt-[25px]">
            <BlogFilters games={games} query={query} searchPlaceholder={texts.searchPlaceholder} />
          </div>

          <hr className="mt-[30px] border-0 border-t border-white/10 lg:mt-[53px]" />

          <h2 className="mt-[30px] font-helvetica text-[22px] leading-[26px] font-bold tracking-[0.22px] text-white lg:mt-[49px] lg:pl-[9px]">
            {listTitle}
          </h2>

          <div className="mt-[25px]">
            <ListBody list={list} query={query} games={games} />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function ListBody({
  list,
  query,
  games,
}: {
  list: BlogListView | null;
  query: BlogQuery;
  games: BlogGameRef[];
}) {
  // Backend fora: dizer "nenhuma notícia" seria afirmar algo que ninguém leu.
  if (list === null) {
    return <Empty message="Não foi possível carregar o blog agora. Tente novamente em instantes." />;
  }

  if (list.items.length === 0) {
    const filtering = query.game !== "" || query.search !== "";
    // Vazio por FILTRO e vazio por FALTA DE CONTEÚDO dizem coisas diferentes.
    if (filtering) {
      return (
        <Empty
          message={
            query.search
              ? `Nenhum post encontrado para “${query.search}”.`
              : "Ainda não há posts deste jogo."
          }
          action={{ href: "/blog", label: "Ver todos os posts" }}
        />
      );
    }
    // Página além da última (link velho) cai aqui também quando não há nada.
    if (query.page > 1) {
      return <Empty message="Esta página não existe." action={{ href: "/blog", label: "Voltar ao início" }} />;
    }
    return (
      <Empty
        message={
          games.length > 0
            ? "Nenhum post por aqui ainda."
            : "Ainda não publicamos nenhum post. Volte em breve!"
        }
      />
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-[30px] lg:gap-[50px]">
        {list.items.map((post, index) => (
          <li key={post.slug}>
            <BlogCard post={post} priority={index === 0} />
          </li>
        ))}
      </ul>

      <Pagination
        current={list.page}
        pageCount={list.pageCount}
        href={(page) => blogListHref(query, { page })}
        label="dos posts"
        className="mt-[50px]"
      />
    </>
  );
}

function Empty({ message, action }: { message: string; action?: { href: string; label: string } }) {
  return (
    <div className="rounded-[30px] border-2 border-white/10 px-6 py-[80px] text-center">
      <p className="font-helvetica text-[18px] text-brand-fg-muted">{message}</p>
      {action ? (
        <Link
          href={action.href}
          className="mt-4 inline-block font-poppins text-[16px] font-bold text-brand-orange transition-opacity hover:opacity-80"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
