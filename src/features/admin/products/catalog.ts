/**
 * Consulta e tipos da listagem de produtos do painel — a parte PURA.
 *
 * Separado de `list.ts` porque o card do produto é client component e precisa
 * de `productImage`: importar dali arrastaria o `serverApi` (e o `next/headers`
 * que ele usa) para o bundle do navegador, e o build quebra.
 *
 * O estado dos filtros mora na URL, e não em `useState` — a mesma decisão do
 * catálogo da vitrine (`features/game/catalog.ts`), pelos mesmos motivos: a
 * filtragem acontece no SERVIDOR (o navegador não baixa o catálogo inteiro para
 * esconder a maior parte), o estado sobrevive ao voltar do navegador, e o
 * objeto de query já é a query string da API.
 */
import type { Pricing } from "@/features/pricing/quote";

export type AdminProduct = {
  id: string;
  name: string;
  /** Sempre CENTAVOS inteiros — o backend converte o `Decimal` na saída. */
  priceCents: number;
  platform: string;
  /** Aba do jogo (contrato `game-tabs.md`). */
  tabId?: string | null;
  tabLabel?: string | null;
  /** Regra de preço de aba cotada (`QUOTED_LAYOUTS`); `null` em aba CATALOG. */
  pricing?: Pricing | null;
  /** Tópicos do card de PACOTE (v2). Ausente (backend antigo) = `[]`. */
  highlights?: string[];
  /** Caminho servido pelo BACKEND (`/uploads/products/…`), não pelo Next. */
  imageUrl: string | null;
  serverId: string | null;
  categoryId: string | null;
  createdAt: string;
  game: { id: string; slug: string; name: string };
  server: { id: string; label: string } | null;
  category: { id: string; label: string } | null;
};

export type AdminProductPage = {
  items: AdminProduct[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};

/**
 * Ordenações. As quatro últimas são as MESMAS do `SORT_OPTIONS` da vitrine, e
 * é de propósito: o arquivo desenha as mesmas quatro caixinhas nas duas telas.
 *
 * O select "Mais recente" e as caixinhas são o mesmo estado, com seis valores.
 * Dois controles de ordenação independentes deixariam a tela sem resposta para
 * "ordenado por quê, afinal?" — e o arquivo desenha os dois lado a lado.
 */
export const SORT_SELECT = [
  { value: "recente", label: "Mais recente" },
  { value: "antigo", label: "Mais antigo" },
] as const;

export const SORT_BOXES = [
  { value: "az", label: "De A a Z" },
  { value: "za", label: "De Z a A" },
  { value: "menor", label: "Menor preço" },
  { value: "maior", label: "Maior preço" },
] as const;

const SORTS = new Set<string>([
  ...SORT_SELECT.map((o) => o.value),
  ...SORT_BOXES.map((o) => o.value),
]);

/** Nomes dos parâmetros, num lugar só porque links e leitura usam os dois. */
export const PARAM = {
  game: "jogo",
  /**
   * Aba do jogo (`tabId`, contrato `game-tabs.md`) — só com jogo escolhido.
   * Não há mais filtro por "tipo" sem jogo (FASE 5): aba é coisa de UM jogo.
   */
  tab: "aba",
  sort: "ordem",
  search: "busca",
  page: "pagina",
} as const;

export type ProductsQuery = {
  game: string;
  /** Aba do jogo. Validada contra as abas do jogo na PÁGINA, que as lê. */
  tab: string;
  sort: string;
  search: string;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Lê a query da URL e a VALIDA. Nada do endereço é aceito como veio: aba e
 * ordem só passam se estiverem nas listas, a página é inteiro positivo, e a
 * busca tem teto. É input de cliente — vale a regra de qualquer boundary, e
 * vale mesmo o backend também validando.
 *
 * `game` é a exceção: é um id opaco que só o banco conhece, então quem valida é
 * a consulta (um id inexistente devolve lista vazia, não erro).
 */
export function parseProductsQuery(
  params: RawParams,
  gameIds: readonly string[],
): ProductsQuery {
  const rawGame = first(params[PARAM.game]) ?? "";
  const rawTab = first(params[PARAM.tab]) ?? "";
  const rawSort = first(params[PARAM.sort]) ?? "";
  const rawPage = Number.parseInt(first(params[PARAM.page]) ?? "1", 10);

  const game = gameIds.includes(rawGame) ? rawGame : "";
  return {
    game,
    // Aba só existe dentro de um jogo. Aqui só o FORMATO (é id opaco); se ela é
    // mesmo deste jogo, a página confere com a lista de abas que ela lê.
    tab: game !== "" && /^[A-Za-z0-9_-]{1,100}$/.test(rawTab) ? rawTab : "",
    sort: SORTS.has(rawSort) ? rawSort : "recente",
    search: (first(params[PARAM.search]) ?? "").slice(0, 80),
    page: Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1,
  };
}

/**
 * Monta o endereço da listagem com um pedaço da query trocado.
 *
 * Trocar QUALQUER filtro volta para a página 1 — a menos que o que mudou seja
 * a própria página. Sem isso, filtrar estando na página 3 leva a uma página
 * vazia, e a tela parece dizer que não há produtos.
 */
export function buildHref(
  query: ProductsQuery,
  patch: Partial<ProductsQuery>,
): string {
  const next = { ...query, ...patch };
  if (patch.page === undefined) next.page = 1;

  const search = new URLSearchParams();
  if (next.game) search.set(PARAM.game, next.game);
  // Trocar de jogo zera a aba: ela é de UM jogo só.
  if (patch.game !== undefined && patch.game !== query.game && patch.tab === undefined) next.tab = "";
  if (next.tab) search.set(PARAM.tab, next.tab);
  // "recente" é o padrão do backend; omiti-lo mantém a URL limpa.
  if (next.sort && next.sort !== "recente") search.set(PARAM.sort, next.sort);
  if (next.search) search.set(PARAM.search, next.search);
  if (next.page > 1) search.set(PARAM.page, String(next.page));

  const qs = search.toString();
  return qs === "" ? "/admin/produtos" : `/admin/produtos?${qs}`;
}

/**
 * `/uploads/products/x.webp` → URL absoluta no BACKEND.
 *
 * A arte é servida pelo Nest (`app.use('/uploads', express.static(...))` no
 * `main.ts`), não pelo Next: um caminho relativo cairia em `localhost:3000` e
 * daria 404. O host sai do mesmo `NEXT_PUBLIC_API_URL` de todo o resto, com o
 * `/api/v1` retirado — `/uploads` fica fora do prefixo da API.
 */
export function productImage(imageUrl: string | null) {
  if (!imageUrl) return undefined;

  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  const origin = base.replace(/\/api\/v\d+\/?$/, "").replace(/\/$/, "");
  return {
    src: `${origin}${imageUrl}`,
    // O card recorta com `object-cover`; as medidas são só a proporção que o
    // `next/image` usa para reservar o espaço.
    width: 263,
    height: 276,
  };
}
