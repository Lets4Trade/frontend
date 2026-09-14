import type {
  GameBanner,
  GameNewsItem,
  GameReference,
  ImageRef,
} from "./types";

/**
 * Conteúdo EDITORIAL da página de jogo — banners, referências e notícias.
 *
 * ── O que este arquivo era, e o que sobrou dele ────────────────────────────
 * Até 2026-09-10 ele era a página inteira: identidade, abas, servidores e 96
 * produtos por servidor, para cinco jogos escritos à mão. A vitrine passou a
 * ler o banco, e tudo o que o painel sabe cadastrar saiu daqui.
 *
 * Sobrou exatamente o que NÃO tem model no backend nem tela de edição. Não é
 * dívida disfarçada: é a lista, num lugar só, do que falta o admin poder
 * editar. Quando cada um desses ganhar model e tela, sai daqui e o arquivo
 * desaparece.
 *
 * ── Por que não é por jogo ─────────────────────────────────────────────────
 * Quase nada aqui é específico de um jogo, e o que era virou marcador no
 * próprio arquivo do Figma (as notícias são lorem ipsum, as referências
 * repetem o mesmo card quatro vezes). Chavear por slug faria a página de um
 * jogo novo, cadastrado pelo painel, nascer sem FAQ e sem referências — pior
 * que nascer com o conteúdo genérico.
 *
 * O FAQ saiu daqui em 2026-09-14: virou as listas `games:duvidas` e
 * `games:duvidas-orbs`, editáveis em "Edição de sessões".
 */

export type GameEditorial = {
  banners: GameBanner[];
  coin?: ImageRef & { href?: string };
  references: {
    title: string;
    ctaLabel: string;
    ctaHref: string;
    items: GameReference[];
  };
  news: { title: string; items: GameNewsItem[] };
};

/**
 * As referências saíram daqui.
 *
 * Reaproveitavam os depoimentos da home (`REVIEWS.slice(0, 4)`) — são os mesmos
 * clientes, e o arquivo mostra o card do MACHIDA nas quatro posições. Agora
 * ambos vêm do banco: a home por `home:reviews`, a página de jogo por
 * `games:referencias`, cada uma com a própria lista editável no painel.
 *
 * A lista vazia aqui é a queda quando o banco não responde — o bloco some, em
 * vez de a página inteira falhar.
 */
const REFERENCES: GameReference[] = [];

/** As notícias do arquivo são lorem ipsum com a tag do jogo. */
function newsFor(tag: string): GameNewsItem[] {
  return Array.from({ length: 4 }, (_, i) => ({
    id: `noticia-${i + 1}`,
    title: "TITTLE NAME",
    excerpt:
      "There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected...",
    avatar: {
      src: "/images/game/avatar-seed.png",
      width: 45,
      height: 45,
      alt: "",
    },
    tag,
    date: "17/03/26",
  }));
}

/**
 * O material editorial de um jogo.
 *
 * Recebe o slug e o nome porque é tudo de que ele precisa saber do banco — e
 * porque assim um jogo que ninguém previu (cadastrado hoje pelo painel) sai
 * daqui com página completa, não com buracos.
 */
export function getEditorial(slug: string, name: string): GameEditorial {
  return {
    // O arquivo desenha um retângulo cinza no lugar do banner: é espaço
    // reservado, não arte. Fica vazio até existir tela para subir a imagem — e
    // a seção some sozinha em vez de mostrar um bloco cinza em produção.
    banners: [],

    coin: {
      src: "/images/home/emblema-4.png",
      alt: "",
      width: 179,
      height: 179,
      href: "/fidelidade",
    },

    references: {
      title: "REFERÊNCIAS",
      ctaLabel: "VEJA NOSSAS REFERÊNCIAS",
      ctaHref: "/#reviews",
      items: REFERENCES,
    },

    // A tag da notícia é o nome do jogo em caixa alta, como o arquivo desenha
    // ("POE 2"). Derivada e não escrita: jogo novo já nasce com a dele.
    news: {
      title: "NOTÍCIAS",
      items: newsFor(name.toLocaleUpperCase("pt-BR")),
    },
  };
}
