/**
 * Título, descrição e endereço canônico da página de jogo para o GOOGLE.
 *
 * Módulo PURO (sem `fetch`, sem `server-only`) de propósito: o painel importa
 * o título automático para mostrar a prévia do Google ao lado do campo, e a
 * página do jogo usa o mesmo cálculo no `generateMetadata`. Uma regra, dois
 * lugares — a prévia nunca mente sobre o que vai ao ar.
 *
 * ── Por que o admin escreve o título (2026-11-27) ───────────────────────────
 * O site antigo (GreatPages) ranqueava "comprar divine" com a página
 * `/currencypoe`, título "Compre Aqui Divine Orb | + 1.000 Referências". O
 * automático daqui dá "Compre Currencys Path of Exile" — sem a palavra que traz
 * a busca. Sem um campo por aba, a troca de site perderia a posição.
 */

type TabLike = { label: string; layout: string; seoTitle?: string; seoDescription?: string };

/**
 * Frase AUTOMÁTICA do título (2026-11-18, padrão MMOEXP): "Compre Moedas ARC
 * Raiders" — a marca (" | Lets 4 Trade") entra pelo template do layout raiz.
 * Segue a ABA ativa, inclusive a escolhida por `?aba=`, e ignora o título
 * escrito pelo admin na página (H1): aquele é o da página, este é o do Google.
 */
export function buildTabTitle(name: string, tab: Pick<TabLike, "label" | "layout"> | undefined): string {
  if (!tab) return `Compre itens de ${name}`;
  // Aba SELL é a pessoa vendendo para a loja.
  if (tab.layout === "SELL") return `Venda seus itens de ${name}`;
  const label = tab.label.trim();
  const what = label.charAt(0) + label.slice(1).toLocaleLowerCase("pt-BR");
  return `Compre ${what} ${name}`;
}

/**
 * Descrição AUTOMÁTICA (meta `description`, a frase do Google e da prévia do
 * link). Segue a ABA ativa como o título (2026-11-24, pedido do usuário: na aba
 * Itens do ARC ela seguia dizendo "Compre Moedas…").
 *
 * "+1.000 referências" e "PIX ou cartão" vêm do site antigo: é o que fazia a
 * pessoa clicar no resultado (2026-11-27).
 */
export function buildSeoDescription(name: string, tab: Pick<TabLike, "label" | "layout"> | undefined): string {
  return `${buildTabTitle(name, tab)} na Lets4Trade: +1.000 referências, entrega rápida, pagamento via PIX ou cartão e atendimento personalizado.`;
}

/** Título que vai ao ar: o escrito no painel ou o automático. */
export function tabSeoTitle(name: string, tab: TabLike | undefined): string {
  return tab?.seoTitle?.trim() || buildTabTitle(name, tab);
}

/** Descrição que vai ao ar: a escrita no painel ou a automática. */
export function tabSeoDescription(name: string, tab: TabLike | undefined): string {
  return tab?.seoDescription?.trim() || buildSeoDescription(name, tab);
}

/**
 * O título já traz a marca? Então ele vai INTEIRO (`title.absolute`), sem o
 * " | Lets 4 Trade" do template — senão o Google mostraria a marca duas vezes
 * ("… | Lets4Trade | Lets 4 Trade").
 */
export function titleHasBrand(title: string): boolean {
  return /lets\s*4\s*trade/i.test(title);
}
