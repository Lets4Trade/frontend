import { apiGet } from "@/lib/serverApi";
import { UNASSIGNED, type AdminOrderPage, type Attendant } from "./types";

// Re-exportado para quem lê a URL não precisar saber que a constante mudou de
// arquivo. A definição foi para `types.ts` porque a TABELA também precisa dela,
// e `types.ts` é o único dos dois que um client component pode importar — este
// aqui puxa `serverApi`, que puxa `next/headers`.
export { UNASSIGNED };

/**
 * Leitura da tela "Vendas e pedidos", a partir do SERVIDOR.
 *
 * Separado de `types.ts` porque este arquivo importa `serverApi`, que puxa
 * `next/headers` — e a tabela é client component. Mesma separação do resto do
 * painel.
 */

/** Nomes dos parâmetros na URL. pt-BR, como o resto do painel. */
export const PARAM = {
  search: "busca",
  status: "situacao",
  assignee: "atendente",
  sort: "ordem",
  page: "pagina",
} as const;

export const SORTS = [
  { value: "recente", label: "Mais recente" },
  { value: "antigo", label: "Mais antigo" },
] as const;

export type OrdersQuery = {
  search: string;
  status: string;
  assignee: string;
  sort: string;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Lê e VALIDA a query da URL.
 *
 * Situação e ordem só passam se estiverem nas listas conhecidas; a página é
 * inteiro positivo; a busca tem teto. O atendente é a exceção: é um id opaco
 * que só o banco conhece, então quem valida é a consulta — um id inexistente
 * devolve lista vazia, não erro.
 *
 * Não substitui a validação do backend, que refaz tudo no DTO. É a primeira das
 * duas camadas, e a que evita mandar lixo pela rede.
 */
export function parseOrdersQuery(
  params: RawParams,
  statuses: readonly string[],
): OrdersQuery {
  const rawStatus = first(params[PARAM.status]) ?? "";
  const rawSort = first(params[PARAM.sort]) ?? "";
  const rawPage = Number.parseInt(first(params[PARAM.page]) ?? "1", 10);

  return {
    search: (first(params[PARAM.search]) ?? "").slice(0, 80),
    status: statuses.includes(rawStatus) ? rawStatus : "",
    assignee: (first(params[PARAM.assignee]) ?? "").slice(0, 100),
    sort: SORTS.some((option) => option.value === rawSort) ? rawSort : "recente",
    page: Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1,
  };
}

/**
 * Monta o endereço da tabela com um pedaço da query trocado.
 *
 * Mexer em QUALQUER filtro volta para a página 1 — a menos que o que mudou seja
 * a própria página. Sem isso, filtrar estando na página 3 leva a uma página
 * vazia e a tela parece dizer que não há pedidos.
 */
export function buildHref(query: OrdersQuery, patch: Partial<OrdersQuery>): string {
  const next = { ...query, ...patch };
  if (patch.page === undefined) next.page = 1;

  const search = new URLSearchParams();
  if (next.search) search.set(PARAM.search, next.search);
  if (next.status) search.set(PARAM.status, next.status);
  if (next.assignee) search.set(PARAM.assignee, next.assignee);
  // "recente" é o padrão do backend; omiti-lo mantém a URL limpa.
  if (next.sort && next.sort !== "recente") search.set(PARAM.sort, next.sort);
  if (next.page > 1) search.set(PARAM.page, String(next.page));

  const qs = search.toString();
  return qs === "" ? "/admin/pedidos" : `/admin/pedidos?${qs}`;
}

/** A página de pedidos. Falha vira página VAZIA, nunca exceção. */
export async function getAdminOrders(query: OrdersQuery): Promise<AdminOrderPage> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.assignee) params.set("assignee", query.assignee);
  if (query.sort) params.set("sort", query.sort);
  if (query.page > 1) params.set("page", String(query.page));

  const result = await apiGet<AdminOrderPage>(`/admin/orders?${params.toString()}`);

  return result.ok
    ? result.data
    : { items: [], total: 0, page: 1, limit: 25, pageCount: 1 };
}

/** Os atendentes do select. Lista vazia em qualquer imprevisto. */
export async function getAttendants(): Promise<Attendant[]> {
  const result = await apiGet<Attendant[]>("/admin/orders/attendants");
  return result.ok && Array.isArray(result.data) ? result.data : [];
}
