/**
 * "Editar preços" (2026-10-01) — regras puras da tabela, fora do componente
 * para serem testadas. Dinheiro em CENTAVOS, como na API — com até 2 casas
 * desde 2026-11-09 (R$ 0,035 = 3,5).
 */

import { MAX_PRICE_CENTS } from "@/features/pricing/quote";

/** Mesmo teto do `priceCents` do backend (`CreateProductDto`): R$ 20 mi. */
export { MAX_PRICE_CENTS };

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
 * Aceita o jeito brasileiro ("4,10", "1.234,56", "R$ 4,10", "0,035") e o
 * ponto como decimal quando não há vírgula e ele é claramente decimal ("4.10",
 * "0.035"). Até 4 casas em reais (2026-11-09). Conta com STRINGS, não com
 * float: "0,29" vira 29, não 28,999….
 */
export function parsePriceInput(raw: string): number | null {
  let text = raw.replace(/R\$/gi, "").replace(/\s/g, "");
  if (!text) return null;

  if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else {
    const dots = text.split(".").length - 1;
    // "1.234" (milhar) vs "4.10" / "0.035" / "0.0035" (decimal).
    const decimalDot = /\.\d{1,2}$/.test(text) || /\.\d{4}$/.test(text) || /^0\.\d{3}$/.test(text);
    if (dots > 1 || (dots === 1 && !decimalDot)) text = text.replace(/\./g, "");
  }

  const match = /^(\d+)(?:\.(\d{1,4}))?$/.exec(text);
  if (!match) return null;
  // Décimos-milésimos de real (= centésimos de centavo), inteiros.
  const points = Number(match[1]) * 10_000 + Number((match[2] ?? "").padEnd(4, "0"));
  if (!Number.isSafeInteger(points) || points < 1 || points > MAX_PRICE_CENTS * 100) return null;
  return points / 100;
}

/** Centavos → "4,10" (o que vai no campo; sem "R$", para editar fácil). */
export function formatPriceInput(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

/**
 * Ajuste percentual SOBRE O PREÇO ATUAL (o gravado), não sobre o rascunho:
 * aplicar +5% duas vezes dá +5%, não +10,25% — o resultado não depende de
 * quantas vezes o botão foi clicado. `null` se o resultado sair da faixa.
 */
export function applyPercent(currentCents: number, percent: number): number | null {
  if (!Number.isFinite(percent)) return null;
  // Preço em centavo inteiro arredonda para o centavo, como sempre; com fração
  // de centavo (2026-11-09), para o centésimo de centavo (4 casas em reais).
  const next = Number.isInteger(currentCents)
    ? Math.round((currentCents * (100 + percent)) / 100)
    : Math.round(Math.round(currentCents * 100) * (100 + percent) / 100) / 100;
  return next >= (Number.isInteger(currentCents) ? 1 : 0.01) && next <= MAX_PRICE_CENTS ? next : null;
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

/** Mesmas regras do cadastro (`CreateProductDto.name`): aparado, 2–160. */
export const NAME_MIN = 2;
export const NAME_MAX = 160;

/** Valor do filtro "Sem categoria" (`?categoria=sem-categoria`); id de verdade é cuid. */
export const NO_CATEGORY = "sem-categoria";

export type EditableRow = {
  id: string;
  priceCents: number;
  name: string;
  categoryId?: string | null;
};

/**
 * Rascunhos da tabela, um mapa por coluna. Ausente = a pessoa não mexeu. Na
 * categoria, `""` é "Sem categoria".
 */
export type RowDrafts = {
  price: Readonly<Record<string, string>>;
  name: Readonly<Record<string, string>>;
  category: Readonly<Record<string, string>>;
};

export type RowChange = {
  id: string;
  /** Sempre: é a trava da linha no backend. */
  expectedPriceCents: number;
  priceCents?: number;
  name?: string;
  expectedName?: string;
  /** `null` = tirar a categoria. */
  categoryId?: string | null;
  expectedCategoryId?: string | null;
};

/** Nome digitado → nome a gravar, ou `null` se não couber nas regras. */
export function parseNameInput(raw: string): string | null {
  const name = raw.trim();
  return name.length >= NAME_MIN && name.length <= NAME_MAX ? name : null;
}

/**
 * O lote que vai para a API (2026-11-04: preço, nome e categoria): uma entrada
 * por produto com ALGUMA coluna válida e diferente da gravada, cada campo
 * trocado com o valor lido (`expected*`) para o backend recusar se alguém
 * mudou no meio do caminho. Linha com preço ou nome inválido não entra — a
 * tela bloqueia o salvar enquanto houver alguma.
 */
export function buildRowChanges(rows: readonly EditableRow[], drafts: RowDrafts) {
  const changes: RowChange[] = [];
  const invalid: string[] = [];
  for (const row of rows) {
    const change: RowChange = { id: row.id, expectedPriceCents: row.priceCents };
    let bad = false;

    const priceDraft = drafts.price[row.id];
    if (priceDraft !== undefined) {
      const cents = parsePriceInput(priceDraft);
      if (cents === null) bad = true;
      else if (cents !== row.priceCents) change.priceCents = cents;
    }

    const nameDraft = drafts.name[row.id];
    if (nameDraft !== undefined) {
      const name = parseNameInput(nameDraft);
      if (name === null) bad = true;
      else if (name !== row.name) {
        change.name = name;
        change.expectedName = row.name;
      }
    }

    const categoryDraft = drafts.category[row.id];
    const currentCategory = row.categoryId ?? null;
    if (categoryDraft !== undefined && (categoryDraft || null) !== currentCategory) {
      change.categoryId = categoryDraft || null;
      change.expectedCategoryId = currentCategory;
    }

    if (bad) invalid.push(row.id);
    else if (change.priceCents !== undefined || change.name !== undefined || change.categoryId !== undefined) {
      changes.push(change);
    }
  }
  return { changes, invalid };
}

type ScopedCategory = { id: string; label: string; parentId?: string | null; serverId?: string | null; tabId?: string | null };

/**
 * Categorias que valem para um produto: as do servidor + aba dele e as
 * globais (mesma regra do cadastro e do backend). `serverId` vazio no filtro
 * = qualquer servidor (todas as da aba).
 */
export function categoriesInScope<T extends ScopedCategory>(
  categories: readonly T[],
  tabId: string,
  serverId: string | null | undefined,
  anyServer = false,
): T[] {
  return categories.filter(
    (category) =>
      (!category.tabId || category.tabId === tabId) &&
      (anyServer || !category.serverId || category.serverId === (serverId ?? null)),
  );
}

/** A categoria do filtro e as subcategorias dela (filtrar "Moedas" pega "Moedas › Raras"). */
export function categoryWithChildren(categories: readonly ScopedCategory[], id: string): Set<string> {
  return new Set([id, ...categories.filter((category) => category.parentId === id).map((category) => category.id)]);
}
