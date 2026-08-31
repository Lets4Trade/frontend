import { z } from "zod";

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
  password: z
    .string()
    .refine((v) => v === "" || (v.length >= 8 && v.length <= 128), {
      message: "A nova senha precisa ter entre 8 e 128 caracteres.",
    }),
});

export type EditProfileValues = z.infer<typeof editProfileSchema>;
