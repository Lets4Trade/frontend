import { z } from "zod";

/**
 * A ÚNICA regra de senha nova do frontend.
 *
 * Ela espelha o `PASSWORD_REGEX` do backend
 * (`../backend/src/app/auth/dto/auth.dto.ts`):
 *
 *   /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
 *
 * — 8 caracteres ou mais, com ao menos uma minúscula, uma maiúscula e um
 * número. Sem exigência de símbolo.
 *
 * ESTE ARQUIVO EXISTE PORQUE A REGRA ESTAVA DUPLICADA E DIVERGENTE: o cadastro
 * cobrava as três classes de caractere, e a troca de senha do painel cobrava só
 * o comprimento. Uma senha como "12345678" passava na tela e voltava 400 do
 * servidor — o pior dos dois mundos, porque o usuário só descobria a regra
 * depois de enviar.
 *
 * Isto continua sendo validação de UX: quem decide é o servidor, que revalida.
 * O objetivo é a pessoa descobrir a regra ENQUANTO digita. Se a regra mudar no
 * backend, muda aqui — e em nenhum outro lugar.
 */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

/** Texto único da regra, para placeholder, dica e mensagem de erro do servidor. */
export const PASSWORD_RULE_TEXT =
  "A senha precisa ter ao menos 8 caracteres, com uma maiúscula, uma minúscula e um número.";

export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN, "A senha precisa ter ao menos 8 caracteres.")
  .max(PASSWORD_MAX, "Senha muito longa.")
  .regex(/[a-z]/, "Inclua ao menos uma letra minúscula.")
  .regex(/[A-Z]/, "Inclua ao menos uma letra maiúscula.")
  .regex(/\d/, "Inclua ao menos um número.");

/**
 * Variante para campos onde trocar a senha é OPCIONAL (o painel do usuário):
 * vazio significa "não mexer", e qualquer coisa digitada passa pela regra
 * inteira.
 */
export const optionalNewPasswordSchema = z
  .string()
  .refine((value) => value === "" || newPasswordSchema.safeParse(value).success, {
    message: PASSWORD_RULE_TEXT,
  });
