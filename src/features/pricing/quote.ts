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
 *  - QUANTITY     quantidade × preço unitário (horas de mentoria, runs de carry,
 *                 gold), com quantidades prontas (`presets`, os botões da aba
 *                 Gold) e o TAMANHO da unidade (`unitSize`: 1 unidade = 1Mi de
 *                 ouro, então 10 unidades = 10Mi — 2026-10-23) e DESCONTO por
 *                 quantidade (`discounts`, 2026-10-27: "a partir de 500Mi, 5%").
 *  - LEVEL_RANGE  nível inicial → desejado; soma o preço de cada nível pela faixa
 *                 em que ele cai (subir do 90 ao 100 pode custar mais que do 1 ao 10).
 * Em todos: adicionais opcionais (percentual sobre o subtotal ou valor fixo) e
 * horas estimadas.
 */
import { z } from "zod";

/**
 * Teto de PREÇO de produto e de pedido de serviço: R$ 20 milhões (2026-10-15).
 *
 * Era R$ 100.000,00 e o usuário pediu para tirar o limite do painel. O que
 * sobra é o teto TÉCNICO: `Payment.amountCents` é Int de 32 bits (até R$ 21,4
 * mi) — o mesmo `MAX_CART_CENTS` do checkout. Acima disso o carrinho nem pode
 * ser cobrado. As contas do serviço continuam inteiras seguras em JS: 100 mil
 * níveis × R$ 20 mi = 2×10¹⁴ < 2⁵³.
 */
export const MAX_PRICE_CENTS = 2_000_000_000;

/** O total de um serviço tem o mesmo teto do preço. */
export const MAX_SERVICE_TOTAL_CENTS = MAX_PRICE_CENTS;

const cents = z.number().int().min(0).max(MAX_SERVICE_TOTAL_CENTS);
/**
 * Horas SEM teto (2026-10-20, pedido do usuário; era 10.000). Só número finito
 * e não negativo — `Infinity`/`NaN` quebrariam a soma e o JSON.
 */
const hours = z.number().min(0).finite();
const label = z.string().trim().min(1).max(40);

/**
 * Piso do adicional PERCENTUAL: −100% (2026-10-09, pedido do usuário). Abaixo
 * disso o adicional tiraria mais que o próprio serviço e "pagaria" o cliente.
 */
export const MIN_ADDON_PERCENT = -100;

const addonSchema = z
  .object({
    id: z.string().trim().regex(/^[a-z0-9-]{1,40}$/, "id do adicional inválido"),
    label: z.string().trim().min(1).max(80),
    kind: z.enum(["PERCENT", "FIXED"]),
    /**
     * PERCENT: pontos percentuais, de −100 para cima — NEGATIVO é desconto
     * sobre o subtotal do serviço (2026-10-09). FIXED: centavos, só positivo.
     */
    value: z.number().int().min(MIN_ADDON_PERCENT).max(MAX_SERVICE_TOTAL_CENTS),
    /** Horas a mais que o adicional custa (ex.: "jogar junto" +2h). */
    extraHours: hours.optional(),
  })
  .refine((addon) => addon.kind === "PERCENT" || addon.value >= 0, {
    message: "Adicional em R$ não pode ser negativo",
    path: ["value"],
  });

const common = {
  addons: z.array(addonSchema).max(20).optional(),
  /** Horas fixas do serviço, somadas às variáveis. */
  baseHours: hours.optional(),
};

const fixedSchema = z.object({ mode: z.literal("FIXED"), ...common });

/**
 * Quantidade SEM teto (2026-10-20, pedido do usuário: "não tem que ter teto,
 * tire o limite"). Era 1.000.000 (e 10.000 antes de 2026-09-30).
 *
 * O único limite é o de REPRESENTAÇÃO: o maior inteiro que o JavaScript guarda
 * sem perder unidade (2⁵³ − 1, ~9 quatrilhões). Acima dele "1000000000000000001"
 * vira outro número — não é regra de negócio, é o número deixar de ser exato.
 * O valor da compra continua com o teto técnico de cobrança (`MAX_PRICE_CENTS`):
 * um total acima dele é recusado pelo valor, nunca pela quantidade.
 */
export const MAX_QUANTITY = Number.MAX_SAFE_INTEGER;
const quantityValue = z.number().int().min(1).max(MAX_QUANTITY);

