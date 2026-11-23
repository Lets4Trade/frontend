/**
 * "Editar preços" (2026-10-01) — regras puras da tabela, fora do componente
 * para serem testadas. Dinheiro em CENTAVOS, como na API — com até 2 casas
 * desde 2026-11-09 (R$ 0,035 = 3,5).
 */

import { MAX_PRICE_CENTS } from "@/features/pricing/quote";
import { categorySelectOptions } from "./categoryOptions";

/** Mesmo teto do `priceCents` do backend (`CreateProductDto`): R$ 20 mi. */
export { MAX_PRICE_CENTS };

/**
 * Mesmo teto do lote no backend (`MAX_PRICE_BATCH` = `MAX_ORDERABLE` = uma aba
 * inteira). Era 300; a aba Itens do ARC Raiders passou disso (333) em 2026-11-10.
 */
export const MAX_PRICE_BATCH = 1000;

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
  // 0 vale (2026-11-11): produto grátis.
  if (!Number.isSafeInteger(points) || points < 0 || points > MAX_PRICE_CENTS * 100) return null;
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
  /** Oculto do site (2026-11-17). */
  hidden?: boolean;
};

/**
 * Rascunhos da tabela, um mapa por coluna. Ausente = a pessoa não mexeu. Na
 * categoria, `""` é "Sem categoria".
 */
export type RowDrafts = {
  price: Readonly<Record<string, string>>;
  name: Readonly<Record<string, string>>;
  category: Readonly<Record<string, string>>;
  /** Oculto do site (2026-11-17): o estado escolhido na tela (o olho). */
  hidden?: Readonly<Record<string, boolean>>;
  /** Excluir (2026-11-17): marcadas para a lixeira no salvar. */
  remove?: Readonly<Record<string, boolean>>;
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
  /** Oculto do site (2026-11-17): ausente = não mexe. */
  hidden?: boolean;
  /** Excluir (2026-11-17): manda para a lixeira (reativável na Central). */
  remove?: true;
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

    const hiddenDraft = drafts.hidden?.[row.id];
    if (hiddenDraft !== undefined && hiddenDraft !== Boolean(row.hidden)) change.hidden = hiddenDraft;

    // Excluir vence o resto: a linha vai para a lixeira, e um preço inválido
    // digitado nela antes não bloqueia o salvar.
    if (drafts.remove?.[row.id]) {
      changes.push({ id: row.id, expectedPriceCents: row.priceCents, remove: true });
      continue;
    }

    if (bad) invalid.push(row.id);
    else if (
      change.priceCents !== undefined ||
      change.name !== undefined ||
      change.categoryId !== undefined ||
      change.hidden !== undefined
    ) {
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

export type RowGroup<T> = { key: string; label: string; rows: T[] };

/**
 * Linhas da tabela agrupadas pela categoria PRINCIPAL gravada (2026-11-19),
 * para recolher grupos e a aba de 300+ itens caber na tela.
 *
 *  - Ordem dos grupos = ordem da árvore de categorias do jogo (a mesma do
 *    select); categoria que sumiu do jogo vem depois, e "Sem categoria" por
 *    último. Dentro do grupo, a ordem de entrada (a da loja) é mantida.
 *  - Agrupa pelo valor GRAVADO, como os filtros: trocar a categoria de uma
 *    linha não a faz pular de grupo enquanto se edita.
 *  - Duas categorias com o mesmo rótulo (uma por servidor, com "Todos os
 *    servidores") ganham o servidor no nome, senão o painel mostra dois
 *    "Armas" sem dizer qual é qual.
 */
export function groupRowsByCategory<T extends { categoryId?: string | null }>(
  rows: readonly T[],
  categories: readonly ScopedCategory[],
  serverLabels: ReadonlyMap<string, string>,
): RowGroup<T>[] {
  const byKey = new Map<string, T[]>();
  for (const row of rows) {
    const key = row.categoryId || NO_CATEGORY;
    const list = byKey.get(key);
    if (list) list.push(row);
    else byKey.set(key, [row]);
  }

  const options = categorySelectOptions(categories);
  const known = new Set(options.map((option) => option.value));
  const groups: RowGroup<T>[] = [];
  for (const option of options) {
    const list = byKey.get(option.value);
    if (list) groups.push({ key: option.value, label: option.label, rows: list });
  }
  for (const [key, list] of byKey) {
    if (key !== NO_CATEGORY && !known.has(key)) groups.push({ key, label: "Categoria removida", rows: list });
  }
  const loose = byKey.get(NO_CATEGORY);
  if (loose) groups.push({ key: NO_CATEGORY, label: "Sem categoria", rows: loose });

  const count = new Map<string, number>();
  for (const group of groups) count.set(group.label, (count.get(group.label) ?? 0) + 1);
  const scope = new Map(categories.map((category) => [category.id, category.serverId ?? null]));
  return groups.map((group) => {
    const serverId = scope.get(group.key);
    const server = serverId ? serverLabels.get(serverId) : undefined;
    return (count.get(group.label) ?? 0) > 1 && server ? { ...group, label: `${group.label} · ${server}` } : group;
  });
}
