import type { GameProduct } from "./types";

/**
 * O pacote a mostrar entre as variantes (uma por servidor) que a API devolveu
 * para `?pacote=<id>`. Pura, para teste.
 *
 * Só vale produto DESTA aba: um id de outra aba na URL (link velho, ou
 * adulterado) não abre a página do pacote aqui. `null` = "não está mais
 * disponível".
 */
export function pickPackageVariant(variants: readonly GameProduct[], id: string, tabId: string): GameProduct | null {
  const inTab = variants.filter((item) => item.tabId === tabId);
  return inTab.find((item) => item.id === id) ?? null;
}