const quantitySchema = z.object({
  mode: z.literal("QUANTITY"),
  /** Como a unidade aparece: "Horas", "Runs", "Gold". */
  unitLabel: label,
  min: quantityValue,
  max: quantityValue,
  step: quantityValue,
  /** Quantidades oferecidas em botão (aba Gold). Cada uma tem que ser escolhível. */
  presets: z.array(quantityValue).max(24).optional(),
  /**
   * Quanto UMA unidade vale (2026-10-23, pedido do usuário): 1.000.000 = cada
   * unidade é 1Mi de ouro, e 10 unidades entregam 10Mi. O preço do produto é o
   * da UNIDADE — sem isto, ouro por 1 de ouro exigiria fração de centavo.
   * Mínimo, máximo, passo e quantidades prontas continuam em UNIDADES.
   * Ausente = 1 (o comportamento de antes).
   */
  unitSize: quantityValue.optional(),
  /** Horas por unidade (mentoria: 1). */
  hoursPerUnit: hours.optional(),
  /**
   * Desconto por QUANTIDADE (2026-10-27, pedido do usuário para a aba Gold):
   * "a partir de 500 unidades, 5%". Vale DALI PARA CIMA, não só no botão: quem
   * digita 600 não pode pagar mais que quem escolhe 500. Com várias, vale a de
   * maior `from` que a quantidade alcança. A loja mostra o selo "-5%" no botão
   * da quantidade pronta. Percentual inteiro, de 1 a 90 (`MAX_QUANTITY_DISCOUNT`).
   *
   * Não é o `tiers` abaixo (preço unitário por faixa, desligado em 2026-10-01):
   * aqui o preço da unidade não muda, o total ganha uma linha de desconto.
   */
  discounts: z
    .array(z.object({ from: quantityValue, percent: z.number().int().min(1).max(90) }))
    .max(24)
    .optional(),
  /**
   * DESATIVADO em 2026-10-01 (pedido do usuário: "coloquei 10 itens e eu
   * deveria pagar 100"): não há mais desconto por quantidade — o benefício é
   * só o cashback em Lets Coins. Ainda ACEITO no schema para uma regra antiga
   * não quebrar a validação, mas `quote` IGNORA; a migration
   * `20261001150000_coin_one_cent_no_quantity_tiers` tirou as faixas salvas.
   */
  tiers: z
    .array(z.object({ from: quantityValue, unitPriceCents: cents }))
    .max(20)
    .optional(),
  ...common,
});

/**
 * Nível SEM teto (2026-10-20, pedido do usuário; era 100.000, com no máximo
 * 10.000 níveis entre o mínimo e o máximo). Como `MAX_QUANTITY`, o único limite
 * é o inteiro exato do JS. Por isso o preço e a cobertura das faixas são
 * contados POR FAIXA (`levelSegments`), nunca nível a nível: um intervalo de
 * bilhões de níveis custa os mesmos ~100 passos que um de dez.
 */
const levelValue = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

