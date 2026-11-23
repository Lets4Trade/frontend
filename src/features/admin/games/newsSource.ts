/**
 * Central do jogo → aba Notícias (2026-11-23, pedido do usuário): de onde vêm
 * as notícias da seção NOTÍCIAS da página do jogo. A parte PURA (sem rede),
 * usada pelo editor, pela action e pelos testes.
 *
 * O valor viaja como UMA string — `own`, `all` ou o id do outro jogo — igual
 * ao contrato do backend (`PATCH /admin/games/:id/news-source`), para o
 * formulário não conseguir mandar "todos" e "outro jogo" ao mesmo tempo.
 */
import { isValidId } from "./tabs/types";

export const NEWS_SOURCE_OWN = "own";
export const NEWS_SOURCE_ALL = "all";

export type NewsSourceOption = { value: string; label: string };

/** O valor gravado → o valor do select. Campos ausentes = padrão (deste jogo). */
export function newsSourceValue(game: { newsAll?: boolean; newsGameId?: string | null }): string {
  if (game.newsAll === true) return NEWS_SOURCE_ALL;
  if (game.newsGameId && isValidId(game.newsGameId)) return game.newsGameId;
  return NEWS_SOURCE_OWN;
}

/** O que a action aceita: as duas palavras fixas ou um id bem formado. */
export function isNewsSource(value: unknown): value is string {
  return value === NEWS_SOURCE_OWN || value === NEWS_SOURCE_ALL || (typeof value === "string" && isValidId(value));
}

/**
 * As opções do select: deste jogo (padrão), todos e os OUTROS jogos em ordem
 * alfabética. Se o jogo gravado não estiver mais na lista (excluído), ele
 * aparece como "jogo removido" em vez de o select mostrar vazio.
 */
export function newsSourceOptions(
  game: { id: string; name: string },
  games: readonly { id: string; name: string }[],
  current: string,
): NewsSourceOption[] {
  const others = games
    .filter((other) => other.id !== game.id)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    .map((other) => ({ value: other.id, label: `Notícias de ${other.name}` }));
  const options: NewsSourceOption[] = [
    { value: NEWS_SOURCE_OWN, label: `Deste jogo (${game.name}) — padrão` },
    { value: NEWS_SOURCE_ALL, label: "Todos os jogos (as mais recentes)" },
    ...others,
  ];
  if (!options.some((option) => option.value === current)) {
    options.push({ value: current, label: "Jogo removido — escolha outro" });
  }
  return options;
}
