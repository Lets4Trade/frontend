import { couponStatus, discountLabel, formatDateTime, type AdminCoupon } from "./types";

/**
 * Cupons como OPÇÕES de um select do painel (2026-11-03, pedido do usuário:
 * "não seria melhor um select pra eu selecionar qual cupom?"). Usado no
 * "Aviso de cupom ao sair" — antes era um campo de texto, e um código digitado
 * que não existia no staging escondia o aviso sem nenhum alerta.
 */

export type CouponChoice = {
  code: string;
  /** "VOLTA10 · 10% · Valendo até 31/12/26 23:00". */
  label: string;
  /** Vale AGORA (é o que o backend confere antes de mostrar o aviso). */
  valid: boolean;
  /** "Valendo", "Agendado", "Expirado", "Esgotado", "Desligado". */
  status: string;
};

export function toCouponChoices(coupons: readonly AdminCoupon[], now = Date.now()): CouponChoice[] {
  return coupons
    .map((coupon) => {
      const status = couponStatus(coupon, now);
      const until = status.tone === "on" && coupon.endsAt ? ` até ${formatDateTime(coupon.endsAt)}` : "";
      return {
        code: coupon.code,
        label: `${coupon.code} · ${discountLabel(coupon)} · ${status.label}${until}`,
        valid: status.tone === "on",
        status: status.label,
      };
    })
    // Os que valem primeiro; dentro de cada grupo, por código.
    .sort((a, b) => Number(b.valid) - Number(a.valid) || a.code.localeCompare(b.code));
}

/**
 * Valor do "Nenhum cupom" NO SELECT (no banco continua vazio). Não pode ser
 * `""`: o select trata vazio como "nada escolhido" e mostra a caixa em branco.
 * Minúsculo, então nunca colide com um código (sempre maiúsculo).
 */
export const NO_COUPON = "__nenhum__";

/** Valor salvo → valor do select. */
export function couponSelectValue(saved: string): string {
  return saved.trim().toUpperCase() || NO_COUPON;
}

/** Valor do select → valor salvo. */
export function couponSavedValue(selected: string): string {
  return selected === NO_COUPON ? "" : selected;
}

/**
 * Opções do select. O código salvo que NÃO está na lista (apagado, digitado
 * errado antes do select existir) aparece como "não encontrado" — sumir com
 * ele esconderia exatamente o problema que o select veio resolver.
 */
export function couponSelectOptions(choices: readonly CouponChoice[], current: string) {
  const options = [
    { value: NO_COUPON, label: "Nenhum cupom" },
    ...choices.map((choice) => ({ value: choice.code, label: choice.label })),
  ];
  const saved = current.trim().toUpperCase();
  if (saved && !choices.some((choice) => choice.code === saved)) {
    options.push({ value: saved, label: `${saved} · não encontrado em Cupons` });
  }
  return options;
}

/** Aviso abaixo do select: o que acontece na loja com a escolha atual. */
export function couponChoiceProblem(choices: readonly CouponChoice[], current: string): string | null {
  const saved = current.trim().toUpperCase();
  if (!saved) return "Sem cupom escolhido, o aviso não aparece na loja.";
  const choice = choices.find((item) => item.code === saved);
  if (!choice) return "Este cupom não existe em Cupons — o aviso não aparece na loja.";
  if (!choice.valid) return `Este cupom está ${choice.status.toLowerCase()} — o aviso não aparece na loja enquanto ele não valer.`;
  return null;
}
