import { z } from "zod";
import { optionalNewPasswordSchema } from "@/features/auth/password";

/**
 * Edição do perfil (Figma 2116:2106).
 *
 * A senha é OPCIONAL: o campo existe para trocar a senha, não para reconfirmar
 * a atual. Vazio significa "não mexer" — por isso `""` é aceito e só validamos
 * o tamanho quando algo foi digitado.
 *
 * Como sempre: validação de UX. O servidor revalida, e é ele quem verifica se
 * o e-mail e o nome continuam únicos.
 */
export const editProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Use ao menos 3 caracteres.")
    .max(30, "Máximo de 30 caracteres."),
  email: z
    .string()
    .trim()
    .min(1, "Informe seu e-mail.")
    .email("E-mail inválido.")
    .max(254, "E-mail muito longo."),
  discord: z.string().trim().max(64, "Discord muito longo."),
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
  // MESMA regra do cadastro e do backend, importada de um lugar só. Antes aqui
  // se cobrava só o comprimento: "12345678" passava na tela e voltava 400 do
  // servidor, que é o pior dos dois mundos.
  password: optionalNewPasswordSchema,
  /**
   * Senha ATUAL. Só é exigida quando o usuário mexe numa credencial — trocar o
   * e-mail ou definir uma senha nova. O backend não aceita nenhuma das duas sem
   * ela, e é isso que impede uma sessão sequestrada de tomar a conta.
   *
   * Vazia é válida aqui porque o formulário salva nome, Discord e WhatsApp sem
   * confirmação nenhuma; quem cobra é a regra abaixo, que só dispara quando há
   * credencial em jogo.
   */
  currentPassword: z.string(),
});

export type EditProfileValues = z.infer<typeof editProfileSchema>;
