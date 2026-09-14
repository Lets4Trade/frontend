import { backendAsset, publicApiGet } from "@/lib/publicApi";
import type { CatalogQuery, CatalogResult } from "./catalog";
import { resolveSectionOrder } from "./sections";
import { getEditorial } from "./seed";
import { getSectionItemsFor, getSectionsFor } from "@/features/site/content";
import { getNavTabs } from "@/features/site/navTabs";
import {
  resolveLinkTabs,
  resolveProductTabs,
  tabById,
  tabByProductType,
  type NavTabOverride,
} from "./tabs";
import type { GamePage, GameProduct, GameTab } from "./types";

/**
 * Os jogos em que o grupo "Dúvidas sobre Orbs" aparece, ACIMA do geral.
 *
 * Continua no código, e não num campo do jogo, porque é uma regra do
 * CONTEÚDO — Orbs só existem em Path of Exile — e não algo que o admin mude de
 * um dia para o outro. Jogo novo de PoE entra aqui junto com o slug.
 */
const ORBS_GAMES = new Set(["path-of-exile", "path-of-exile-2"]);

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
  productTypes: string[];
  servers: { slug: string; label: string }[];
  categories: { slug: string; label: string }[];
  banners: { id: string; imageUrl: string; href?: string | null }[];
  /**
   * Personalização do Builder de Páginas. Ausentes = "não personalizado", e a
   * página cai no valor derivado — não em texto em branco. Ver o `Game` no
   * schema do backend.
   */
  heading?: string | null;
  serversLabel?: string | null;
  categoriesLabel?: string | null;
  description?: string | null;
  /** Blocos visíveis, na ordem. Vazio = não personalizado. */
  sectionOrder?: string[] | null;
};

