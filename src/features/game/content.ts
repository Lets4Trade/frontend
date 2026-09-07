import { GAME_PAGE_SEED } from "./seed";
import type { GamePage } from "./types";

/**
 * A ÚNICA fronteira de dados da página de jogo.
 *
 * Hoje ela lê o conteúdo semente de `seed.ts`. O backend (`../backend`) só tem
 * o módulo de auth — não existe model de produto, nem de página, nem endpoint
 * para isto. Quando existir, é ESTA função que muda, e mais nada: os
 * componentes já recebem tudo por `GamePage`.
 *
 * O contrato esperado, quando o backend chegar:
 *
 *   GET  /api/v1/games/:slug/page   → GamePage
 *   PUT  /api/v1/games/:slug/page   → GamePage   (admin, autenticado)
 *
 * Duas coisas a decidir junto com o backend, e que mudam o desenho:
 *   1. o catálogo virá paginado pelo servidor (o filtro desta tela já é feito
 *      por `searchParams`, então vira query string sem reescrever a UI);
 *   2. a edição do admin precisa de versão/rascunho, ou publica direto.
 */
export async function getGamePage(slug: string): Promise<GamePage | null> {
  return GAME_PAGE_SEED[slug] ?? null;
}

/** Preço em centavos → "R$ 25,00". Formatação fixa em pt-BR, como o arquivo. */
export function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
