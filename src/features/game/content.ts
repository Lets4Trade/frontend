import { backendAsset, publicApiGet } from "@/lib/publicApi";
import { getGameNews } from "@/features/blog/data";
import { blogCardTexts, gameBlogHref } from "@/features/home/blogCard";
import type { BlogCardView } from "@/features/blog/types";
import type { CatalogQuery, CatalogResult } from "./catalog";
import { ORBS_GAMES, resolveSectionOrder } from "./sections";
import { getEditorial } from "./seed";
import { getSectionItemsFor, getSectionsFor } from "@/features/site/content";
import {
  defaultTabId,
  parseServiceContent,
  readHighlights,
  readPricing,
  tabsFromApi,
  toGameCategories,
  type ApiCategory,
  type ApiGameTab,
} from "./storefrontTabs";
import { toGameDescription } from "./description";
import { FAQ_DESCRIPTION_GROUP } from "./types";
import type { GameNewsItem, GamePage, GameProduct } from "./types";

/**
 * Os jogos em que o grupo "Dúvidas sobre Orbs" aparece, ACIMA do geral.
 *
 * Continua no código, e não num campo do jogo, porque é uma regra do
 * CONTEÚDO — Orbs só existem em Path of Exile — e não algo que o admin mude de
 * um dia para o outro. Jogo novo de PoE entra aqui junto com o slug.
 */

/**
 * A ÚNICA fronteira de dados da página de jogo.
 *
 * Desde 2026-09-10 ela lê o BANCO. Antes devolvia o conteúdo semente de
 * `seed.ts` inteiro — e enquanto foi assim, o preço do checkout era calculado
 * a partir de um arquivo do frontend, porque o backend não tinha catálogo
 * contra o que conferir nada.
 *
 * ── O que vem de onde ──────────────────────────────────────────────────────
 *   BANCO       identidade (nome, arte), abas, servidores e o catálogo
 *   SEMENTE     banners, referências, notícias, FAQ e a moeda de fidelidade
 *
 * A divisão não é arbitrária: é exatamente a linha entre o que o painel já sabe
 * cadastrar e o que ele ainda não sabe. Nenhum desses quatro tem model no
 * backend nem tela de edição — inventar um endpoint para servi-los seria criar
 * uma API que só o `seed.ts` sabe preencher.
 *
 * ── Duas chamadas, não uma ─────────────────────────────────────────────────
 * A identidade e o catálogo são buscas separadas de propósito. A identidade
 * muda quase nunca; o catálogo muda a cada clique de filtro. Juntá-las
 * obrigaria a refazer as duas a cada paginação, e a página de jogo é a mais
 * navegada da loja.
 */

/** O que `GET /api/v1/games/:slug` devolve. */
type StorefrontGame = {
  id: string;
  slug: string;
  name: string;
  /** Ausente quando o jogo foi cadastrado sem arte — ver a nota sobre nulos. */
  imageUrl?: string | null;
  /**
   * Abas do banco (ativas, por posição) — contrato game-tabs, 2026-09-28. A
   * ÚNICA fonte das abas desde a FASE 5; ausente (o backend apaga lista nula)
   * = jogo sem aba ativa.
   */
  tabs?: ApiGameTab[] | null;
  servers: { slug: string; label: string }[];
  /**
   * Árvore de dois níveis (contrato C da FASE 4): raízes com `children` OU lista
   * plana com `parentId` — `toCategoryTree` resolve as duas.
   */
  categories: StorefrontCategory[];
  banners: { id: string; imageUrl: string; href?: string | null }[];
  /**
   * Personalização do Builder de Páginas. Ausentes = "não personalizado", e a
   * página cai no valor derivado — não em texto em branco. Ver o `Game` no
   * schema do backend.
   */
  heading?: string | null;
  serversLabel?: string | null;
  categoriesLabel?: string | null;
  /** JSON no banco: lido por `toGameDescription`, que não confia no formato. */
  descriptionGroups?: unknown;
  /** Blocos visíveis, na ordem. Vazio = não personalizado. */
  sectionOrder?: string[] | null;
};

/** Com `serverSlug`/`tabSlug` desde as abas por jogo (nulo = vale para todos). */
type StorefrontCategory = ApiCategory;