/** O que `GET /api/v1/games/:slug/products` devolve. */
type StorefrontProductPage = {
  items: {
    id: string;
    name: string;
    priceCents: number;
    productType: string;
    imageUrl?: string | null;
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

/** A grade do arquivo é 6 colunas × 4 linhas. */
const PAGE_SIZE = 24;

/**
 * Identidade, abas e servidores de um jogo. `null` quando ele não existe ou
 * está desativado — a página transforma isso num 404.
 */
export async function getGamePage(slug: string): Promise<GamePage | null> {
  // As duas leituras em paralelo: a personalização das abas não depende do
  // jogo, e em série somaria latência à página mais navegada da loja.
  const [game, navTabs, section, items] = await Promise.all([
    publicApiGet<StorefrontGame>(`/games/${encodeURIComponent(slug)}`),
    getNavTabs(),
    // Os blocos COMPARTILHADOS da página de jogo (referências, notícias,
    // dúvidas) têm o mesmo conteúdo em todos os jogos, então vivem na tela
    // "Edição de sessões" e não no Builder — que cuida do que é de cada jogo.
    //
    // Duas leituras: o que a sessão É (título) e o que ela CONTÉM (os cards).
    // Em paralelo com o resto, para não somar latência à página mais navegada.
    getSectionsFor("games"),
    getSectionItemsFor("games"),
  ]);
  if (!game) return null;

  const tabs = buildTabs(game.slug, game.productTypes, navTabs);
  // A primeira aba de PRODUTO é a ativa. As de link ("VENDA PRA NÓS",
  // "FIDELIDADE") nunca podem ser: elas não filtram catálogo nenhum.
  const activeTabId = tabs.find((tab) => tabById(tab.id))?.id ?? "";

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
  const heading = game.heading?.trim() || buildHeading(game.name, activeTabId);
  const logo = backendAsset(game.imageUrl);

  return {
    slug: game.slug,
    name: game.name,
    seo: {
      title: `${game.name} — Lets4Trade`,
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
      items: game.categories.map((category) => ({
        id: category.slug,
        label: category.label,
      })),
    },

    catalog: { pageSize: PAGE_SIZE },

    description: game.description?.trim() || undefined,

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
      items: items("noticias").length
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
     * Grupo sem pergunta some; sem nenhum, o bloco inteiro some (ver
     * `GamePageSections`). O de Orbs aparece antes, e só em Path of Exile.
     */
    faq: [
      ...(ORBS_GAMES.has(game.slug) ? [faqGroup("duvidas-orbs")] : []),
      faqGroup("duvidas"),
    ].filter((group) => group.items.length > 0),
    /**
     * A ordem que o admin montou no builder — ou a do arquivo do Figma, quando
     * ele não mexeu. `resolveSectionOrder` descarta chave desconhecida e
     * repetida, e nunca devolve lista vazia: página em branco não é um estado
     * que se publica por engano.
     */
    sections: resolveSectionOrder(game.sectionOrder),
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
        page.identity.customHeading ?? buildHeading(page.name, activeTabId),
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

  const tab = tabById(query.tab);
  if (tab) params.set("type", tab.productType);
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

  return {
    id: item.id,
    name: item.name,
    priceCents: item.priceCents,
    // As medidas são só a proporção que o `next/image` usa para reservar o
    // espaço — o card recorta com `object-cover`, e a arte vem do admin sem
    // dimensão conhecida.
    image: image ? { src: image, alt: "", width: 263, height: 276 } : undefined,
    // O backend apaga da resposta todo campo nulo, então estes chegam ausentes
    // e não como `null`. Teste por falsy, nunca por `=== null`.
    serverSlug: item.serverSlug ?? undefined,
    serverLabel: item.serverLabel ?? undefined,
    categorySlug: item.categorySlug ?? undefined,
    categoryLabel: item.categoryLabel ?? undefined,
    tabId: tabByProductType(item.productType)?.id ?? "",
  };
}

/**
 * As abas que ESTE jogo desenha.
 *
 * Saem do `productTypes` do banco, na ordem do arquivo — não da lista completa.
 * Um jogo que só vende moedas não mostra sete abas: as outras seis levariam a
 * catálogos vazios, e o cliente descobriria isso um clique de cada vez.
 *
 * Um tipo que o backend conheça e a arte não cubra é IGNORADO em silêncio, em
 * vez de virar uma aba sem ícone. O enum do backend documenta a mesma regra.
 */
function buildTabs(
  slug: string,
  productTypes: string[],
  overrides: NavTabOverride[],
): GameTab[] {
  const wanted = new Set(productTypes);

  // `resolveProductTabs` aplica rótulo, ícone, ordem e visibilidade da tela
  // "Edição de sessões"; o filtro por `productTypes` é do BUILDER, e diz quais
  // abas ESTE jogo vende. As duas coisas se somam.
  const productTabs: GameTab[] = resolveProductTabs(overrides)
    .filter((tab) => wanted.has(tab.productType))
    .map((tab, index) => ({
      id: tab.id,
      label: tab.label,
      icon: { src: tab.icon, width: 50, height: 50 },
      iconOverlay: tab.overlay,
      // A primeira aba é o estado padrão da página, e estado padrão não carrega
      // parâmetro — a mesma regra da paginação ("página 1 não vai na URL").
      href: index === 0 ? `/games/${slug}` : `/games/${slug}?aba=${tab.id}`,
    }));

  const linkTabs: GameTab[] = resolveLinkTabs(overrides).map((tab) => ({
    id: tab.id,
    label: tab.label,
    icon: { src: tab.icon, width: 50, height: 50 },
    href: tab.href,
  }));

  return [...productTabs, ...linkTabs];
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
function buildHeading(name: string, activeTabId: string): string {
  const tab = tabById(activeTabId);
  if (!tab) return `Compre em ${name}`;

  // "MOEDAS" → "Moedas". O arquivo escreve o rótulo em caixa alta na aba e em
  // capitalização normal no título.
  const what =
    tab.label.charAt(0) + tab.label.slice(1).toLocaleLowerCase("pt-BR");
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
