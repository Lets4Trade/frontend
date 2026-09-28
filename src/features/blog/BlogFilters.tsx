import Image from "next/image";
import Link from "next/link";
import { LogoHalo } from "@/features/game/GameIdentity";
import { pillClassName } from "@/features/game/pill";
import { cn } from "@/lib/cn";
import { BLOG_PARAM, BLOG_SEARCH_MAX, blogListHref, type BlogQuery } from "./query";
import type { BlogGameRef } from "./types";

/**
 * Fileira de filtros por JOGO + busca (Figma 1889:864, y=154).
 *
 * Cada jogo é a LOGO (altura ~50, halo borrado igual ao `GameLogo`) seguida da
 * pílula 170×50 — mesma peça da página de jogo (`pill.ts`), ativa em laranja.
 * Clicar no ativo DESLIGA o filtro: é um toggle, e dispensa a pílula "Todos"
 * que o arquivo não desenha.
 *
 * Tudo link/`<form method="get">`: server component, zero JS, e trocar de
 * filtro volta para a página 1 (a página 3 de um jogo não existe no outro).
 *
 * Abaixo de 1024px a fileira ROLA na horizontal (contrato) em vez de quebrar
 * em várias linhas que empurrariam a lista para fora da primeira tela.
 */
export function BlogFilters({ games, query }: { games: BlogGameRef[]; query: BlogQuery }) {
  return (
    <div className="flex flex-col gap-[20px] lg:flex-row lg:items-center lg:justify-between lg:gap-[40px]">
      {games.length > 0 ? (
        <nav
          aria-label="Filtrar notícias por jogo"
          className="scrollbar-orange -mx-4 flex gap-[25px] overflow-x-auto px-4 pb-[6px] lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0"
        >
          {games.map((game) => {
            const active = game.slug === query.game;
            return (
              <Link
                key={game.slug}
                href={blogListHref(query, { game: active ? "" : game.slug, page: 1 })}
                aria-current={active ? "page" : undefined}
                // Rótulo explícito: sem ele o leitor de tela leria o `alt` da
                // logo e o nome da pílula, o mesmo jogo duas vezes.
                aria-label={active ? `${game.name} (filtro ativo — remover)` : `Notícias de ${game.name}`}
                className="group flex shrink-0 items-center gap-[15px] rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
              >
                {game.logo ? <LogoHalo src={game.logo} alt="" height={50} /> : null}
                <span className={cn(pillClassName(active), "min-w-[170px] px-[20px] whitespace-nowrap")}>
                  {game.name}
                </span>
              </Link>
            );
          })}
        </nav>
      ) : (
        <span />
      )}

      <BlogSearch query={query} />
    </div>
  );
}

/**
 * Busca 219×50 com o estilo da busca do cabeçalho. `<form method="get">` de
 * verdade: funciona sem JS, e o jogo escolhido viaja em `hidden` (um GET
 * descarta o que não está no formulário). A página NÃO viaja: busca nova
 * começa na primeira.
 *
 * O arquivo diz "Pesquisar game"; a busca é de notícias, então o texto também.
 */
function BlogSearch({ query }: { query: BlogQuery }) {
  return (
    <form action="/noticias" method="get" role="search" className="relative h-[50px] w-full shrink-0 lg:w-[219px]">
      {query.game ? <input type="hidden" name={BLOG_PARAM.game} value={query.game} /> : null}
      <Image
        src="/icons/search.svg"
        alt=""
        width={20}
        height={20}
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-[25px] -translate-y-1/2"
      />
      <input
        type="search"
        name={BLOG_PARAM.search}
        defaultValue={query.search}
        maxLength={BLOG_SEARCH_MAX}
        aria-label="Pesquisar notícia"
        placeholder="Pesquisar notícia"
        className="h-[50px] w-full rounded-full border-2 border-[var(--brand-stroke-soft)] bg-[image:var(--brand-surface-fill)] pr-4 pl-[60px] font-helvetica text-[15px] tracking-[0.15px] text-white outline-none transition-colors placeholder:text-brand-placeholder focus:border-brand-orange"
      />
    </form>
  );
}
