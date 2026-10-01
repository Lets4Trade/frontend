/**
 * "Editar preços" (2026-10-01) — regras puras da tabela, fora do componente
 * para serem testadas. Dinheiro em CENTAVOS inteiros, como na API.
 */

/** Mesmo teto do `priceCents` do backend (`CreateProductDto`). */
export const MAX_PRICE_CENTS = 10_000_000;

/** Mesmo teto do lote no backend (`MAX_PRICE_BATCH` = uma aba inteira). */
export const MAX_PRICE_BATCH = 300;

/**
 * Variação a partir da qual a linha ganha aviso: um zero a mais ou a menos
 * ("41" no lugar de "4,10") é o erro de digitação mais caro desta tela.
 */
export const BIG_CHANGE_RATIO = 0.5;

/**
 * Texto digitado → centavos, ou `null` se não for um preço válido.
 *
 * Aceita o jeito brasileiro ("4,10", "1.234,56", "R$ 4,10") e o ponto como
 * decimal quando não há vírgula e ele tem 1–2 casas depois ("4.10"). Conta com
 * STRINGS, não com float: "0,29" vira 29, não 28,999….
 */
export function parsePriceInput(raw: string): number | null {
  let text = raw.replace(/R\$/gi, "").replace(/\s/g, "");
  if (!text) return null;

  if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else {
    const dots = text.split(".").length - 1;
    // "1.234" (milhar) vs "4.10" (decimal): ponto único com 1–2 casas é decimal.
    if (dots > 1 || (dots === 1 && !/\.\d{1,2}$/.test(text))) text = text.replace(/\./g, "");
  }

  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents < 1 || cents > MAX_PRICE_CENTS) return null;
  return cents;
}

/** Centavos → "4,10" (o que vai no campo; sem "R$", para editar fácil). */
export function formatPriceInput(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Ajuste percentual SOBRE O PREÇO ATUAL (o gravado), não sobre o rascunho:
 * aplicar +5% duas vezes dá +5%, não +10,25% — o resultado não depende de
 * quantas vezes o botão foi clicado. `null` se o resultado sair da faixa.
 */
export function applyPercent(currentCents: number, percent: number): number | null {
  if (!Number.isFinite(percent)) return null;
  const next = Math.round((currentCents * (100 + percent)) / 100);
  return next >= 1 && next <= MAX_PRICE_CENTS ? next : null;
}

/** "+5", "-2,5", "5%" → número; `null` se não der. */
export function parsePercent(raw: string): number | null {
  const text = raw.replace(/%/g, "").replace(/\s/g, "").replace(",", ".");
  if (!/^[+-]?\d+(\.\d+)?$/.test(text)) return null;
  const value = Number(text);
  return value > -100 && value <= 1000 ? value : null;
}

/** Variação relativa (0,05 = +5%). */
export function changeRatio(currentCents: number, nextCents: number): number {
  return currentCents > 0 ? (nextCents - currentCents) / currentCents : 0;
}

export type PriceRow = { id: string; priceCents: number };

/**
 * O lote que vai para a API: só as linhas cujo rascunho é um preço VÁLIDO e
 * DIFERENTE do atual, cada uma com o preço lido (`expectedPriceCents`) para o
 * backend recusar se alguém mudou no meio do caminho. Linha com texto
 * inválido não entra — a tela bloqueia o salvar enquanto houver alguma.
 */
export function buildPriceChanges(rows: readonly PriceRow[], drafts: Readonly<Record<string, string>>) {
  const changes: { id: string; priceCents: number; expectedPriceCents: number }[] = [];
  const invalid: string[] = [];
  for (const row of rows) {
    const draft = drafts[row.id];
    if (draft === undefined) continue;
    const cents = parsePriceInput(draft);
    if (cents === null) {
      invalid.push(row.id);
      continue;
    }
    if (cents !== row.priceCents) {
      changes.push({ id: row.id, priceCents: cents, expectedPriceCents: row.priceCents });
    }
  }
  return { changes, invalid };
}
