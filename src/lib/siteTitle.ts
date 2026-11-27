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

/**
 * Descrição padrão (2026-11-27) — o que o Google mostra de página sem a sua.
 * Traz o que o site antigo usava para ganhar o clique: referências, entrega e
 * forma de pagamento.
 */
export const SITE_DEFAULT_DESCRIPTION =
  "Loja de gamecoins com +1.000 referências: moedas, itens e serviços de jogos com entrega rápida, pagamento via PIX ou cartão e atendimento personalizado.";

/**
 * Prévia padrão do link (1200×630, o logo sobre o fundo da loja; 2026-11-27).
 * Repetida em cada página que declara o próprio `openGraph`: o Next não junta
 * o `openGraph` da página com o do layout — o da página substitui o inteiro.
 */
export const SITE_OG_IMAGE = { url: "/images/og-default.png", width: 1200, height: 630, alt: "Lets4Trade" };

export function withSiteName(phrase: string): string {
  return `${phrase} | ${SITE_TITLE_NAME}`;
}
