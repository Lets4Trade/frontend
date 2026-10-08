import { z } from "zod";

/**
 * Validação do cadastro de produto (Figma 3806:6735).
 *
 * Validação de UX: avisa na hora, sem esperar o 400 voltar. Quem decide é o
 * `CreateProductDto` do backend, e os limites são os mesmos — nome de 2 a 160,
 * preço de 1 centavo a R$ 100.000,00.
 *
 * O que NÃO dá para validar aqui é a coerência com o jogo (a plataforma
 * escolhida ser mesmo uma das do jogo). A tela impede pela construção dos
 * selects, e o `ProductsService` confere de verdade — porque a tela é uma
 * conveniência e o endpoint aceita quem chamar direto.
 */

/** Espelha o `@Max(10_000_000)` do DTO: R$ 100.000,00 em centavos. */
export const MAX_PRICE_CENTS = 10_000_000;

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
  priceCents: z.coerce
    .number()
    .int()
    .min(1, "Informe o preço do produto.")
    .max(MAX_PRICE_CENTS, "O preço passa do teto de R$ 100.000,00."),


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
