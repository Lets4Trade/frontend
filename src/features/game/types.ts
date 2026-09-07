/**
 * Schema de conteúdo da página de jogo (Figma 1116:314).
 *
 * A REGRA desta tela é que ela seja 100% editável pelo admin. Então nada aqui é
 * texto ou imagem escrita no componente: TUDO que aparece na página — rótulo de
 * aba, nome de servidor, pergunta de FAQ, ordem das seções — é um campo deste
 * schema. Os componentes só sabem desenhar; quem decide o que aparece é o dado.
 *
 * Consequência prática, e é o motivo de a tela NÃO ser posicionada em absoluto
 * como a home: o admin vai escrever textos de tamanhos que o arquivo do Figma
 * não previu. Um título de duas linhas, uma resposta de FAQ com o dobro do
 * comprimento. Coordenada fixa quebraria na primeira edição, então esta página
 * é montada em FLUXO, com os espaçamentos do arquivo.
 *
 * Este arquivo é também o contrato que o backend vai ter que devolver. Ver
 * `content.ts`.
 */

/** Imagem editável. `width`/`height` são as do arquivo original, para o `next/image`. */
export type ImageRef = {
  src: string;
  alt?: string;
  width: number;
  height: number;
};

/** Slide do banner do topo (1715×490 no arquivo). */
export type GameBanner = {
  id: string;
  image: ImageRef;
  /** Para onde o slide leva. Vazio = arte sem ação. */
  href?: string;
};

/** Aba de categoria de serviço: MOEDAS, ITENS, GOLD, BOOSTING… */
export type GameTab = {
  id: string;
  label: string;
  icon: ImageRef;
  /**
   * Camada extra sobre o ícone, com a caixa em porcentagem — o arquivo compõe
   * o ícone de ITENS com dois desenhos sobrepostos. Fica opcional para o admin
   * poder trocar por um ícone único sem mexer em código.
   */
  iconOverlay?: { src: string; inset: string; flip?: boolean };
  href: string;
};

/** Servidor / liga do jogo. */
export type GameServer = {
  id: string;
  label: string;
};

/** Categoria de produto, marcável no painel "Selecionar categoria". */
export type GameCategory = {
  id: string;
  label: string;
};

export type GameProduct = {
  id: string;
  name: string;
  /** Em centavos: dinheiro não passa por `float`. */
  priceCents: number;
  image?: ImageRef;
  serverId: string;
  categoryId: string;
  /** A aba em que o produto aparece. */
  tabId: string;
};

export type GameReference = {
  id: string;
  author: string;
  avatar?: ImageRef;
  /** 0 a 5. O arquivo desenha cinco caixinhas; as vazias ficam sem estrela. */
  rating: number;
  body: string;
};

export type GameNewsItem = {
  id: string;
  title: string;
  excerpt: string;
  image?: ImageRef;
  avatar?: ImageRef;
  tag: string;
  date: string;
  href?: string;
};

export type FaqGroup = {
  id: string;
  title: string;
  items: { id: string; question: string; answer: string }[];
};

/**
 * As seções que o admin pode reordenar ou esconder. A identidade (logo, título,
 * abas) e o catálogo não entram: sem eles não existe página de jogo.
 */
export type GameSectionKey = "banner" | "references" | "news" | "faq";

export type GamePage = {
  slug: string;
  /** Nome do jogo, usado em `<title>` e nos textos que o admin não escreveu. */
  name: string;
  seo: { title: string; description: string };

  banners: GameBanner[];

  identity: {
    logo: ImageRef;
    /** "Compre Moedas De Path Of Exile 2" — o admin escreve inteiro. */
    heading: string;
    /** A moeda "4" à direita das abas. Opcional: nem todo jogo precisa dela. */
    coin?: ImageRef & { href?: string };
  };

  tabs: GameTab[];
  /** Qual aba está ativa nesta página. */
  activeTabId: string;

  servers: { label: string; items: GameServer[] };
  categories: { label: string; items: GameCategory[] };

  catalog: {
    /** Quantos cards por página. O arquivo desenha 6×4. */
    pageSize: number;
    products: GameProduct[];
  };

  references: {
    title: string;
    ctaLabel: string;
    ctaHref: string;
    items: GameReference[];
  };

  news: { title: string; items: GameNewsItem[] };
  faq: FaqGroup[];

  /** Ordem e visibilidade das seções opcionais. */
  sections: GameSectionKey[];
};
