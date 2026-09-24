import { z } from "zod";

/**
 * Dados do cartão (Figma 2568:1505).
 *
 * Desde 2026-09-24 estes campos vão do navegador DIRETO à API e dela à Cielo
 * (`features/payment/api.ts`) — nunca pelo servidor do Next, nunca gravados. A
 * validação aqui existe para o formulário não deixar passar dado obviamente
 * errado antes de gastar uma tentativa na operadora.
 *
 * Como sempre neste projeto: validação de UX. Quem valida cartão de verdade é a
 * adquirente.
 */

/** Luhn — o dígito verificador que todo cartão tem. Pega erro de digitação. */
function passesLuhn(digits: string) {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let value = digits.charCodeAt(i) - 48;
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    double = !double;
  }
  return sum % 10 === 0;
}

const onlyDigits = (value: string) => value.replace(/\D/g, "");

export const cardSchema = z.object({
  holder: z
    .string()
    .trim()
    .min(3, "Informe o nome como está no cartão.")
    .max(80, "Nome muito longo."),

  number: z
    .string()
    .transform(onlyDigits)
    .refine((v) => v.length >= 13 && v.length <= 19, {
      message: "Número de cartão inválido.",
    })
    .refine(passesLuhn, { message: "Número de cartão inválido." }),

  expiry: z
    .string()
    .trim()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Use o formato MM/AA.")
    .refine((value) => {
      const [month, year] = value.split("/").map(Number);
      // Último instante do mês de validade: um cartão vale ATÉ o fim do mês
      // impresso, não até o dia 1º.
      const expiresAt = new Date(2000 + year, month, 0, 23, 59, 59);
      return expiresAt.getTime() >= Date.now();
    }, "Cartão vencido."),

  cvv: z
    .string()
    .transform(onlyDigits)
    .refine((v) => v.length === 3 || v.length === 4, {
      message: "Código inválido.",
    }),

  installments: z.coerce.number().int().min(1).max(12),

  /** Quantas Lets Coins abater. Zero = não usar. */
  coins: z.coerce.number().int().min(0),

  notes: z.string().trim().max(500, "Máximo de 500 caracteres."),
});

export type CardFormValues = z.infer<typeof cardSchema>;

/** No PIX só o que não é do cartão continua valendo. */
export const pixSchema = cardSchema.pick({ installments: true, coins: true, notes: true });