const levelRangeSchema = z.object({
  mode: z.literal("LEVEL_RANGE"),
  /** Como o nível aparece: "Nível", "Paragon", "Power Level". */
  unitLabel: label,
  min: levelValue,
  max: levelValue.min(1),
  /** Cada nível L (de `from` inclusive a `to` exclusive) custa o da faixa em que cai. */
  bands: z
    .array(
      z.object({
        from: levelValue,
        to: levelValue.min(1),
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
    if (value.mode === "QUANTITY") {
      for (const preset of value.presets ?? []) {
        if (preset < value.min || preset > value.max || (preset - value.min) % value.step !== 0) {
          ctx.addIssue({ code: "custom", message: `A quantidade pronta ${preset} está fora de mínimo/máximo/passo.` });
          break;
        }
      }
      const froms = (value.discounts ?? []).map((discount) => discount.from);
      if (new Set(froms).size !== froms.length) {
        ctx.addIssue({ code: "custom", message: "Há dois descontos para a mesma quantidade." });
      }
      for (const from of froms) {
        if (from < value.min || from > value.max) {
          ctx.addIssue({ code: "custom", message: `O desconto a partir de ${from} está fora de mínimo/máximo.` });
          break;
        }
      }
    }
    if (value.mode === "LEVEL_RANGE") {
      for (const band of value.bands) {
        if (band.from >= band.to) {
          ctx.addIssue({ code: "custom", message: "Cada faixa precisa ter início menor que o fim." });
        }
      }
      // Todo nível que o cliente pode comprar precisa ter preço: sem isso, um
      // buraco entre faixas viraria nível de graça.
      const gap = levelSegments(value.bands, value.min, value.max).gap;
      if (gap !== null) {
        ctx.addIssue({ code: "custom", message: `O nível ${gap} não está em nenhuma faixa de preço.` });
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
  quantity: quantityValue.optional(),
  levelFrom: levelValue.optional(),
  levelTo: levelValue.optional(),
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
    // Quantidade × preço do produto (o preço da unidade não muda por faixa,
    // 2026-10-01); o desconto por quantidade entra como linha à parte, abaixo.
    subtotal = basePriceCents * quantity;
    totalHours += (pricing.hoursPerUnit ?? 0) * quantity;
    selection.quantity = quantity;
    const size = pricing.unitSize ?? 1;
    if (size > 1) {
      // Com tamanho de unidade, o resumo diz o TOTAL entregue, por extenso — é
      // o que a equipe entrega e o que o cliente confere no pedido.
      const amount = quantity * size;
      if (!Number.isSafeInteger(amount)) {
        return { ok: false, message: "Quantidade grande demais." };
      }
      summary = `${amount.toLocaleString("pt-BR")} ${pricing.unitLabel}`;
      lines.push({
        label: `${quantity} × ${size.toLocaleString("pt-BR")} ${pricing.unitLabel}`,
        cents: subtotal,
      });
    } else {
      summary = `${quantity} ${pricing.unitLabel}`;
      lines.push({ label: `${quantity} × ${pricing.unitLabel}`, cents: subtotal });
    }
    // Desconto por quantidade (2026-10-27): antes dos adicionais, que incidem
    // sobre o que o cliente de fato paga pelo serviço.
    const percent = quantityDiscountPercent(pricing, quantity);
    if (percent > 0) {
      const off = Math.round((subtotal * percent) / 100);
      subtotal -= off;
      lines.push({ label: `Desconto por quantidade (${percent}%)`, cents: -off });
    }
  } else {
    const from = rawSelection.levelFrom ?? pricing.min;
    const to = rawSelection.levelTo ?? pricing.max;
    if (from < pricing.min || to > pricing.max || from >= to) {
      return {
        ok: false,
        message: `${pricing.unitLabel}: escolha um início menor que o fim, entre ${pricing.min} e ${pricing.max}.`,
      };
    }
    const { segments, gap } = levelSegments(pricing.bands, from, to);
    if (gap !== null) return { ok: false, message: `O nível ${gap} não tem preço configurado.` };
    let levels = basePriceCents;
    for (const segment of segments) {
      levels += segment.count * segment.band.pricePerLevelCents;
      totalHours += segment.count * segment.band.hoursPerLevel;
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

  // Desconto (adicional percentual negativo) pode zerar o total; pedido de
  // R$ 0 não tem como ser cobrado, então a combinação é recusada com motivo.
  if (total <= 0 && subtotal > 0) {
    return { ok: false, message: "Com esses adicionais o valor fica zerado. Escolha outra combinação." };
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

/**
 * O desconto (%) que vale para `quantity` no modo QUANTITY: o da maior faixa
 * `from` que a quantidade alcança. 0 = sem desconto. A loja usa a mesma função
 * para o selo dos botões, então o selo nunca promete o que a conta não dá.
 */
export function quantityDiscountPercent(
  pricing: { discounts?: readonly { from: number; percent: number }[] },
  quantity: number,
): number {
  let best: { from: number; percent: number } | null = null;
  for (const discount of pricing.discounts ?? []) {
    if (discount.from <= quantity && (!best || discount.from > best.from)) best = discount;
  }
  return best ? best.percent : 0;
}

type LevelBand = { from: number; to: number; pricePerLevelCents: number; hoursPerLevel: number };

/**
 * Os níveis de `from` (inclusive) a `to` (exclusive) agrupados por faixa — a
 * mesma regra de antes, quando a conta andava nível a nível: cada nível usa a
 * PRIMEIRA faixa da lista que o contém. `gap` é o primeiro nível sem faixa.
 *
 * Cada trecho termina onde a faixa escolhida pode mudar: no fim dela, no fim
 * do pedido ou no começo de uma faixa ANTERIOR na lista (que passa a valer dali
 * em diante). Com até 50 faixas são no máximo ~100 trechos, qualquer que seja o
 * tamanho do intervalo (2026-10-20, níveis sem teto).
 */
export function levelSegments(
  bands: readonly LevelBand[],
  from: number,
  to: number,
): { segments: { band: LevelBand; count: number }[]; gap: number | null } {
  const segments: { band: LevelBand; count: number }[] = [];
  let cursor = from;
  while (cursor < to) {
    const index = bands.findIndex((band) => cursor >= band.from && cursor < band.to);
    if (index === -1) return { segments, gap: cursor };
    let end = Math.min(bands[index].to, to);
    for (let earlier = 0; earlier < index; earlier += 1) {
      const start = bands[earlier].from;
      if (start > cursor && start < end) end = start;
    }
    segments.push({ band: bands[index], count: end - cursor });
    cursor = end;
  }
  return { segments, gap: null };
}

/**
 * Layouts de aba cujo preço passa por `quote` (2026-09-30): SERVICE (boosting,
 * mentoria), QUANTITY (gold — botões de quantidade) e PACKAGES (pacotes com
 * CONTINUAR → configurador). CATALOG segue `preço × unidades`; LINK e SELL não
 * têm produto.
 */
export const QUOTED_LAYOUTS = ["SERVICE", "QUANTITY", "PACKAGES"] as const;

/** Regra usada quando o produto de aba QUANTITY não tem `pricing` salvo. */
export const DEFAULT_QUANTITY_PRICING: Pricing = {
  mode: "QUANTITY",
  unitLabel: "Unidades",
  min: 1,
  max: 1000,
  step: 1,
};

/**
 * A regra que VALE para um produto, dado o layout da aba dele. `null` = não é
 * produto cotado (preço de catálogo). Mesma decisão nos dois lados: o front
 * mostra e o backend cobra com o resultado desta função.
 */
export function effectivePricing(layout: string | null | undefined, pricing: Pricing | null | undefined): Pricing | null {
  if (!layout || !(QUOTED_LAYOUTS as readonly string[]).includes(layout)) return null;
  if (pricing) return pricing;
  return layout === "QUANTITY" ? DEFAULT_QUANTITY_PRICING : { mode: "FIXED" };
}
