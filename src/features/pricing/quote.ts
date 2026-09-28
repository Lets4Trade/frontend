/**
 * Regra de preço de SERVIÇO (boosting, carry, mentoria...) — contrato
 * `.claude/context/game-tabs.md`, 2026-09-28.
 *
 * ⚠️ ARQUIVO ESPELHADO: a cópia do backend (`backend/src/common/pricing/quote.ts`)
 * tem que ser IDÊNTICA. Aqui ele só faz a PRÉVIA do preço na tela; quem cobra é
 * o backend, que recalcula com a mesma função a partir do produto do banco — o
 * navegador nunca manda valor. Sem imports de caminho (só `zod`) justamente para
 * a cópia funcionar dos dois lados sem ajuste.
 *
 * Dinheiro em CENTAVOS inteiros. Percentual em pontos inteiros (10 = 10%).
 *
 * Modos (o admin escolhe por produto):
 *  - FIXED        preço fechado = `basePriceCents` (o preço do produto).
 *  - QUANTITY     quantidade × preço unitário (horas de mentoria, runs de carry),
 *                 com faixas opcionais: a partir de N unidades, outro unitário.
 *  - LEVEL_RANGE  nível inicial → desejado; soma o preço de cada nível pela faixa
 *                 em que ele cai (subir do 90 ao 100 pode custar mais que do 1 ao 10).
 * Em todos: adicionais opcionais (percentual sobre o subtotal ou valor fixo) e
 * horas estimadas.
 */
import { z } from "zod";

/** Teto de sanidade de um pedido de serviço: R$ 100.000,00. */
export const MAX_SERVICE_TOTAL_CENTS = 10_000_000;

const cents = z.number().int().min(0).max(MAX_SERVICE_TOTAL_CENTS);
const hours = z.number().min(0).max(10_000);
const label = z.string().trim().min(1).max(40);

const addonSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9-]{1,40}$/, "id do adicional inválido"),
  label: z.string().trim().min(1).max(80),
  kind: z.enum(["PERCENT", "FIXED"]),
  /** PERCENT: pontos percentuais (0–500). FIXED: centavos. */
  value: z.number().int().min(0).max(MAX_SERVICE_TOTAL_CENTS),
  /** Horas a mais que o adicional custa (ex.: "jogar junto" +2h). */
  extraHours: hours.optional(),
});

const common = {
  addons: z.array(addonSchema).max(20).optional(),
  /** Horas fixas do serviço, somadas às variáveis. */
  baseHours: hours.optional(),
};

const fixedSchema = z.object({ mode: z.literal("FIXED"), ...common });

const quantitySchema = z.object({
  mode: z.literal("QUANTITY"),
  /** Como a unidade aparece: "Horas", "Runs". */
  unitLabel: label,
  min: z.number().int().min(1).max(10_000),
  max: z.number().int().min(1).max(10_000),
  step: z.number().int().min(1).max(10_000),
  /** Horas por unidade (mentoria: 1). */
  hoursPerUnit: hours.optional(),
  /** A partir de `from` unidades, o unitário vira `unitPriceCents`. */
  tiers: z
    .array(z.object({ from: z.number().int().min(1).max(10_000), unitPriceCents: cents }))
    .max(20)
    .optional(),
  ...common,
});

const levelRangeSchema = z.object({
  mode: z.literal("LEVEL_RANGE"),
  /** Como o nível aparece: "Nível", "Paragon", "Power Level". */
  unitLabel: label,
  min: z.number().int().min(0).max(100_000),
  max: z.number().int().min(1).max(100_000),
  /** Cada nível L (de `from` inclusive a `to` exclusive) custa o da faixa em que cai. */
  bands: z
    .array(
      z.object({
        from: z.number().int().min(0).max(100_000),
        to: z.number().int().min(1).max(100_000),
        pricePerLevelCents: cents,
        hoursPerLevel: hours,
      }),
    )
    .min(1)
    .max(50),
  ...common,
});

export const pricingSchema = z
  .discriminatedUnion("mode", [fixedSchema, quantitySchema, levelRangeSchema])
  .superRefine((value, ctx) => {
    if (value.mode !== "FIXED" && value.min > value.max) {
      ctx.addIssue({ code: "custom", message: "O mínimo não pode passar do máximo." });
    }
    if (value.mode === "LEVEL_RANGE") {
      if (value.max - value.min > 10_000) {
        ctx.addIssue({ code: "custom", message: "Faixa de níveis grande demais (máx. 10.000)." });
      }
      for (const band of value.bands) {
        if (band.from >= band.to) {
          ctx.addIssue({ code: "custom", message: "Cada faixa precisa ter início menor que o fim." });
        }
      }
      // Todo nível que o cliente pode comprar precisa ter preço: sem isso, um
      // buraco entre faixas viraria nível de graça.
      for (let level = value.min; level < value.max; level += 1) {
        if (!value.bands.some((band) => level >= band.from && level < band.to)) {
          ctx.addIssue({ code: "custom", message: `O nível ${level} não está em nenhuma faixa de preço.` });
          break;
        }
      }
    }
    const ids = (value.addons ?? []).map((addon) => addon.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: "custom", message: "Há adicionais com o mesmo id." });
    }
  });