/** O que `GET /api/v1/games/:slug/products` devolve. */
type StorefrontProductPage = {
  items: {
    id: string;
    name: string;
    nameEn?: string | null;
    priceCents: number;
    tabSlug?: string | null;
    /** Regra efetiva em aba cotada (`effectivePricing`); nulo/ausente fora dela. */
    pricing?: unknown;
    /** Tópicos do card de pacote (contrato v2). Ausente no backend antigo. */
    highlights?: unknown;
    /** Textos da página do pacote (2026-10-01). Ausente no backend antigo. */
    content?: unknown;
    imageUrl?: string | null;
    /** Banner da tela do serviço (2026-10-06). Ausente no backend antigo. */
    bannerUrl?: string | null;
    serverSlug?: string | null;
    serverLabel?: string | null;
    categorySlug?: string | null;
    categoryLabel?: string | null;
  }[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};

/**
 * A grade da vitrine: 6 colunas × 5 linhas (2026-10-08, pedido do usuário; o
 * arquivo desenhava 4 linhas). Teto do backend: 60 por página.
 */
const PAGE_SIZE = 30;

/**
 * Identidade, abas e servidores de um jogo. `null` quando ele não existe ou
 * está desativado — a página transforma isso num 404.
 */
export async function getGamePage(slug: string): Promise<GamePage | null> {
  // As leituras em paralelo: em série somariam latência à página mais navegada
  // da loja.
  const [game, section, items, blogNews, homeSection, homeItems] = await Promise.all([
    publicApiGet<StorefrontGame>(`/games/${encodeURIComponent(slug)}`),
    // Os blocos COMPARTILHADOS da página de jogo (referências, notícias,
    // dúvidas) têm o mesmo conteúdo em todos os jogos, então vivem na tela
    // "Edição de sessões" e não no Builder — que cuida do que é de cada jogo.
    //
    // Duas leituras: o que a sessão É (título) e o que ela CONTÉM (os cards).
    // Em paralelo com o resto, para não somar latência à página mais navegada.
    getSectionsFor("games"),
    getSectionItemsFor("games"),
    // Notícias do BLOG deste jogo (contrato blog.md). Em paralelo com o resto
    // — não soma latência — e cacheadas por 60s. Falha vira lista vazia e a
    // seção cai nos itens editoriais abaixo.
    getGameNews(slug, 4).catch(() => [] as BlogCardView[]),
    // As seções da HOME que a página de jogo também desenha (vídeo e reviews).
    getSectionsFor("home"),
    getSectionItemsFor("home"),
  ]);
  if (!game) return null;

  const tabs = tabsFromApi(game.slug, Array.isArray(game.tabs) ? game.tabs : []);
  // A primeira aba que não é LINK é a ativa. As de link ("VENDA PRA NÓS",
  // "FIDELIDADE") nunca podem ser: elas levam para outra página. Sem nenhuma,
  // `activeTabId` é "" e a página sai sem catálogo.
  const activeTabId = defaultTabId(tabs);

  const editorial = getEditorial(game.slug, game.name);

  const faqGroup = (key: string) => ({
    id: key,
    title: section(key).title,
    items: items(key).map((item) => ({
      id: item.id,
      question: item.title,
      answer: item.body,
    })),
  });
  // O título ESCRITO pelo admin vence o derivado. Vazio no banco é nulo (o
  // backend converte), então basta o falsy — nunca `=== null`.
  const heading =
    game.heading?.trim() ||
    buildHeading(game.name, tabs.find((tab) => tab.id === activeTabId));
  const logo = backendAsset(game.imageUrl);

  return {
    slug: game.slug,
    name: game.name,
    seo: {
      title: `${game.name} | Lets4Trade`,
      description: `${heading} na Lets4Trade: entrega rápida, suporte e preço justo.`,
    },

    /**
     * Banners do BANCO, subidos pelo builder. O conteúdo semente continua
     * existindo como reserva e hoje é uma lista vazia — quando o jogo não tem
     * banner nenhum, a seção some sozinha, que é o comportamento do arquivo.
     */
    banners:
      game.banners.length > 0
        ? game.banners.map((banner) => ({
            id: banner.id,
            image: {
              src: backendAsset(banner.imageUrl) ?? banner.imageUrl,
              alt: "",
              // As medidas do arquivo (1715×490). O `next/image` as usa para
              // reservar o espaço; a arte entra recortada por `object-cover`.
              width: 1715,
              height: 490,
            },
            href: banner.href ?? undefined,
          }))
        : editorial.banners,

    identity: {
      // `?? undefined` e não `?? null`: o campo é opcional no tipo, e um jogo
      // cadastrado sem arte desenha a caixa vazia em vez de quebrar.
      logo: logo ? { src: logo, alt: "" } : undefined,
      heading,
      customHeading: game.heading?.trim() || undefined,
      coin: editorial.coin,
    },

    tabs,
    activeTabId,

    servers: {
      label: game.serversLabel?.trim() || "Selecionar servidor",
      items: game.servers,
    },

    /**
     * Do BANCO desde 2026-09-10, pelo builder (etapa 7).
     *
     * Vinha VAZIO de propósito enquanto não existia model de categoria: o
     * arquivo desenha catorze pílulas escritas "Nome da categoria", que é
     * marcador, e catorze filtros que não filtram são piores que nenhum painel.
     *
     * O comportamento de sumir sozinho continua — um jogo sem categoria
     * cadastrada não desenha a seção, exatamente como antes.
     */
    categories: {
      label: game.categoriesLabel?.trim() || "Selecionar categoria",
      items: toGameCategories(game.categories ?? []),
    },

    catalog: { pageSize: PAGE_SIZE },

    description: toGameDescription(game.descriptionGroups),

    /**
     * Os depoimentos vêm do BANCO (`games:referencias`), editados na tela de
     * sessões. Sem linha nenhuma, cai no que o conteúdo semente traz — que hoje
     * é vazio, e faz o bloco sumir em vez de mostrar molduras sem texto.
     *
     * Cinco estrelas em todos, como no arquivo: a nota não é editável porque
     * não é avaliação de verdade — é vitrine.
     */
    references: {
      ...editorial.references,
      title: section("referencias").title || editorial.references.title,
      items: items("referencias").length
        ? items("referencias").map((item) => ({
            id: item.id,
            author: item.title,
            avatar: item.image
              ? { src: item.image, width: 42, height: 42, alt: "" }
              : undefined,
            rating: 5,
            body: item.body,
          }))
        : editorial.references.items,
    },
    news: {
      ...editorial.news,
      title: section("noticias").title || editorial.news.title,
      // Card "VISITAR BLOG" (2026-10-09): textos da sessão; sem link digitado,
      // leva às notícias DESTE jogo no blog.
      blogCard: blogCardTexts(section("noticias").extra, gameBlogHref(game.slug)),
      // Prioridade: notícias PUBLICADAS no blog para este jogo → itens da tela
      // de sessões → conteúdo semente. O blog vence porque tem página própria
      // (o card leva à matéria) e data de publicação real.
      items: blogNews.length
        ? blogNews.map((post) => blogNewsItem(post, game.name))
        : items("noticias").length
        ? items("noticias").map((item) => ({
            id: item.id,
            title: item.title,
            excerpt: item.body,
            image: item.image
              ? { src: item.image, width: 400, height: 225, alt: "" }
              : undefined,
            // A TAG é o jogo da página — a mesma regra do conteúdo semente, e o
            // que faz a notícia continuar certa em qualquer jogo sem o admin
            // reescrever a etiqueta em cada um.
            tag: game.name,
            // A DATA é quando o item foi criado, não um campo digitado: campo de
            // data é campo que alguém esquece de atualizar.
            date: formatNewsDate(item.createdAt),
            href: item.href,
          }))
        : editorial.news.items,
    },
    /**
     * O FAQ vem do BANCO: dois grupos, cada um uma lista editável em "Edição de
     * sessões → Página de jogo".
     *
     * Antes as perguntas eram fixas em `seed.ts` e só o título do PRIMEIRO
     * grupo era editável — e nos jogos de Path of Exile o primeiro era o de
     * Orbs, então o campo "Dúvidas" renomeava o grupo errado. Agora cada grupo
     * tem título e perguntas próprios.
     *
     * Grupo sem pergunta some, exceto o geral: os blocos da descrição do jogo
     * tomam o lugar dele (2026-10-08), então ele chega mesmo vazio para marcar
     * a posição, e o `GameFaqSection` decide se aparece. O de Orbs aparece
     * antes, e só em Path of Exile.
     */
    faq: [
      ...(ORBS_GAMES.has(game.slug) ? [faqGroup("duvidas-orbs")] : []),
      faqGroup(FAQ_DESCRIPTION_GROUP),
    ].filter((group) => group.items.length > 0 || group.id === FAQ_DESCRIPTION_GROUP),
    /**
     * A ordem que o admin montou no builder — ou a do arquivo do Figma, quando
     * ele não mexeu. `resolveSectionOrder` descarta chave desconhecida e
     * repetida, e nunca devolve lista vazia: página em branco não é um estado
     * que se publica por engano.
     */
    sections: resolveSectionOrder(game.sectionOrder),
    showcase: {
      video: {
        title: homeSection("video").title,
        image: homeSection("video").imageUrl,
        avatar: homeSection("video").secondaryImageUrl,
        videoUrl: homeSection("video").footnote,
        videoFile: homeSection("video").videoUrl,
        buttonUrl: homeSection("video").subtitle,
        extra: homeSection("video").extra,
      },
      reviews: {
        title: homeSection("reviews").title,
        subtitle: homeSection("reviews").subtitle,
        counter: homeSection("reviews").footnote,
        items: homeItems("reviews"),
      },
    },
  };
}

/**
 * Notícia do blog → card da seção NOTÍCIAS da página de jogo. A TAG é o nome
 * do jogo da página (mesma regra dos itens editoriais) e a data, a de
 * publicação no formato de hoje ("17/04/26").
 */
export function blogNewsItem(post: BlogCardView, gameName: string): GameNewsItem {
  return {
    id: `blog:${post.slug}`,
    title: post.title,
    excerpt: post.excerpt,
    image: post.cover ? { src: post.cover, width: 400, height: 225, alt: "" } : undefined,
    tag: gameName,
    date: post.date,
    href: post.href,
  };
}

/**
 * A página com a aba REALMENTE escolhida — o `?aba=` da URL, já validado.
 *
 * `getGamePage()` não pode saber isso sozinha: quem valida a query precisa da
 * lista de abas, que é o que ela devolve. Então ela entrega o estado PADRÃO
 * (primeira aba) e a página aplica a escolha depois de ler a URL.
 *
 * Sem este passo, `?aba=gold` filtrava o catálogo certo mas deixava o destaque
 * e o título na primeira aba — a tela mostrando produtos de uma aba e dizendo
 * que estava em outra. O defeito era latente enquanto nenhuma aba filtrava
 * coisa alguma; ligar a vitrine ao banco o tornou visível.
 *
 * Devolve uma CÓPIA rasa: mutar o objeto que veio da leitura faria a mesma
 * página se comportar diferente conforme a ordem em que fosse usada.
 */
export function withActiveTab(page: GamePage, activeTabId: string): GamePage {
  if (activeTabId === page.activeTabId) return page;

  return {
    ...page,
    activeTabId,
    identity: {
      ...page.identity,
      // O título ESCRITO pelo admin não muda com a aba — ele é o título da
      // página. Só o derivado acompanha a aba escolhida.
      heading:
        page.identity.customHeading ??
        buildHeading(page.name, page.tabs.find((tab) => tab.id === activeTabId)),
    },
  };
}

/**
 * O catálogo, já filtrado, ordenado e paginado PELO BANCO.
 *
 * Esta função era um `filter`/`sort`/`slice` em memória sobre os 96 produtos
 * semente de cada servidor. Com catálogo de verdade isso significaria trazer a
 * tabela inteira para o servidor do Next a cada visita, para mostrar 24 linhas.
 *
 * A assinatura não mudou de propósito — era o que a versão em memória prometia
 * quando o backend chegasse, e os componentes não precisaram saber.
 *
 * Em qualquer imprevisto devolve uma página VAZIA em vez de estourar: a
 * identidade do jogo já foi lida com sucesso, e derrubar a página inteira por
 * causa do catálogo esconderia as abas, o FAQ e as referências junto.
 */
export async function getCatalog(
  page: GamePage,
  query: CatalogQuery,
): Promise<CatalogResult> {
  const params = new URLSearchParams();

  // Só aba de verdade (e não LINK) filtra. Sem aba válida não há catálogo a
  // pedir: listar o jogo inteiro misturaria serviço com catálogo. SELL não tem
  // produto (é o formulário de venda) — nem vai à rede.
  const tab = page.tabs.find(
    (item) => item.id === query.tab && item.layout !== "LINK" && item.layout !== "SELL",
  );
  if (!tab) return { items: [], total: 0, pageCount: 1, page: 1 };
  params.set("tab", tab.id);
  if (query.server) params.set("server", query.server);
  // Repetível: marcar duas categorias significa "qualquer uma das duas".
  for (const slug of query.categories) params.append("category", slug);
  if (query.search) params.set("search", query.search);
  if (query.sort) params.set("sort", query.sort);
  if (query.page > 1) params.set("page", String(query.page));
  params.set("limit", String(page.catalog.pageSize));

  const result = await publicApiGet<StorefrontProductPage>(
    `/games/${encodeURIComponent(page.slug)}/products?${params.toString()}`,
  );

  if (!result) {
    return { items: [], total: 0, pageCount: 1, page: 1 };
  }

  return {
    items: result.items.map(toProduct),
    total: result.total,
    pageCount: result.pageCount,
    page: result.page,
  };
}

function toProduct(item: StorefrontProductPage["items"][number]): GameProduct {
  const image = backendAsset(item.imageUrl);
  const banner = backendAsset(item.bannerUrl);

  return {
    id: item.id,
    name: item.name,
    nameEn: item.nameEn?.trim() || undefined,
    priceCents: item.priceCents,
    // As medidas são só a proporção que o `next/image` usa para reservar o
    // espaço — o card recorta com `object-cover`, e a arte vem do admin sem
    // dimensão conhecida.
    image: image ? { src: image, alt: "", width: 263, height: 276 } : undefined,
    banner: banner ? { src: banner, alt: "", width: 551, height: 327 } : undefined,
    // O backend apaga da resposta todo campo nulo, então estes chegam ausentes
    // e não como `null`. Teste por falsy, nunca por `=== null`.
    serverSlug: item.serverSlug ?? undefined,
    serverLabel: item.serverLabel ?? undefined,
    categorySlug: item.categorySlug ?? undefined,
    categoryLabel: item.categoryLabel ?? undefined,
    tabId: item.tabSlug || "",
    ...readPricing(item.pricing),
    highlights: readHighlights(item.highlights),
    content: parseServiceContent(item.content),
  };
}

/**
 * Um PACOTE e seus irmãos — o mesmo pacote (mesmo nome, mesma aba) em cada
 * servidor (`?package=`, 2026-10-01). Cada servidor tem preço próprio, então
 * "trocar de servidor" na página do pacote é trocar de PRODUTO. Uma chamada;
 * falha ou pacote inexistente viram lista vazia.
 */
export async function getPackageVariants(page: GamePage, productId: string): Promise<GameProduct[]> {
  const params = new URLSearchParams({ package: productId });
  const result = await publicApiGet<StorefrontProductPage>(
    `/games/${encodeURIComponent(page.slug)}/products?${params.toString()}`,
  );
  return result ? result.items.map(toProduct) : [];
}

/**
 * Os produtos de SERVIÇO de um escopo (aba + servidor + categoria), para o
 * card configurador. Uma chamada, até 60 itens (o teto do DTO): um serviço com
 * mais variações que isso não caberia nas pílulas do card de qualquer forma.
 *
 * Falha vira lista vazia — o card mostra o estado vazio em vez de derrubar a
 * página (a identidade e o FAQ continuam no ar).
 */
export async function getServiceProducts(
  page: GamePage,
  scope: { tab: string; server: string; category?: string },
): Promise<GameProduct[]> {
  const params = new URLSearchParams();
  params.set("tab", scope.tab);
  if (scope.server) params.set("server", scope.server);
  if (scope.category) params.set("category", scope.category);
  params.set("limit", "60");

  const result = await publicApiGet<StorefrontProductPage>(
    `/games/${encodeURIComponent(page.slug)}/products?${params.toString()}`,
  );
  return result ? result.items.map(toProduct) : [];
}

/**
 * "Compre Moedas De Path Of Exile 2" — o título do arquivo, montado a partir do
 * dado.
 *
 * Ele era escrito à mão, um por jogo, no conteúdo semente. Isso funcionava para
 * cinco jogos conhecidos e falharia no primeiro que o admin cadastrasse pelo
 * painel: a página nasceria sem título. Derivar do nome e da aba ativa faz
 * qualquer jogo novo nascer com o título certo.
 */
function buildHeading(name: string, tab: { label: string; layout: string } | undefined): string {
  if (!tab) return `Compre em ${name}`;

  // "MOEDAS" → "Moedas". O arquivo escreve o rótulo em caixa alta na aba e em
  // capitalização normal no título.
  const what = tab.label.charAt(0) + tab.label.slice(1).toLocaleLowerCase("pt-BR");
  // Aba SELL é a pessoa VENDENDO para a loja: "Compre Venda pra nós De X" não
  // faz sentido. Rótulo da aba + jogo, sem verbo inventado.
  if (tab.layout === "SELL") return `${what}: ${name}`;
  return `Compre ${what} De ${name}`;
}

/** Preço em centavos → "R$ 25,00". Formatação fixa em pt-BR, como o arquivo. */
export function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Data da notícia em pt-BR curto ("17/04/26"), a partir do ISO do backend.
 *
 * Sem data legível devolve texto vazio: o card desenha a etiqueta e segue — uma
 * "Invalid Date" na vitrine é pior que nenhuma data.
 */
function formatNewsDate(iso: string | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}
