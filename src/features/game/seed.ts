import { REVIEWS } from "@/features/home/reviews";
import type {
  FaqGroup,
  GameCategory,
  GameNewsItem,
  GamePage,
  GameProduct,
  GameReference,
  GameTab,
} from "./types";

/**
 * Conteúdo SEMENTE da página de jogo — o que o Figma 1116:314 desenha.
 *
 * Isto não é a fonte de verdade final: é o que a tela mostra enquanto o backend
 * não expõe a página. A fronteira é `getGamePage()` em `content.ts`; quando o
 * endpoint existir, este arquivo vira só o conteúdo inicial de um jogo novo.
 *
 * O arquivo do Figma desenha a página de **Path of Exile 2** e nada além dela.
 * Os outros quatro jogos da home ganham a MESMA estrutura com o texto de
 * marcador — não inventei liga, categoria nem FAQ de jogo que o arquivo não
 * especifica. Quem preenche é o admin.
 */

/** Abas de serviço (Figma 1524:401). Os ícones vieram do arquivo. */
function tabsFor(slug: string): GameTab[] {
  const icon = (file: string) => ({
    src: `/icons/game/${file}`,
    width: 50,
    height: 50,
  });
  return [
    {
      id: "moedas",
      label: "MOEDAS",
      icon: icon("tab-moedas.svg"),
      href: `/games/${slug}`,
    },
    {
      id: "itens",
      label: "ITENS",
      icon: icon("tab-itens-base.svg"),
      // O arquivo compõe o ícone de ITENS com dois desenhos sobrepostos.
      iconOverlay: {
        src: "/icons/game/tab-itens-mark.svg",
        inset: "21.21% 41.49% 48.48% 40.77%",
        flip: true,
      },
      href: `/games/${slug}?aba=itens`,
    },
    {
      id: "gold",
      label: "GOLD",
      icon: icon("tab-gold.svg"),
      href: `/games/${slug}?aba=gold`,
    },
    {
      id: "builds",
      label: "BUILDS",
      icon: icon("tab-builds.svg"),
      href: `/games/${slug}?aba=builds`,
    },
    {
      id: "boosting",
      label: "BOOSTING",
      icon: icon("tab-boosting.svg"),
      href: `/games/${slug}?aba=boosting`,
    },
    {
      id: "carry",
      label: "CARRY",
      icon: icon("tab-carry.svg"),
      href: `/games/${slug}?aba=carry`,
    },
    {
      id: "mentoria",
      label: "MENTORIA",
      icon: icon("tab-mentoria.svg"),
      href: `/games/${slug}?aba=mentoria`,
    },
    {
      id: "venda",
      label: "VENDA PRA NÓS",
      icon: icon("tab-venda.svg"),
      href: "/venda",
    },
    {
      id: "fidelidade",
      label: "FIDELIDADE",
      icon: icon("tab-fidelidade.svg"),
      href: "/fidelidade",
    },
  ];
}

/**
 * O painel do arquivo tem catorze pílulas escritas "Nome da categoria" — é
 * marcador, não conteúdo. Mantive a contagem para a caixa fechar na altura
 * desenhada (243px, três linhas) e numerei para dar para distinguir uma da
 * outra enquanto o admin não nomeia.
 */
const SEED_CATEGORIES: GameCategory[] = Array.from({ length: 14 }, (_, i) => ({
  id: `categoria-${i + 1}`,
  label: `Nome da categoria ${i + 1}`,
}));

/**
 * O arquivo desenha 24 cards (6×4) e QUATRO páginas de paginação — ou seja, 96
 * produtos. Eles são distribuídos entre os servidores e as categorias de
 * propósito: com tudo igual, filtro e ordenação existiriam sem nunca mudar
 * nada na tela, e um defeito neles passaria despercebido até o backend chegar.
 *
 * O nome e o preço variam pelo mesmo motivo — o arquivo escreve "Product Name"
 * e "R$ 25,00" em todos os cards, mas isso é marcador, não conteúdo.
 */
function seedProducts(servers: { id: string }[]): GameProduct[] {
  // 96 POR SERVIDOR, e não 96 no total: a paginação é do servidor escolhido, e
  // só assim cada um deles tem as quatro páginas que o arquivo desenha.
  return servers.flatMap((server) =>
    Array.from({ length: 96 }, (_, i) => ({
      id: `${server.id}-produto-${i + 1}`,
      name: `Product Name ${String(i + 1).padStart(2, "0")}`,
      priceCents: 1500 + (i % 12) * 2000,
      serverId: server.id,
      categoryId: SEED_CATEGORIES[i % SEED_CATEGORIES.length].id,
      tabId: "moedas",
    })),
  );
}

