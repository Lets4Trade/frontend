/**
 * Notícias (blog) como a LOJA as desenha — contrato `.claude/context/blog.md`.
 *
 * Tipos de VISÃO, não os da API: as URLs de arte já chegam absolutas (o backend
 * guarda `/uploads/blog/x.webp`, que servido pelo Next daria 404) e a data já
 * vem formatada. Converter na fronteira de dados (`data.ts`) é o que evita
 * lembrar disso em cada componente — foi esquecer que deixou logos quebradas
 * em outras telas.
 */

export type BlogGameRef = {
  slug: string;
  name: string;
  /** Logo do jogo em URL absoluta; `null` = jogo sem arte (círculo cinza). */
  logo: string | null;
};

export type BlogCardView = {
  slug: string;
  title: string;
  excerpt: string;
  /** Capa em URL absoluta; `null` = sem capa (o card desenha a caixa vazia). */
  cover: string | null;
  /** ISO do backend — para `<time dateTime>`, JSON-LD e OG. */
  publishedAt: string;
  /** "17/04/26" (dd/mm/aa), como o Figma. Vazio se a data não for legível. */
  date: string;
  game: BlogGameRef | null;
  href: string;
};

export type BlogArticleView = BlogCardView & {
  /** Markdown RESTRITO — renderizado por `features/pages/blocks/markdown.tsx`. */
  body: string;
  related: BlogCardView[];
};

export type BlogListView = {
  items: BlogCardView[];
  total: number;
  page: number;
  pageCount: number;
};
