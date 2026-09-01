import { z } from "zod";

/**
 * Validação de formulário — camada de UX, NÃO de segurança.
 * O backend precisa revalidar tudo isto no boundary dele: qualquer um pode
 * postar direto no endpoint sem passar por este código.
 *
 * O limite de 8 caracteres vale só para CADASTRO. No login não impomos regra
 * de força: uma conta antiga pode ter senha curta e travá-la aqui impediria
 * o login sem ganho de segurança nenhum. O máximo de 128 existe para não
 * mandar payload absurdo ao servidor (o hash é caro por design).
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Informe seu e-mail.")
    .email("E-mail inválido.")
    .max(254, "E-mail muito longo."),
  password: z
    .string()
    .min(1, "Informe sua senha.")
    .max(128, "Senha muito longa."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Cadastro (Figma 1953:855). Diferente do login, aqui a senha TEM regra de
 * força: é o momento em que ela é escolhida, então exigir um mínimo é útil.
 * No login isso seria só um obstáculo para quem já tem conta antiga.
 *
 * Mesma ressalva do login: isto é UX. O backend precisa revalidar tudo — e é
 * ele quem decide unicidade de e-mail e de nome de usuário, que o cliente não
 * tem como saber.
 */
export const signupSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Informe seu e-mail.")
    .email("E-mail inválido.")
    .max(254, "E-mail muito longo."),
  name: z
    .string()
    .trim()
    .min(3, "Use ao menos 3 caracteres.")
    .max(30, "Máximo de 30 caracteres.")
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      "Use apenas letras, números, ponto, hífen ou underline.",
    ),
  // Espelha o `PASSWORD_REGEX` do backend (auth.dto.ts): 8+ caracteres com ao
  // menos uma minúscula, uma maiúscula e um número. Não é validação de
  // segurança — o servidor revalida e é ele quem decide. É para o usuário
  // descobrir a regra ENQUANTO digita, em vez de levar um 400 genérico depois
  // de preencher o formulário inteiro. Se a regra mudar lá, mude aqui junto.
  password: z
    .string()
    .min(8, "A senha precisa ter ao menos 8 caracteres.")
    .max(128, "Senha muito longa.")
    .regex(/[a-z]/, "Inclua ao menos uma letra minúscula.")
    .regex(/[A-Z]/, "Inclua ao menos uma letra maiúscula.")
    .regex(/\d/, "Inclua ao menos um número."),
  // Telefone guardado como veio; a normalização para E.164 é do servidor, que
  // é quem manda a mensagem. `libphonenumber-js` está no projeto se um dia for
  // preciso validar operadora/formato de verdade — hoje seria peso de bundle
  // numa tela de entrada sem ganho real, já que o servidor revalida.
  whatsapp: z
    .string()
    .trim()
    .min(1, "Informe seu WhatsApp.")
    .refine(
      (value) => {
        const digits = value.replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 15;
      },
      { message: "Número inválido. Inclua DDD." },
    ),
});

export type SignupFormValues = z.infer<typeof signupSchema>;
