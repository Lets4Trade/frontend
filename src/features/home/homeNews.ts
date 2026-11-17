import { getLatestNews } from "@/features/blog/data";
import type { BlogCardView } from "@/features/blog/types";
import { getSectionItemsFor, type SectionItemView } from "@/features/site/content";

/**
 * Notícias da home (2026-11-17, pedido do usuário): a seção "guias" deixou de
 * ter cards cadastrados à mão e mostra SOZINHA os 4 posts mais recentes do
 * blog, de todos os jogos (o filtro "Todos"). Post novo publicado = home
 * atualizada, sem ninguém trocar card.
 *
 * Os posts entram no MESMO formato dos itens da sessão (`SectionItemView`), e
 * por isso o desenho dos cards (desktop e celular) não muda. O id começa com
 * `blog:` — é como os cards sabem que o item não é editável no editor da home.
 */
export const HOME_NEWS_SECTION = "guias";
const HOME_NEWS_LIMIT = 4;

export function isAutoNewsItem(item: Pick<SectionItemView, "id">): boolean {
  return item.id.startsWith("blog:");
}

export function newsToSectionItem(post: BlogCardView): SectionItemView {
  return {
    id: `blog:${post.slug}`,
    title: post.title,
    body: post.excerpt,
    image: post.cover ?? undefined,
    secondaryImage: post.game?.logo ?? undefined,
    href: post.href,
    createdAt: post.publishedAt,
  };
}

/** Os itens da sessão com as notícias no lugar dos cards manuais de "guias". */
export function withHomeNews(
  items: (key: string) => SectionItemView[],
  news: BlogCardView[],
): (key: string) => SectionItemView[] {
  const newsItems = news.map(newsToSectionItem);
  return (key) => (key === HOME_NEWS_SECTION ? newsItems : items(key));
}

/** `getSectionItemsFor("home")` já com as notícias — as duas leituras em paralelo. */
export async function getHomeItems(): Promise<(key: string) => SectionItemView[]> {
  const [items, news] = await Promise.all([getSectionItemsFor("home"), getLatestNews(HOME_NEWS_LIMIT)]);
  return withHomeNews(items, news);
}
