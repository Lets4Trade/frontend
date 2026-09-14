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
 * ── O que já vem do BANCO e o que ainda não ────────────────────────────────
 * Desde 2026-09-10 a identidade (nome, arte), as abas e os servidores são LIDOS
 * do backend, e o catálogo vem de uma chamada própria e paginada. O que
 * continua vindo do conteúdo semente é o material editorial — banners,
 * referências, notícias e FAQ —, porque não existe model nem tela de edição
 * para ele. Ver `content.ts`, que é a única fronteira de dados desta página.
 */

import type { GameSectionKey } from "./sections";

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

/**
 * Servidor / liga do jogo.
 *
 * A identidade é o SLUG, e não o id do banco: o servidor escolhido viaja na URL
 * pública (`?servidor=fate-of-the-vaal-sc`), que é compartilhada, entra no
 * histórico do navegador e é indexada. Um cuid ali não serviria a ninguém.
 */
export type GameServer = {
  slug: string;
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
  /** Ausente quando o produto não tem servidor cadastrado. */
  serverSlug?: string;
  serverLabel?: string;
  /** Ausente enquanto o produto não foi classificado numa categoria. */
  categorySlug?: string;
  categoryLabel?: string;
  /** A aba em que o produto aparece — derivada do `productType` do backend. */
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
 * As seções da página. TODAS reordenam e todas podem ser escondidas — ver
 * `sections.ts`, que é onde elas ganham rótulo, ordem padrão e espaçamento.
 *
 * Até 2026-09-10 só quatro entravam aqui, com a justificativa de que "sem a
 * identidade e o catálogo não existe página de jogo". Isso confundia "não pode
 * SUMIR" com "não pode MUDAR DE LUGAR": quem monta a página pode querer a grade
 * de produtos acima do banner, e nada nisso ameaça a página.
 */
export type { GameSectionKey };

export type GamePage = {
  slug: string;
  /** Nome do jogo, usado em `<title>` e nos textos que o admin não escreveu. */
  name: string;
  seo: { title: string; description: string };

  banners: GameBanner[];

  identity: {
    /**
     * Arte do jogo. Opcional: o cadastro do painel permite criar o jogo antes
     * de ter a arte pronta, e a página não pode depender dela para existir.
     *
     * Sem `width`/`height` de propósito — a arte é subida pelo admin e não tem
     * proporção conhecida. A caixa é fixa (199,435 × 163,82 no arquivo) e a
     * imagem entra dentro dela por `object-contain`, que é o que impede um logo
     * largo de sair esticado.
     */
    logo?: { src: string; alt?: string };
    /** "Compre Moedas De Path Of Exile 2" — já resolvido, custom ou derivado. */
    heading: string;
    /**
     * O que o ADMIN escreveu no builder, quando escreveu algo.
     *
     * Existe separado do `heading` porque os dois se comportam diferente ao
     * trocar de aba: o derivado acompanha a aba ("Compre Gold De…" vira "Compre
     * Itens De…"), e o escrito à mão NÃO — ele é o título da página, não o da
     * aba. Sem esta distinção, `withActiveTab` apagava o título personalizado no
     * primeiro clique numa aba.
     */
    customHeading?: string;
    /** A moeda "4" à direita das abas. Opcional: nem todo jogo precisa dela. */
    coin?: ImageRef & { href?: string };
  };

  tabs: GameTab[];
  /** Qual aba está ativa nesta página. */
  activeTabId: string;

  servers: { label: string; items: GameServer[] };
  categories: { label: string; items: GameCategory[] };

  /**
   * Quantos cards por página. O arquivo desenha 6×4.
   *
   * Os PRODUTOS não moram mais aqui: eles vêm de `getCatalog()`, numa chamada
   * própria que já chega filtrada, ordenada e paginada pelo banco. Carregá-los
   * junto da página obrigaria a refazer a identidade inteira a cada clique de
   * filtro — e, antes disso, a trazer o catálogo completo para a memória do
   * servidor só para descartar quase tudo.
   */
  catalog: { pageSize: number };

  /**
   * Texto do pé da página, escrito no builder (etapa 9). Ausente = o admin não
   * escreveu nenhum, e a seção não aparece.
   */
  description?: string;

  references: {
    title: string;
    ctaLabel: string;
    ctaHref: string;
    items: GameReference[];
  };

  news: { title: string; items: GameNewsItem[] };
  faq: FaqGroup[];

  /** Os blocos VISÍVEIS, do topo para o rodapé. Ausente da lista = escondido. */
  sections: GameSectionKey[];
};
