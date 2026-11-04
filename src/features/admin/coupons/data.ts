import { apiGet } from "@/lib/serverApi";
import { toCouponChoices, type CouponChoice } from "./choices";
import {
  toAdminCoupon,
  toAdminCouponPage,
  toTargetGames,
  type AdminCoupon,
  type AdminCouponPage,
  type CouponTargetGame,
} from "./types";

/**
 * Leituras do painel de cupons, no SERVIDOR (cookie httpOnly; `no-store`).
 * Separado dos tipos porque importa `serverApi` → `next/headers`.
 */

const ID_RE = /^[A-Za-z0-9_-]{1,100}$/;

/** `GET /admin/coupons`. `null` = a leitura falhou (a tela avisa). */
export async function getAdminCoupons(search: string, page: number): Promise<AdminCouponPage | null> {
  const params = new URLSearchParams();
  if (search) params.set("search", search.slice(0, 40));
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  const result = await apiGet<unknown>(`/admin/coupons${query ? `?${query}` : ""}`);
  return result.ok ? toAdminCouponPage(result.data) : null;
}

/** `GET /admin/coupons/:id`. `null` = inexistente ou leitura que falhou. */
export async function getAdminCoupon(id: string): Promise<AdminCoupon | null> {
  if (!ID_RE.test(id)) return null;
  const result = await apiGet<unknown>(`/admin/coupons/${encodeURIComponent(id)}`);
  return result.ok ? toAdminCoupon(result.data) : null;
}

/**
 * Todos os cupons como opções de select (aviso de cupom ao sair). A lista do
 * backend pagina de 50 em 50; até 4 páginas (200 cupons) — passou disso, o
 * select mostra os mais recentes e os que estão ligados primeiro (ordem do
 * backend). `null` = sem acesso (só ADMIN vê cupons) ou falha: a tela cai no
 * campo de texto.
 */
export async function getCouponChoices(): Promise<CouponChoice[] | null> {
  const first = await getAdminCoupons("", 1);
  if (!first) return null;
  const items = [...first.items];
  for (let page = 2; page <= Math.min(first.pageCount, 4); page++) {
    const next = await getAdminCoupons("", page);
    if (!next) break;
    items.push(...next.items);
  }
  return toCouponChoices(items);
}

/** Jogos ativos com as abas — opções do alcance. Falhou: lista vazia. */
export async function getCouponTargetGames(): Promise<CouponTargetGame[]> {
  const result = await apiGet<unknown>("/admin/coupons/targets");
  return result.ok ? toTargetGames(result.data) : [];
}