/**
 * As referências reaproveitam os depoimentos da home — são os mesmos clientes,
 * e o arquivo mostra o card do MACHIDA nas quatro posições. Cinco estrelas em
 * todos, como no desenho.
 */
const SEED_REFERENCES: GameReference[] = REVIEWS.slice(0, 4).map((review) => ({
  id: review.name.toLowerCase(),
  author: review.name,
  avatar: { src: review.avatar, width: 42, height: 42, alt: "" },
  rating: 5,
  body: review.body,
}));

/** As notícias do arquivo são lorem ipsum com a tag do jogo. */
function seedNews(tag: string): GameNewsItem[] {
  return Array.from({ length: 4 }, (_, i) => ({
    id: `noticia-${i + 1}`,
    title: "TITTLE NAME",
    excerpt:
      "There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected...",
    avatar: { src: "/images/game/avatar-seed.png", width: 45, height: 45, alt: "" },
    tag,
    date: "17/03/26",
  }));
}

/** "Dúvidas frequentes" (1524:448) — este grupo não é específico de jogo. */
const FAQ_GERAL: FaqGroup = {
  id: "duvidas-frequentes",
  title: "Dúvidas frequentes",
  items: [
    {
      id: "como-comprar",
      question: "Como faço pra comprar?",
      answer:
        "Clicando em qualquer um dos nossos pedidos você será automaticamente direcionado para nosso Whatsapp, toda a venda de Divines, Exalted e Mirror e feita diretamente por lá, desse jeito conseguimos proporcionar a melhor experiência e já tirar todas as dúvidas envolvidas.",
    },
    {
      id: "entrega",
      question: "Como é realizada a entrega?",
      answer:
        "A entrega das Chaos, Exalted e Mirror é feita pelo próprio site de trade do jogo onde pedimos para que você coloque um item raro amarelo a venda, nos informe o nome da sua conta, e com essas informações vamos encontrar seu item e realizar a compra.",
    },
    {
      id: "confianca",
      question: "O site é de confiança?",
      answer:
        "Sim, e você pode atestar isso com seus próprios olhos, um pouco mais abaixo existe um vídeo no meu canal do youtube pessoal onde me apresento e coleto referências de clientes já existem mais de 500 Referências de clientes diferentes e quase todos os dias aparecem referências novas.",
    },
    {
      id: "risco",
      question: "Existe algum tipo de risco pra minha conta na compra?",
      answer:
        "A venda de Chaos Orbs e Exalted Orbs é uma pratica mal vista pela produtora do jogo, trabalho com Path of Exile a muitos anos e com larga escala a 3 anos, nunca tive reclamações por parte de clientes, mas sim o risco existe.",
    },
    {
      id: "cartao",
      question: "Vocês aceitam pagamento por cartão de crédito?",
      answer:
        "Sim trabalhamos em parceria com o Mercado pago e todas as compras podem ser feitas com cartão de credito.",
    },
  ],
};

/** "Dúvidas sobre Orbs" (1524:433) — só faz sentido em Path of Exile. */
const FAQ_ORBS: FaqGroup = {
  id: "duvidas-orbs",
  title: "Dúvidas sobre Orbs",
  items: [
    {
      id: "como-funcionam",
      question: "Como os Divine Orbs funcionam PoE?",
      answer:
        "Divine Orbs é moeda, o que é útil para obter os modificadores específicos para o seu equipamento. Você pode rolar novamente os valores de modificadores em equipamentos raros usando Divine Orbs. Como os modificadores são aleatórios, às vezes fica difícil obter os modificadores de que você precisa, então você precisará de muitos desses orbes. Lembre-se de que eles têm a mesma chance baixa de dropar como os Exalted Orbs.",
    },
    {
      id: "exalted-vendedor",
      question: "Como você consegue o Exalted Orb do Path of Exile 2 de um vendedor?",
      answer:
        "Na nova liga, os desenvolvedores excluíram o recibo onde você poderia obtê-lo vendendo um item de seis links para um fornecedor. Divine Orb PoE pode ser saqueado por mobs, baús e contêineres destrutíveis. Por enquanto, você pode comprar Divine Orbs aqui.",
    },
    {
      id: "quanto-vale",
      question: "Quanto vale um Divine Orb PoE 2?",
      answer:
        "A taxa de mercado atual para Divine Orbs é de cerca de 4 Exalteds Orbs por Divine Orb. A taxa de drop de Divine Orbs é de cerca de 0,055%. Você precisa de MUITOS Divine Orbs, especialmente se quiser criar a construção desejada rapidamente. Então compre aqui, temos PoE Divine Orb com o preço mais baixo possível.",
    },
    {
      id: "como-obter",
      question: "Como obter Divine Orbs no PoE 2?",
      answer:
        "A obtenção de Orbes Divinos são itens monetários extremamente raros que podem ser descartados por monstros mortos, baús e contêineres destrutíveis. Eles também caem dos cofres do Arcanista.",
    },
  ],
};

