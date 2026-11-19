/**
 * Título da aba do navegador (2026-11-18, padrão MMOEXP): SEMPRE uma frase de
 * ação seguida da marca — "Compre Moedas ARC Raiders | Lets 4 Trade".
 *
 * A marca entra pelo `title.template` do layout raiz, então as páginas dão só a
 * frase. Duas exceções escrevem o título inteiro com `withSiteName`: a home
 * (o template do layout não vale para a página do MESMO segmento) e os títulos
 * do Open Graph/Twitter (o template só se aplica ao `<title>`).
 */
export const SITE_TITLE_NAME = "Lets 4 Trade";

export const SITE_TITLE_TEMPLATE = `%s | ${SITE_TITLE_NAME}`;

/** Frase da home e fallback de página sem título. */
export const SITE_DEFAULT_PHRASE = "Compre moedas, itens e serviços de jogos";

export function withSiteName(phrase: string): string {
  return `${phrase} | ${SITE_TITLE_NAME}`;
}
