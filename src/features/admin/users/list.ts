import { apiGet } from "@/lib/serverApi";
import { USER_ID_RE } from "./href";
import type { AdminUser, AdminUserPage } from "./types";

/**
 * Leitura da listagem de usuários no SERVIDOR.
 *
 * Só o que toca a rede vive aqui; tipos e helpers puros ficam em `types.ts`,
 * para o modal (client component) poder importá-los sem arrastar o
 * `next/headers` para o navegador.
 *
 * Como as outras listagens do painel, o estado dos filtros mora na URL: a
 * filtragem acontece no BANCO, o estado sobrevive ao voltar do navegador, e o
 * objeto de query já é a query string da API.
 */

export type { AdminUser, AdminUserPage };

/** Nomes dos parâmetros, num lugar só porque links e leitura usam os dois. */
export const PARAM = {
  role: "cargo",
  search: "busca",
  page: "pagina",
  /** Só esta conta, com a ficha aberta (2026-10-23) — ver `href.ts`. */
  user: "usuario",
} as const;

export type UsersQuery = {
  role: string;
  search: string;
  page: number;
  /** Id de UMA conta (o nome clicado em pedidos/chats/propostas). */
  user: string;
};

const ROLES = new Set(["ADMIN", "EDITOR", "SUPPORT", "WRITER", "USER"]);

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Lê a query da URL e a VALIDA. Cargo só passa se estiver na lista, a página é
 * inteiro positivo e a busca tem teto — input de cliente vale a regra de
 * qualquer boundary, mesmo o backend também validando.
 */
export function parseUsersQuery(params: RawParams): UsersQuery {
  const rawRole = first(params[PARAM.role]) ?? "";
  const rawPage = Number.parseInt(first(params[PARAM.page]) ?? "1", 10);

  return {
    role: ROLES.has(rawRole) ? rawRole : "",
    search: (first(params[PARAM.search]) ?? "").slice(0, 80),
    page: Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1,
    user: USER_ID_RE.test(first(params[PARAM.user]) ?? "") ? (first(params[PARAM.user]) as string) : "",
  };
}

/**
 * Monta o endereço da listagem com um pedaço da query trocado.
 *
 * Trocar qualquer filtro volta para a página 1 — a menos que o que mudou seja a
 * própria página. Sem isso, filtrar estando na página 3 leva a uma página vazia
 * e a tela parece dizer que não há ninguém.
 */
export function buildHref(query: UsersQuery, patch: Partial<UsersQuery>): string {
  const next = { ...query, ...patch };
  if (patch.page === undefined) next.page = 1;
  // Qualquer filtro novo sai do "só esta conta".
  if (patch.user === undefined) next.user = "";

  const search = new URLSearchParams();
  if (next.role) search.set(PARAM.role, next.role);
  if (next.search) search.set(PARAM.search, next.search);
  if (next.page > 1) search.set(PARAM.page, String(next.page));
  if (next.user) search.set(PARAM.user, next.user);

  const qs = search.toString();
  return qs === "" ? "/admin/usuarios" : `/admin/usuarios?${qs}`;
}

const EMPTY_PAGE: AdminUserPage = {
  items: [],
  total: 0,
  page: 1,
  limit: 25,
  pageCount: 1,
};

/**
 * Busca a página de usuários.
 *
 * Falha vira página VAZIA em vez de exceção, como as outras leituras do painel.
 * A tela sabe desenhar "nenhum usuário", e esse estado cobre a queda do backend
 * sem derrubar a página inteira.
 */
export async function getAdminUsers(query: UsersQuery): Promise<AdminUserPage> {
  const search = new URLSearchParams();
  if (query.role) search.set("role", query.role);
  if (query.search) search.set("search", query.search);
  if (query.user) search.set("id", query.user);
  search.set("page", String(query.page));

  const response = await apiGet<AdminUserPage>(
    `/admin/users?${search.toString()}`,
  );
  return response.ok && Array.isArray(response.data?.items)
    ? response.data
    : EMPTY_PAGE;
}