/**
 * Logo do jogo. O arquivo desenha a caixa em 199,435 × 163,82; cada logo entra
 * ajustado DENTRO dela preservando a proporção, senão o do Diablo (que é o mais
 * largo) sairia esticado.
 */
const LOGO_BOX = { width: 199.435, height: 163.82 };

function fitLogo(src: string, width: number, height: number) {
  const scale = Math.min(LOGO_BOX.width / width, LOGO_BOX.height / height);
  return {
    src,
    alt: "",
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

type GameSeed = {
  slug: string;
  name: string;
  heading: string;
  tag: string;
  logo: { src: string; width: number; height: number };
  servers: { id: string; label: string }[];
  faq: FaqGroup[];
};

/** Os cinco jogos que a home linka. As proporções dos logos vêm de `heroGames`. */
const GAMES: GameSeed[] = [
  {
    slug: "path-of-exile-2",
    name: "Path of Exile 2",
    heading: "Compre Moedas De Path Of Exile 2",
    tag: "POE 2",
    logo: { src: "/images/games/logo-2.png", width: 142.436, height: 117 },
    servers: [
      { id: "fate-of-the-vaal-sc", label: "Fate of the Vaal SC" },
      { id: "fate-of-the-vaal-hc", label: "Fate of the Vaal HC" },
      { id: "standard", label: "Standard" },
      { id: "hardcore", label: "Hardcore" },
    ],
    faq: [FAQ_ORBS, FAQ_GERAL],
  },
  {
    slug: "path-of-exile",
    name: "Path of Exile",
    heading: "Compre Moedas De Path Of Exile",
    tag: "POE",
    logo: { src: "/images/games/logo-3.png", width: 138.667, height: 104 },
    servers: [{ id: "padrao", label: "Padrão" }],
    faq: [FAQ_ORBS, FAQ_GERAL],
  },
  {
    slug: "diablo",
    name: "Diablo",
    heading: "Compre Moedas De Diablo",
    tag: "DIABLO",
    logo: { src: "/images/games/logo-1.png", width: 218.23, height: 91 },
    servers: [{ id: "padrao", label: "Padrão" }],
    faq: [FAQ_GERAL],
  },
  {
    slug: "last-epoch",
    name: "Last Epoch",
    heading: "Compre Moedas De Last Epoch",
    tag: "LAST EPOCH",
    logo: { src: "/images/games/logo-4.png", width: 171.409, height: 106 },
    servers: [{ id: "padrao", label: "Padrão" }],
    faq: [FAQ_GERAL],
  },
  {
    slug: "arc-raiders",
    name: "ARC Raiders",
    heading: "Compre Moedas De ARC Raiders",
    tag: "ARC RAIDERS",
    logo: { src: "/images/games/logo-5.png", width: 152.375, height: 53 },
    servers: [{ id: "padrao", label: "Padrão" }],
    faq: [FAQ_GERAL],
  },
];

function buildPage(game: GameSeed): GamePage {
  return {
    slug: game.slug,
    name: game.name,
    seo: {
      title: `${game.name} — Lets4Trade`,
      description: `${game.heading} na Lets4Trade: entrega rápida, suporte e preço justo.`,
    },

    // O arquivo desenha um retângulo cinza no lugar do banner: é espaço
    // reservado, não arte. Fica vazio até o admin subir a imagem — e a seção
    // some sozinha em vez de mostrar um bloco cinza em produção.
    banners: [],

    identity: {
      logo: fitLogo(game.logo.src, game.logo.width, game.logo.height),
      heading: game.heading,
      coin: {
        src: "/images/home/emblema-4.png",
        alt: "",
        width: 179,
        height: 179,
        href: "/fidelidade",
      },
    },

    tabs: tabsFor(game.slug),
    activeTabId: "moedas",

    servers: { label: "Selecionar servidor", items: game.servers },
    categories: { label: "Selecionar categoria", items: SEED_CATEGORIES },

    catalog: { pageSize: 24, products: seedProducts(game.servers) },

    references: {
      title: "REFERÊNCIAS",
      ctaLabel: "VEJA NOSSAS REFERÊNCIAS",
      ctaHref: "/#reviews",
      items: SEED_REFERENCES,
    },

    news: { title: "NOTÍCIAS", items: seedNews(game.tag) },
    faq: game.faq,

    sections: ["banner", "references", "news", "faq"],
  };
}

export const GAME_PAGE_SEED: Record<string, GamePage> = Object.fromEntries(
  GAMES.map((game) => [game.slug, buildPage(game)]),
);
