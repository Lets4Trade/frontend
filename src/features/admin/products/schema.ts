import { z } from "zod";
import { isPriceCents, MAX_PRICE_CENTS } from "@/features/pricing/quote";
import { MAX_DISCOUNT_PERCENT } from "@/features/game/discount";

/**
 * Validação do cadastro de produto (Figma 3806:6735).
 *
 * Validação de UX: avisa na hora, sem esperar o 400 voltar. Quem decide é o
 * `CreateProductDto` do backend, e os limites são os mesmos — nome de 2 a 160,
 * preço de 1 centavo a R$ 20 milhões (teto técnico, 2026-10-15).
 *
 * O que NÃO dá para validar aqui é a coerência com o jogo (a plataforma
 * escolhida ser mesmo uma das do jogo). A tela impede pela construção dos
 * selects, e o `ProductsService` confere de verdade — porque a tela é uma
 * conveniência e o endpoint aceita quem chamar direto.
 */

/** Espelha o `@Max(MAX_PRICE_CENTS)` do DTO: R$ 20 mi (era R$ 100 mil até 2026-10-15). */
export { MAX_PRICE_CENTS };

/** Selo do card e categorias extras (2026-11-04): tetos do backend. */
export const MAX_BADGE_CHARS = 24;
export const MAX_EXTRA_CATEGORIES = 20;
/** Atalhos do selo (o campo aceita qualquer texto). */
export const BADGE_PRESETS = ["Novo", "Em alta"] as const;

export const createProductSchema = z.object({
  gameId: z.string().min(1, "Escolha o jogo do produto."),

  name: z
    .string()
    .trim()
    .min(2, "O nome do produto precisa ter ao menos 2 caracteres.")
    .max(160, "O nome do produto é longo demais."),

  /** Nome em inglês (2026-10-08), segunda linha do card. Vazio = sem. */
  nameEn: z.string().trim().max(160, "O nome em inglês é longo demais.").default(""),

  // Chega do `<input type="hidden">` do `MoneyField`, sempre como string de
  // dígitos. `coerce` aqui é seguro justamente porque a origem é controlada.
  // Desde 2026-11-09: até 2 casas em centavos (R$ 0,035 = 3,5) e 0 aceito —
  // preço zero vale em qualquer aba (2026-11-11: produto grátis)
  // (`assertZeroPriceAllowed`), que devolve a mensagem.
  priceCents: z.coerce
    .number()
    .min(0, "Informe o preço do produto.")
    .max(MAX_PRICE_CENTS, "O preço passa do teto de R$ 20.000.000,00.")
    .refine(isPriceCents, "O preço aceita até 4 casas depois da vírgula (ex.: 0,035)."),

  /**
   * Desconto do pacote em % inteiro (2026-10-27). Vazio/ausente = 0 (o campo
   * só aparece em aba de catálogo). Mesmo teto do backend: 90%.
   */
  discountPercent: z.coerce
    .number()
    .int("O desconto é um número inteiro (ex.: 5).")
    .min(0, "O desconto não pode ser negativo.")
    .max(MAX_DISCOUNT_PERCENT, `O desconto vai até ${MAX_DISCOUNT_PERCENT}%.`)
    .default(0),


  /**
   * A ABA do jogo onde o produto aparece (contrato `game-tabs.md`,
   * 2026-09-28) — no lugar do antigo "tipo de produto", que o backend agora
   * deriva da aba. Vai para o corpo, mas o formato é fechado do mesmo jeito.
   */
  tabId: z
    .string()
    .min(1, "Escolha a aba do produto.")
    .regex(/^[A-Za-z0-9_-]{1,100}$/, "Aba inválida."),

  /** Vazio é válido: um jogo pode não ter servidores cadastrados. */
  serverId: z.string().optional().default(""),

  /**
   * Vazio é válido: a categoria é opcional, e um jogo que ainda não passou pelo
   * Builder de Páginas não tem nenhuma para escolher.
   */
  categoryId: z.string().optional().default(""),

  /** Nome no "Selecionar serviço" (2026-11-04). Vazio = usa o nome do produto. */
  serviceLabel: z.string().trim().max(160, "O nome no menu é longo demais.").default(""),

  /** Selo do card (2026-11-04): "Novo", "Em alta" ou livre. Vazio = sem selo. */
  badgeText: z.string().trim().max(MAX_BADGE_CHARS, `O selo vai até ${MAX_BADGE_CHARS} caracteres.`).default(""),

  /**
   * Categorias EXTRAS (2026-11-04): chegam do `<input type="hidden">` com o
   * JSON da lista. Mesmo formato fechado de id do resto; teto do backend.
   */
  extraCategoryIds: z
    .preprocess((value) => {
      if (typeof value !== "string" || value.trim() === "") return [];
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }, z.array(z.string().regex(/^[A-Za-z0-9_-]{1,100}$/, "Categoria inválida.")).max(MAX_EXTRA_CATEGORIES, `No máximo ${MAX_EXTRA_CATEGORIES} categorias extras.`))
    .default([]),
});

export type CreateProductValues = z.infer<typeof createProductSchema>;

/**
 * "Tópicos do card" de PACOTE (contrato `game-tabs-v2.md`, 2026-09-30) — as
 * linhas com bolinha do card ("Manual Boosting Guarantee"). Mesmos limites do
 * backend: até 12 tópicos de até 200 caracteres, TEXTO PURO (a vitrine
 * renderiza como texto). Normaliza como o backend: trim e vazios removidos —
 * uma linha em branco no meio do campo não vira tópico vazio.
 */
// Subidos em 2026-10-06 (espelham o backend).
export const MAX_HIGHLIGHTS = 12;
export const MAX_HIGHLIGHT_CHARS = 200;

export const highlightsSchema = z
  .array(z.string().max(1000, "Tópico longo demais."))
  .max(50, "Tópicos demais.")
  .transform((items) => items.map((item) => item.trim()).filter((item) => item !== ""))
  .pipe(
    z
      .array(
        z
          .string()
          .max(MAX_HIGHLIGHT_CHARS, `Cada tópico do card pode ter no máximo ${MAX_HIGHLIGHT_CHARS} caracteres.`),
      )
      .max(MAX_HIGHLIGHTS, `O card aceita no máximo ${MAX_HIGHLIGHTS} tópicos.`),
  );

/** Texto do campo (uma linha por tópico) → lista normalizada, ou a mensagem do zod. */
export function parseHighlights(
  text: string,
): { ok: true; highlights: string[] } | { ok: false; message: string } {
  const parsed = highlightsSchema.safeParse(text.split(/\r?\n/));
  return parsed.success
    ? { ok: true, highlights: parsed.data }
    : { ok: false, message: parsed.error.issues[0]?.message ?? "Tópicos inválidos." };
}
