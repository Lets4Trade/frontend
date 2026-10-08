/**
 * A descrição do jogo (etapa 9 do builder), estruturada desde 2026-10-08:
 * quantos BLOCOS o admin quiser, cada um com um título e pares subtítulo +
 * texto, desenhados NO LUGAR do grupo "Dúvidas frequentes" padrão. O título faz
 * o papel de "Dúvidas frequentes" (com a barrinha laranja), o subtítulo o de
 * uma pergunta e o texto o da resposta.
 *
 * Os tetos espelham o `DESCRIPTION_LIMITS` do `SaveGamePageDto` do backend.
 */
export const DESCRIPTION_LIMITS = {
  groups: 30,
  itemsPerGroup: 50,
  title: 200,
  subtitle: 200,
  text: 5000,
  totalChars: 100_000,
} as const;

export type GameDescriptionItem = { subtitle: string; text: string };

export type GameDescriptionGroup = {
  /** Vazio = bloco sem título (só os subtítulos e textos). */
  title: string;
  items: GameDescriptionItem[];
};

/**
 * Lê o que a API devolve, sem confiar no formato: `descriptionGroups` é JSON no
 * banco e pode ter sido mexido à mão. Par vazio e bloco sem título nem par
 * somem; sem bloco nenhum, não há descrição (a página usa as Dúvidas padrão).
 */
export function toGameDescription(groups: unknown): GameDescriptionGroup[] | undefined {
  if (!Array.isArray(groups)) return undefined;

  const kept = groups
    .slice(0, DESCRIPTION_LIMITS.groups)
    .map((group): GameDescriptionGroup => ({
      title: readText(group, "title", DESCRIPTION_LIMITS.title),
      items: readItems(group),
    }))
    .filter((group) => group.title !== "" || group.items.length > 0);
  return kept.length > 0 ? kept : undefined;
}

function readItems(group: unknown): GameDescriptionItem[] {
  const items = isRecord(group) ? group.items : undefined;
  if (!Array.isArray(items)) return [];
  return items
    .slice(0, DESCRIPTION_LIMITS.itemsPerGroup)
    .map((item) => ({
      subtitle: readText(item, "subtitle", DESCRIPTION_LIMITS.subtitle),
      text: readText(item, "text", DESCRIPTION_LIMITS.text),
    }))
    .filter((item) => item.subtitle !== "" || item.text !== "");
}

function readText(source: unknown, field: string, max: number): string {
  const value = isRecord(source) ? source[field] : undefined;
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
