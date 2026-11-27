import type { MetadataRoute } from "next";
import { getBlogList } from "@/features/blog/data";
import { tabsFromApi, type ApiGameTab } from "@/features/game/storefrontTabs";
import { gameHref } from "@/features/game/href";
import { getMenuGames } from "@/features/game/menuGames";
import { publicApiGet } from "@/lib/publicApi";
import { absoluteUrl } from "@/lib/structuredData";

/**
 * `/sitemap.xml` (2026-11-27, troca do site antigo): a lista de endereços que o
 * Google deve conhecer — home, cada ABA de cada jogo (cada uma é uma página
 * para o buscador desde o canonical por aba), o blog e as páginas fixas.
 *
 * ── Custo ───────────────────────────────────────────────────────────────────
 * Lê o jogo inteiro (abas) de cada jogo — N leituras, uma por jogo. Por isso
 * tudo aqui é cacheado por 1 hora (`revalidate`), inclusive a leitura do jogo,
 * que na página é `no-store` por causa do preço: o sitemap só usa slug e aba,
 * nunca preço. Robô pedindo o sitemap em rajada não chega ao backend.
 *
 * Falha de leitura (backend fora) não derruba o arquivo: sai o que deu para
 * montar — no pior caso, as páginas fixas. Um sitemap curto por uma hora é
 * melhor que um 500, que o Search Console marcaria como erro.
 */

const REVALIDATE_SECONDS = 3600;
/** Teto de páginas do blog lidas (10 por página) — 300 matérias. */
const MAX_BLOG_PAGES = 30;

export const revalidate = 3600;

type RawGamePage = { slug: string; tabs?: ApiGameTab[] };

async function gameEntries(): Promise<MetadataRoute.Sitemap> {
  const games = await getMenuGames();
  const pages = await Promise.all(
    games.map((game) =>
      publicApiGet<RawGamePage>(`/games/${encodeURIComponent(game.slug)}`, { revalidate: REVALIDATE_SECONDS }),
    ),
  );

  return games.flatMap((game, index) => {
    const raw = pages[index];
    const tabs = tabsFromApi(game.slug, Array.isArray(raw?.tabs) ? raw.tabs : []).filter(
      (tab) => tab.layout !== "LINK",
    );
    // Sem aba (ou jogo que falhou na leitura): ao menos a raiz do jogo.
    const paths = tabs.length > 0 ? tabs.map((tab) => tab.href) : [gameHref(game.slug)];
    return paths.map((path, position) => ({
      url: absoluteUrl(path),
      changeFrequency: "daily" as const,
      // A aba padrão (a raiz do jogo) é a mais importante do jogo.
      priority: position === 0 ? 0.9 : 0.8,
    }));
  });
}

async function blogEntries(): Promise<MetadataRoute.Sitemap> {
  const first = await getBlogList({ game: "", search: "", page: 1 });
  if (!first) return [];
  const pageCount = Math.min(first.pageCount, MAX_BLOG_PAGES);
  const rest = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) => getBlogList({ game: "", search: "", page: index + 2 })),
  );
  return [first, ...rest].flatMap((list) =>
    (list?.items ?? []).map((post) => ({
      url: absoluteUrl(post.href),
      ...(post.publishedAt && !Number.isNaN(Date.parse(post.publishedAt))
        ? { lastModified: new Date(post.publishedAt) }
        : {}),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [games, blog] = await Promise.all([gameEntries(), blogEntries()]);

  return [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    ...games,
    { url: absoluteUrl("/blog"), changeFrequency: "daily", priority: 0.7 },
    ...blog,
    { url: absoluteUrl("/fidelidade"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/venda"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/termos"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/politica-de-privacidade"), changeFrequency: "yearly", priority: 0.2 },
  ];
}
