import Image from "next/image";
import Link from "next/link";
import { LogoHalo } from "@/features/game/GameIdentity";
import { ALL_LABEL, pillClassName } from "@/features/game/pill";
import { cn } from "@/lib/cn";
import { ServerDropdown } from "@/features/game/ServerDropdown";
import { BLOG_PARAM, BLOG_SEARCH_MAX, blogListHref, type BlogQuery } from "./query";
import type { BlogGameRef } from "./types";

/**
 * Fileira de filtros por JOGO + busca (Figma 1889:864, y=154).
 *
 * Cada jogo é a LOGO (altura ~50, halo borrado igual ao `GameLogo`) seguida da
 * pílula 170×50 — mesma peça da página de jogo (`pill.ts`), ativa em laranja.
 * Clicar no ativo DESLIGA o filtro (toggle) e, desde 2026-11-17 (pedido do
 * usuário), a pílula "Todos" vem PRIMEIRO — o toggle sozinho ninguém descobria.
 *
 * Tudo link/`<form method="get">`: server component, zero JS, e trocar de
 * filtro volta para a página 1 (a página 3 de um jogo não existe no outro).
 *
 * Medidas do arquivo (2026-10-16, conferidas contra o Figma): logo → 15px →
 * pílula de 170×50, e 15px entre um jogo e o próximo; a busca fica na MESMA
 * linha, à direita.
 *
 * SEM ROLAGEM LATERAL (2026-11-18, pedido do usuário — a fileira rolava de lado):
 *   - computador: os jogos QUEBRAM em mais linhas e a busca fica presa no canto
 *     de cima, alinhada à primeira linha (`items-start`);
 *   - celular: um botão com o filtro atual que abre a lista e fecha ao escolher
 *     (`ServerDropdown`, o mesmo do servidor na página de jogo) — logo + pílula
 *     ocupam uma linha inteira cada, e quebrar viraria uma pilha.
 */
export function BlogFilters({
  games,
  query,
  searchPlaceholder,
}: {
  games: BlogGameRef[];
  query: BlogQuery;
  /** Editável em Painel → Páginas → Blog. */
  searchPlaceholder: string;
}) {
  return (
    <div className="flex flex-col gap-[14px] lg:flex-row lg:items-start lg:justify-between lg:gap-[40px]">
      {games.length > 0 ? (
        <div className="lg:hidden">
          <ServerDropdown
            label="Filtrar posts por jogo"
            options={[
              { key: "__todos", label: ALL_LABEL, href: blogListHref(query, { game: "", page: 1 }), active: !query.game },
              ...games.map((game) => ({
                key: game.slug,
                label: game.name,
                href: blogListHref(query, { game: game.slug, page: 1 }),
                active: game.slug === query.game,
              })),
            ]}
          />
        </div>
      ) : null}
      {games.length > 0 ? (
        <nav
          aria-label="Filtrar posts por jogo"
          className="flex min-w-0 flex-1 flex-wrap items-center gap-[15px] max-lg:hidden"
        >
          <Link
            href={blogListHref(query, { game: "", page: 1 })}
            aria-current={!query.game ? "page" : undefined}
            aria-label="Posts de todos os jogos"
            className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
          >
            <span className={cn(pillClassName(!query.game), "px-[24px] whitespace-nowrap lg:px-[24px]")}>{ALL_LABEL}</span>
          </Link>
          {games.map((game) => {
            const active = game.slug === query.game;
            return (
              <Link
                key={game.slug}
                href={blogListHref(query, { game: active ? "" : game.slug, page: 1 })}
                aria-current={active ? "page" : undefined}
                // Rótulo explícito: sem ele o leitor de tela leria o `alt` da
                // logo e o nome da pílula, o mesmo jogo duas vezes.
                aria-label={active ? `${game.name} (filtro ativo, clique para remover)` : `Posts de ${game.name}`}
                className="group flex shrink-0 items-center gap-[15px] rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
              >
                {/* Teto de 100px e halo a 45%: a logo do ARC Raiders (3,5:1) dominava a
                    fileira e borrava em volta das letras (2026-10-09). */}
                {game.logo ? <LogoHalo src={game.logo} alt="" height={50} maxWidth={100} haloOpacity={0.45} /> : null}
                {/* 170×50 do arquivo (a pílula da página de jogo é 197). */}
                <span
                  className={cn(
                    pillClassName(active),
                    "min-w-[170px] px-[16px] whitespace-nowrap lg:min-w-[170px] lg:px-[16px]",
                  )}
                >
                  {game.name}
                </span>
              </Link>
            );
          })}
        </nav>
      ) : (
        <span />
      )}

      <BlogSearch query={query} placeholder={searchPlaceholder} />
    </div>
  );
}

/**
 * Busca 219×50 com o estilo da busca do cabeçalho. `<form method="get">` de
 * verdade: funciona sem JS, e o jogo escolhido viaja em `hidden` (um GET
 * descarta o que não está no formulário). A página NÃO viaja: busca nova
 * começa na primeira.
 *
 * O arquivo diz "Pesquisar game"; a busca é de posts do blog, então o texto
 * diz isso — "game" prometeria uma busca que esta caixa não faz.
 */
function BlogSearch({ query, placeholder }: { query: BlogQuery; placeholder: string }) {
  return (
    <form action="/blog" method="get" role="search" className="relative h-[50px] w-full shrink-0 lg:w-[219px]">
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
        aria-label={placeholder}
        placeholder={placeholder}
        className="h-[50px] w-full rounded-full border-2 border-[var(--brand-stroke-soft)] bg-[image:var(--brand-surface-fill)] pr-4 pl-[60px] font-helvetica text-[15px] tracking-[0.15px] text-white outline-none transition-colors placeholder:text-brand-placeholder focus:border-brand-orange"
      />
    </form>
  );
}
