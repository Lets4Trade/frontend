/**
 * Histórico de busca do CLIENTE (2026-10-01) — guardado só no navegador dele
 * (`localStorage`), nunca no servidor: o que uma pessoa procurou não é dado que
 * a loja precise ter. Funciona logado ou não, e some com "Limpar".
 *
 * Toda leitura/escrita é protegida: `localStorage` pode não existir ou lançar
 * (aba anônima, navegador bloqueando dados do site). Nesses casos o histórico
 * simplesmente fica vazio.
 */

const KEY = "lets4trade:busca-recente";
export const MAX_HISTORY = 6;
const MAX_TERM = 80;

/** Termos válidos, mais recente primeiro, sem repetição (ignora maiúscula). */
export function normalizeHistory(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const term = item.trim().replace(/\s+/g, " ").slice(0, MAX_TERM);
    const key = term.toLocaleLowerCase("pt-BR");
    if (term.length < 2 || seen.has(key)) continue;
    seen.add(key);
    out.push(term);
    if (out.length === MAX_HISTORY) break;
  }
  return out;
}

/** O termo vai para o topo; o mesmo termo antes dele sai. */
export function withTerm(history: readonly string[], term: string): string[] {
  return normalizeHistory([term, ...history]);
}

export function readHistory(): string[] {
  try {
    return normalizeHistory(JSON.parse(window.localStorage.getItem(KEY) ?? "[]"));
  } catch {
    return [];
  }
}

export function writeHistory(history: readonly string[]): void {
  try {
    if (history.length === 0) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, JSON.stringify(history));
  } catch {
    // Sem armazenamento: o histórico só não persiste.
  }
}
