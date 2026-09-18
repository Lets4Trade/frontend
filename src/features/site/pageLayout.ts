/**
 * Ordem e visibilidade das sessões de uma página fixa (2026-09-15).
 *
 * Arquivo PURO: o editor do painel é client component e o `content.ts` puxa a
 * leitura pública — a mesma separação do resto de `features/site`.
 *
 * ── A regra ────────────────────────────────────────────────────────────────
 * O CÓDIGO declara quais sessões existem e em que ordem nascem (o catálogo em
 * `sections.ts`). O BANCO guarda só o que foi reordenado ou escondido. Página
 * nunca tocada renderiza exatamente como antes — a mesma convenção que já vale
 * para título e arte, e que dispensou migrar dado.
 *
 * Sessão que o admin nunca moveu entra DEPOIS das movidas, na ordem do código:
 * assim um bloco novo, acrescentado numa versão futura, aparece no fim em vez
 * de sumir por não ter posição.
 */

export type SectionLayoutRow = {
  key: string;
  position?: number | null;
  hidden?: boolean;
};

export type SectionLayout = {
  /** Chaves curtas (sem a página), na ordem final, só as visíveis. */
  visible: string[];
  /** Chaves curtas escondidas, na ordem do código. */
  hidden: string[];
};

/**
 * @param catalogKeys chaves curtas na ordem do código (`["hero", "video", …]`)
 * @param rows linhas do banco, com a chave CHEIA (`home:hero`)
 * @param pageKey para casar as duas
 */
export function resolveSectionLayout(
  catalogKeys: readonly string[],
  rows: readonly SectionLayoutRow[],
  pageKey: string,
): SectionLayout {
  const byKey = new Map<string, SectionLayoutRow>();
  for (const row of rows) {
    const [page, section] = String(row.key).split(":");
    if (page === pageKey && section) byKey.set(section, row);
  }

  const positioned: { key: string; position: number }[] = [];
  const unpositioned: string[] = [];
  const hidden: string[] = [];

  catalogKeys.forEach((key) => {
    const row = byKey.get(key);
    // Falsy e não `=== true`: o backend apaga campo vazio da resposta, e
    // `hidden: false` pode chegar ausente.
    if (row?.hidden) {
      hidden.push(key);
      return;
    }
    if (typeof row?.position === "number") positioned.push({ key, position: row.position });
    else unpositioned.push(key);
  });

  positioned.sort((a, b) => a.position - b.position);

  return {
    visible: [...positioned.map((item) => item.key), ...unpositioned],
    hidden,
  };
}
