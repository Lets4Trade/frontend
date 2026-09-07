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

  // Chega do `<input type="hidden">` do `MoneyField`, sempre como string de
  // dígitos. `coerce` aqui é seguro justamente porque a origem é controlada.
  priceCents: z.coerce
    .number()
    .int()
    .min(1, "Informe o preço do produto.")
    .max(MAX_PRICE_CENTS, "O preço passa do teto de R$ 100.000,00."),

  platform: z.string().min(1, "Escolha a plataforma."),
  productType: z.string().min(1, "Escolha o tipo de produto."),

  /** Vazio é válido: um jogo pode não ter servidores cadastrados. */
  serverId: z.string().optional().default(""),
});

export type CreateProductValues = z.infer<typeof createProductSchema>;
