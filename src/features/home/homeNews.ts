import { getLatestNews } from "@/features/blog/data";
import { formatBlogDate } from "@/features/blog/format";
import type { GameNewsItem } from "@/features/game/types";
import type { BlogCardView } from "@/features/blog/types";
import { getSectionItemsFor, type SectionItemView } from "@/features/site/content";

/**
 * Notícias da home (2026-11-17, pedido do usuário): a seção "guias" deixou de
 * ter cards cadastrados à mão e mostra SOZINHA os 4 posts mais recentes do
 * blog, de todos os jogos (de 2026-11-22 a 23 eram só as "Todos os jogos";
 * desfeito a pedido do usuário).
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

/**
 * Item da seção → card de notícia DA PÁGINA DE JOGO (2026-11-22, pedido do
 * usuário: "as notícias da home têm que ficar iguais às de dentro dos jogos").
 * Capa 16:9 inteira em cima, logo do jogo no canto, título/resumo/data
 * embaixo. Sem tag: o logo no canto da capa já diz de que jogo é.
 */
export function sectionItemToNews(item: SectionItemView): GameNewsItem {
  return {
    id: item.id,
    title: item.title ?? "",
    excerpt: item.body ?? "",
    ...(item.image ? { image: { src: item.image, width: 1280, height: 720, alt: "" } } : {}),
    ...(item.secondaryImage ? { logo: item.secondaryImage } : {}),
    tag: "",
    date: formatBlogDate(item.createdAt),
    ...(item.href ? { href: item.href } : {}),
  };
}
