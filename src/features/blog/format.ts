/**
 * Data da notícia em pt-BR curto ("17/04/26"), a partir do ISO do backend.
 *
 * Fuso FIXO de São Paulo: o servidor do Next roda em UTC, e uma matéria
 * publicada às 22h daqui sairia com a data do dia seguinte.
 *
 * Sem data legível devolve texto vazio — "Invalid Date" na vitrine é pior que
 * nenhuma data.
 */
export function formatBlogDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

/** Etiqueta de cache das leituras públicas do blog (derrubada pelo painel). */
export const BLOG_TAG = "blog";
