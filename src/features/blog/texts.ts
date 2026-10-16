import { getSectionsFor } from "@/features/site/content";

/**
 * Textos FIXOS da página do blog (2026-10-16), editáveis em Painel → Páginas →
 * Blog (sessão `blog:textos`). Os padrões moram no catálogo
 * (`features/site/sections.ts`); campo vazio no painel volta a eles.
 */
export type BlogTexts = {
  pageTitle: string;
  listTitle: string;
  /** Com `{jogo}` — ver `gameListTitle`. */
  gameListTitle: string;
  searchPlaceholder: string;
  back: string;
  related: string;
};

export async function getBlogTexts(): Promise<BlogTexts> {
  const section = (await getSectionsFor("blog"))("textos");
  return {
    pageTitle: section.title,
    listTitle: section.extra("lista", "ÚLTIMOS POSTS"),
    gameListTitle: section.extra("lista-jogo", "POSTS DE {jogo}"),
    searchPlaceholder: section.extra("busca", "Pesquisar no blog"),
    back: section.extra("voltar", "← Voltar ao blog"),
    related: section.extra("mais", "MAIS POSTS"),
  };
}

/**
 * Título da lista com o jogo filtrado. Modelo todo em MAIÚSCULAS (o padrão,
 * como no Figma) põe o nome em maiúsculas; com minúsculas, o nome vai como é.
 * Sem `{jogo}` no texto, o nome entra no fim — o admin não perde a informação.
 */
export function gameListTitle(template: string, gameName: string): string {
  // Sem o marcador: `{jogo}` em minúsculas não conta como "texto em minúsculas".
  const bare = template.replaceAll("{jogo}", "");
  const shouting = bare === bare.toLocaleUpperCase("pt-BR");
  const name = shouting ? gameName.toLocaleUpperCase("pt-BR") : gameName;
  return template.includes("{jogo}") ? template.replaceAll("{jogo}", name).trim() : `${template} ${name}`.trim();
}