export type Pricing = z.infer<typeof pricingSchema>;
export type PricingAddon = z.infer<typeof addonSchema>;

/** O que o cliente escolheu. Só os campos do modo contam; o resto é ignorado. */
export const selectionSchema = z.object({
  quantity: z.number().int().min(1).max(10_000).optional(),
  levelFrom: z.number().int().min(0).max(100_000).optional(),
  levelTo: z.number().int().min(0).max(100_000).optional(),
  addonIds: z.array(z.string().max(40)).max(20).optional(),
});

export type Selection = z.infer<typeof selectionSchema>;

export type QuoteLine = { label: string; cents: number };

export type Quote =
  | {
      ok: true;
      totalCents: number;
      hours: number;
      /** Resumo curto para o carrinho e o pedido: "Nível 1 → 50 · Prioridade". */
      summary: string;
      lines: QuoteLine[];
      /** A escolha já normalizada (só o que vale no modo). */
      selection: Selection;
    }
  | { ok: false; message: string };

/**
 * Calcula o preço. PURA e determinística: mesma entrada, mesmo resultado nos
 * dois lados. Toda escolha fora da regra RECUSA (não "corrige") — no backend,
 * corrigir em silêncio cobraria algo diferente do que a pessoa viu.
 */
export function quote(basePriceCents: number, pricing: Pricing, rawSelection: Selection): Quote {
  if (!Number.isInteger(basePriceCents) || basePriceCents < 0) {
    return { ok: false, message: "Preço base inválido." };
  }

  let subtotal = 0;
  let totalHours = pricing.baseHours ?? 0;
  const lines: QuoteLine[] = [];
  const selection: Selection = {};
  let summary = "";

  if (pricing.mode === "FIXED") {
    subtotal = basePriceCents;
    lines.push({ label: "Serviço", cents: basePriceCents });
  } else if (pricing.mode === "QUANTITY") {
    const quantity = rawSelection.quantity ?? pricing.min;
    if (quantity < pricing.min || quantity > pricing.max || (quantity - pricing.min) % pricing.step !== 0) {
      return { ok: false, message: `Escolha de ${pricing.min} a ${pricing.max} ${pricing.unitLabel.toLowerCase()}.` };
    }
    // A maior faixa cujo início já foi alcançado.
    const tier = [...(pricing.tiers ?? [])]
      .sort((a, b) => b.from - a.from)
      .find((candidate) => quantity >= candidate.from);
    const unit = tier ? tier.unitPriceCents : basePriceCents;
    subtotal = unit * quantity;
    totalHours += (pricing.hoursPerUnit ?? 0) * quantity;
    selection.quantity = quantity;
    summary = `${quantity} ${pricing.unitLabel}`;
    lines.push({ label: `${quantity} × ${pricing.unitLabel}`, cents: subtotal });
  } else {
    const from = rawSelection.levelFrom ?? pricing.min;
    const to = rawSelection.levelTo ?? pricing.max;
    if (from < pricing.min || to > pricing.max || from >= to) {
      return {
        ok: false,
        message: `${pricing.unitLabel}: escolha um início menor que o fim, entre ${pricing.min} e ${pricing.max}.`,
      };
    }
    let levels = basePriceCents;
    for (let level = from; level < to; level += 1) {
      const band = pricing.bands.find((candidate) => level >= candidate.from && level < candidate.to);
      if (!band) return { ok: false, message: `O nível ${level} não tem preço configurado.` };
      levels += band.pricePerLevelCents;
      totalHours += band.hoursPerLevel;
    }
    subtotal = levels;
    selection.levelFrom = from;
    selection.levelTo = to;
    summary = `${pricing.unitLabel} ${from} → ${to}`;
    lines.push({ label: summary, cents: levels });
  }

  // Adicionais: percentuais sobre o subtotal do serviço (não sobre outros
  // adicionais — a ordem de escolha não pode mudar o preço).
  const chosen = new Set(rawSelection.addonIds ?? []);
  const addons = (pricing.addons ?? []).filter((addon) => chosen.has(addon.id));
  if (addons.length !== chosen.size) {
    return { ok: false, message: "Um dos adicionais escolhidos não existe mais." };
  }
  let total = subtotal;
  for (const addon of addons) {
    const value = addon.kind === "PERCENT" ? Math.round((subtotal * addon.value) / 100) : addon.value;
    total += value;
    totalHours += addon.extraHours ?? 0;
    lines.push({ label: addon.label, cents: value });
  }
  if (addons.length > 0) {
    selection.addonIds = addons.map((addon) => addon.id);
    const names = addons.map((addon) => addon.label).join(", ");
    summary = summary ? `${summary} · ${names}` : names;
  }

  if (total <= 0) return { ok: false, message: "Este serviço está sem preço configurado." };
  if (total > MAX_SERVICE_TOTAL_CENTS) return { ok: false, message: "Valor acima do limite de um pedido." };

  return {
    ok: true,
    totalCents: total,
    hours: Math.round(totalHours * 100) / 100,
    summary: summary || "Serviço",
    lines,
    selection,
  };
}
