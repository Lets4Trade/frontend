import type { GameSectionKey } from "./sections";
import type { GameTabLayout } from "./types";

/**
 * O que cada layout de aba desenha nos três blocos que dependem da aba
 * (`servers`, `categories`, `catalog`) — contrato `game-tabs-v2.md`.
 *
 * Decisão PURA, separada de `GamePageSections` para ser testável sem montar
 * componente de servidor (que busca na rede):
 *
 *   layout    servers    categories   catalog
 *   CATALOG   genérico   genérico     barra + grade (o de sempre)
 *   SERVICE   —          —            textos + card configurador (servidor e
 *                                     categoria DENTRO do card)
 *   QUANTITY  —          —            servidores + painel de quantidade + "Preço"
 *   PACKAGES  genérico   genérico     grade de pacotes (CONTINUAR → configurador)
 *   SELL      —          —            formulário "Venda pra nós" + contato
 *
 * "—" = o bloco SOME (e o vão dele junto): no SERVICE e no QUANTITY o servidor
 * mora dentro do próprio bloco, para reordenar a página não separar o servidor
 * do painel que ele filtra; o SELL não tem produto para filtrar.
 */
export type CatalogBlock = "catalog" | "service" | "quantity" | "packages" | "sell";

export function catalogBlockFor(layout: GameTabLayout): CatalogBlock {
  switch (layout) {
    case "SERVICE":
      return "service";
    case "QUANTITY":
      return "quantity";
    case "PACKAGES":
      return "packages";
    case "SELL":
      return "sell";
    default:
      return "catalog";
  }
}

/** Os blocos genéricos de servidor e categoria aparecem com este layout? */
export function showsGenericFilters(layout: GameTabLayout): boolean {
  return layout === "CATALOG" || layout === "PACKAGES";
}

/** Os blocos que dependem da aba. */
export const TAB_DEPENDENT_SECTIONS: readonly GameSectionKey[] = ["servers", "categories", "catalog"];
