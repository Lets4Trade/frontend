/**
 * Máscaras de entrada — telefone e CNPJ.
 *
 * Funções PURAS (texto → texto formatado), usadas pelo `TextField` a cada
 * tecla e também na exibição de valores antigos. Formatar é UX: quem valida é
 * o schema do formulário e, de verdade, o backend. Nenhuma delas lança erro —
 * entrada estranha vira a melhor formatação possível, nunca uma exceção no
 * meio da digitação.
 */

export type MaskKind = "phone" | "cnpj";

const MAX_PHONE_DIGITS = 15; // E.164

/**
 * Telefone, formatado enquanto se digita.
 *
 * ── Brasil por padrão, internacional com "+" ──────────────────────────────
 * - Sem "+" e até 11 dígitos: número NACIONAL → `(11) 91234-5678` /
 *   `(11) 3456-7890`. É como brasileiro digita.
 * - Com "+", ou com 12+ dígitos começando por 55: internacional. DDI 55 ganha
 *   a mesma máscara (`+55 (11) 91234-5678`); outros países ficam `+` e os
 *   dígitos — o tamanho do DDI e do número varia demais para adivinhar grupos.
 *
 * "55" sem "+" e com até 11 dígitos continua nacional: 55 também é DDD (RS).
 */
export function formatPhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "").slice(0, MAX_PHONE_DIGITS);
  if (!digits) return trimmed.startsWith("+") ? "+" : "";

  const international =
    trimmed.startsWith("+") || (digits.length > 11 && digits.startsWith("55"));

  if (!international) return formatBrazilian(digits);
  if (digits.startsWith("55")) {
    const rest = digits.slice(2);
    return rest ? `+55 ${formatBrazilian(rest)}` : "+55";
  }
  return `+${digits}`;
}

/** DDD + número, progressivo: `(1`, `(11) 9123`, `(11) 91234-5678`. */
function formatBrazilian(digits: string): string {
  const d = digits.slice(0, 11);
  if (d.length <= 2) return `(${d}`;

  const ddd = d.slice(0, 2);
  const number = d.slice(2);
  // Celular tem 9 dígitos (5+4), fixo tem 8 (4+4). Enquanto não chegam os 9,
  // o hífen fica depois do 4º — que é onde ele estará se for fixo.
  const split = number.length > 8 ? 5 : 4;
  if (number.length <= split) return `(${ddd}) ${number}`;
  return `(${ddd}) ${number.slice(0, split)}-${number.slice(split)}`;
}

/**
 * CNPJ, formatado enquanto se digita: `00.000.000/0000-00`.
 *
 * Aceita o CNPJ ALFANUMÉRICO (Receita Federal, emitido a partir de julho de
 * 2026): as 12 primeiras posições podem ser letras ou dígitos — maiúsculas —, e
 * as duas últimas, os dígitos verificadores, são sempre números.
 */
export function formatCnpj(raw: string): string {
  const chars = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const base = chars.slice(0, 12);
  const check = chars.slice(12).replace(/\D/g, "").slice(0, 2);
  const all = base + check;

  const parts = [
    all.slice(0, 2),
    all.slice(2, 5),
    all.slice(5, 8),
    all.slice(8, 12),
    all.slice(12, 14),
  ];
  let out = parts[0];
  if (parts[1]) out += `.${parts[1]}`;
  if (parts[2]) out += `.${parts[2]}`;
  if (parts[3]) out += `/${parts[3]}`;
  if (parts[4]) out += `-${parts[4]}`;
  return out;
}

export const MASKS: Record<MaskKind, (raw: string) => string> = {
  phone: formatPhone,
  cnpj: formatCnpj,
};

/** Caractere que a máscara CONSERVA (o resto é pontuação que ela recoloca). */
function isSignificant(kind: MaskKind, ch: string): boolean {
  return kind === "cnpj" ? /[A-Za-z0-9]/.test(ch) : /\d/.test(ch);
}

/**
 * Reaplica a máscara no próprio `<input>`, preservando o cursor.
 *
 * O cursor é reposto depois do MESMO número de caracteres significativos que
 * havia antes dele — assim editar no meio do número não joga o cursor para o
 * fim a cada tecla. Apagar uma pontuação com Backspace só pula o cursor por
 * cima dela (a máscara a recoloca); a tecla seguinte apaga o dígito.
 */
export function applyMask(input: HTMLInputElement, kind: MaskKind): void {
  const raw = input.value;
  const caret = input.selectionStart ?? raw.length;

  let significantBefore = 0;
  for (let i = 0; i < caret; i += 1) {
    if (isSignificant(kind, raw[i])) significantBefore += 1;
  }

  const formatted = MASKS[kind](raw);
  if (formatted === raw) return;
  input.value = formatted;

  let position = 0;
  let seen = 0;
  while (position < formatted.length && seen < significantBefore) {
    if (isSignificant(kind, formatted[position])) seen += 1;
    position += 1;
  }
  // Só mexe no cursor se o campo está focado — `setSelectionRange` num campo
  // sem foco rouba o foco em alguns navegadores.
  if (document.activeElement === input) input.setSelectionRange(position, position);
}
