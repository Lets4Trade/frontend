import { z } from "zod";
import { PLATFORMS, PRODUCT_TYPES } from "./options";

/**
 * Validação do cadastro de jogo (Figma 4468:1792).
 *
 * Como sempre neste projeto: isto é validação de UX. Ela existe para a pessoa
 * saber do erro na hora, sem esperar um 400 voltar. Quem valida de verdade é o
 * `CreateGameDto` do backend, e os limites aqui são os mesmos de lá — nome de
 * 2 a 120, no máximo 40 servidores de até 120 caracteres. Divergir faria a tela
 * aceitar o que o servidor recusa, que é o pior dos dois mundos.
 */

const platformValues = PLATFORMS.map((o) => o.value) as [string, ...string[]];
const productTypeValues = PRODUCT_TYPES.map((o) => o.value) as [string, ...string[]];

/** Teto de servidores. Espelha o `@ArrayMaxSize(40)` do DTO. */
export const MAX_SERVERS = 40;

/**
 * "Standard, Hardcore , , Eternal" → ["Standard", "Hardcore", "Eternal"].
 *
 * Vírgula sobrando e espaço duplo são o que acontece quando alguém digita uma
 * lista à mão. Recusar o formulário por causa disso seria pedir que a pessoa
 * limpe o que o código limpa em uma linha.
 */
export function parseServers(raw: string): string[] {
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}

export const createGameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome do jogo precisa ter ao menos 2 caracteres.")
    .max(120, "O nome do jogo é longo demais."),

  // Link na loja (`/games/<slug>`), editável desde 2026-09-25. Vazio = o
  // servidor deriva do nome. A normalização acontece nas duas pontas (prévia
  // aqui, gravação no backend); o que o schema barra é só o tamanho.
  slug: z.string().trim().max(80, "O link pode ter no máximo 80 caracteres.").default(""),

  platform: z.enum(platformValues, {
    message: "Escolha a plataforma do jogo.",
  }),

  productType: z.enum(productTypeValues, {
    message: "Escolha o tipo de produto do jogo.",
  }),

  servers: z
    .string()
    .transform(parseServers)
    .refine((list) => list.length <= MAX_SERVERS, {
      message: `São no máximo ${MAX_SERVERS} servidores.`,
    })
    .refine((list) => list.every((entry) => entry.length <= 120), {
      message: "Cada servidor pode ter no máximo 120 caracteres.",
    }),
});

export type CreateGameValues = z.infer<typeof createGameSchema>;
