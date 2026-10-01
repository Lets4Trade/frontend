import { slugify } from "@/lib/slugify";
import { pricingSchema, type Pricing } from "@/features/pricing/quote";

/**
 * Rascunho do editor de PREÇO DE SERVIÇO ↔ `Pricing` (contrato `game-tabs.md`;
 * formato em `features/pricing/quote.ts`, que é a fonte).
 *
 * Funções PURAS, fora do componente, para o teste cobrir a conversão sem DOM.
 *
 * ── Por que um rascunho e não o `Pricing` direto ───────────────────────────
 * Número em campo de formulário é TEXTO enquanto se digita ("", "1", "1,5"); o
 * `Pricing` só aceita inteiros e faixas coerentes. O rascunho guarda o que a
 * pessoa digitou e `draftToPricing` converte + valida com o MESMO
 * `pricingSchema` que o backend usa — o que passa aqui passa lá.
 *
 * Dinheiro já chega em CENTAVOS inteiros (os campos de R$ são como o
 * `MoneyField`: dígitos entram pela direita). Nenhum float de reais existe.
 */

export type PricingMode = Pricing["mode"];

export type TierDraft = { key: string; from: string; unitPriceCents: number };
export type BandDraft = {
  key: string;
  from: string;
  to: string;
  pricePerLevelCents: number;
  hoursPerLevel: string;
};
export type AddonDraft = {
  key: string;
  /** Id GRAVADO (produto já salvo). Adicional novo não tem: sai do rótulo. */
  id: string | null;
  label: string;
  kind: "PERCENT" | "FIXED";
  /** PERCENT: pontos inteiros ("10" = 10%). */
  percent: string;
  /** FIXED: centavos. */
  cents: number;
  extraHours: string;
};

export type PricingDraft = {
  mode: PricingMode;
  unitLabel: string;
  min: string;
  max: string;
  step: string;
  /**
   * QUANTITY: "Quantidades prontas" (botões da aba Gold), como a pessoa
   * digitou — "100, 500, 1.000". Vazio = sem botões.
   */
  presets: string;
  hoursPerUnit: string;
  tiers: TierDraft[];
  bands: BandDraft[];
  baseHours: string;
  addons: AddonDraft[];
};

export const PRICING_MODES: readonly { value: PricingMode; label: string; hint: string }[] = [
  { value: "FIXED", label: "Preço fixo", hint: "O preço do produto, fechado." },
  {
    value: "QUANTITY",
    label: "Por quantidade",
    hint: "Quantidade × preço unitário (horas, runs). O preço do produto é o unitário padrão.",
  },
  {
    value: "LEVEL_RANGE",
    label: "Faixa de nível",
    hint: "Do nível atual ao desejado, somando o preço de cada nível pela faixa. O preço do produto é somado como taxa base.",
  },
];

let counter = 0;
/** Chave de renderização local (nunca vai ao servidor). */
export function newKey(): string {
  counter += 1;
  return `k${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyDraft(mode: PricingMode = "FIXED"): PricingDraft {
  return {
    mode,
    unitLabel: mode === "LEVEL_RANGE" ? "Nível" : "Horas",
    min: "1",
    max: mode === "LEVEL_RANGE" ? "100" : "10",
    step: "1",
    presets: "",
    hoursPerUnit: "",
    tiers: [],
    bands: mode === "LEVEL_RANGE" ? [{ key: newKey(), from: "1", to: "100", pricePerLevelCents: 0, hoursPerLevel: "0" }] : [],
    baseHours: "",
    addons: [],
  };
}

/** `Pricing` gravado → rascunho. `null` = produto sem regra (FIXED). */
export function pricingToDraft(pricing: Pricing | null | undefined): PricingDraft {
  if (!pricing) return emptyDraft("FIXED");
  const draft = emptyDraft(pricing.mode);
  draft.baseHours = numText(pricing.baseHours);
  draft.addons = (pricing.addons ?? []).map((addon) => ({
    key: newKey(),
    id: addon.id,
    label: addon.label,
    kind: addon.kind,
    percent: addon.kind === "PERCENT" ? String(addon.value) : "",
    cents: addon.kind === "FIXED" ? addon.value : 0,
    extraHours: numText(addon.extraHours),
  }));
  if (pricing.mode === "QUANTITY") {
    draft.unitLabel = pricing.unitLabel;
    draft.min = String(pricing.min);
    draft.max = String(pricing.max);
    draft.step = String(pricing.step);
    draft.presets = (pricing.presets ?? []).join(", ");
    draft.hoursPerUnit = numText(pricing.hoursPerUnit);
    draft.tiers = (pricing.tiers ?? []).map((tier) => ({
      key: newKey(),
      from: String(tier.from),
      unitPriceCents: tier.unitPriceCents,
    }));
  } else if (pricing.mode === "LEVEL_RANGE") {
    draft.unitLabel = pricing.unitLabel;
    draft.min = String(pricing.min);
    draft.max = String(pricing.max);
    draft.bands = pricing.bands.map((band) => ({
      key: newKey(),
      from: String(band.from),
      to: String(band.to),
      pricePerLevelCents: band.pricePerLevelCents,
      hoursPerLevel: String(band.hoursPerLevel),
    }));
  }
  return draft;
}

/**
 * Id do adicional: o GRAVADO quando existe (carrinhos abertos e pedidos citam
 * o id — renomear o rótulo não pode quebrá-los), senão derivado do rótulo.
 * Repetidos ganham sufixo `-2`, `-3`.
 */
export function addonIds(addons: readonly Pick<AddonDraft, "id" | "label">[]): string[] {
  const used = new Set<string>();
  return addons.map((addon, index) => {
    const base = addon.id ?? (slugify(addon.label).slice(0, 36) || `adicional-${index + 1}`);
    let id = base;
    let n = 2;
    while (used.has(id)) {
      id = `${base.slice(0, 36)}-${n}`;
      n += 1;
    }
    used.add(id);
    return id;
  });
}

/**
 * Rascunho → `Pricing` validado pelo `pricingSchema` (o mesmo do backend).
 * Devolve a PRIMEIRA mensagem do zod em caso de erro, como o resto do painel.
 */
export function draftToPricing(
  draft: PricingDraft,
): { ok: true; pricing: Pricing } | { ok: false; message: string } {
  const ids = addonIds(draft.addons);
  const addons = draft.addons.map((addon, index) => ({
    id: ids[index],
    label: addon.label.trim(),
    kind: addon.kind,
    value: addon.kind === "PERCENT" ? toInt(addon.percent) : addon.cents,
    ...(addon.extraHours.trim() === "" ? {} : { extraHours: toNumber(addon.extraHours) }),
  }));
  const common = {
    ...(addons.length > 0 ? { addons } : {}),
    ...(draft.baseHours.trim() === "" ? {} : { baseHours: toNumber(draft.baseHours) }),
  };

  let raw: unknown;
  if (draft.mode === "FIXED") {
    raw = { mode: "FIXED", ...common };
  } else if (draft.mode === "QUANTITY") {
    raw = {
      mode: "QUANTITY",
      unitLabel: draft.unitLabel.trim(),
      min: toInt(draft.min),
      max: toInt(draft.max),
      step: toInt(draft.step),
      ...(parsePresets(draft.presets).length > 0 ? { presets: parsePresets(draft.presets) } : {}),
      ...(draft.hoursPerUnit.trim() === "" ? {} : { hoursPerUnit: toNumber(draft.hoursPerUnit) }),
      ...(draft.tiers.length > 0
        ? { tiers: draft.tiers.map((tier) => ({ from: toInt(tier.from), unitPriceCents: tier.unitPriceCents })) }
        : {}),
      ...common,
    };
  } else {
    raw = {
      mode: "LEVEL_RANGE",
      unitLabel: draft.unitLabel.trim(),
      min: toInt(draft.min),
      max: toInt(draft.max),
      bands: draft.bands.map((band) => ({
        from: toInt(band.from),
        to: toInt(band.to),
        pricePerLevelCents: band.pricePerLevelCents,
        hoursPerLevel: toNumber(band.hoursPerLevel || "0"),
      })),
      ...common,
    };
  }

  const parsed = pricingSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      message: describeIssue(issue?.path ?? [], translateIssue(issue as Parameters<typeof translateIssue>[0])),
    };
  }
  return { ok: true, pricing: parsed.data };
}

/** O zod diz "Too small" num campo que a pessoa nem sabe qual é; aqui ganha nome. */
const FIELD_NAMES: Record<string, string> = {
  unitLabel: "Nome da unidade",
  min: "Mínimo",
  max: "Máximo",
  step: "Passo",
  presets: "Quantidades prontas",
  hoursPerUnit: "Horas por unidade",
  baseHours: "Horas base",
  tiers: "Faixas de quantidade",
  bands: "Faixas de nível",
  addons: "Adicionais",
};

/**
 * As mensagens embutidas do zod vêm em inglês ("Invalid input: expected number,
 * received NaN" para um campo vazio) — o painel é em português. As `custom` já
 * são nossas (em `quote.ts`) e passam como estão.
 */
function translateIssue(
  issue: { code?: string; message?: string; origin?: string; maximum?: unknown } | undefined,
): string {
  if (!issue) return "Regra de preço inválida.";
  // Lista longa demais (ex.: 25 quantidades prontas): diz o teto, não "um valor".
  if (issue.code === "too_big" && issue.origin === "array") {
    return `no máximo ${String(issue.maximum)} itens.`;
  }
  switch (issue.code) {
    case "custom":
      return issue.message ?? "Regra de preço inválida.";
    case "invalid_type":
      return "preencha todos os campos com números.";
    case "too_small":
      return "há um valor abaixo do mínimo permitido (ou uma lista vazia).";
    case "too_big":
      return "há um valor acima do máximo permitido.";
    case "invalid_format":
    case "invalid_string":
      return "há um texto em formato inválido.";
    default:
      return "confira os valores preenchidos.";
  }
}

function describeIssue(path: PropertyKey[], message: string): string {
  const field = path.find((part): part is string => typeof part === "string" && part in FIELD_NAMES);
  return field ? `${FIELD_NAMES[field]}: ${message}` : message;
}

/**
 * "Quantidades prontas" → números. Separadas por vírgula, ponto e vírgula ou
 * espaço; o PONTO é separador de milhar (pt-BR: "1.000" = mil), porque
 * quantidade é inteira. O que não for número vira NaN, e o `pricingSchema`
 * recusa com a mensagem dele — nada é descartado em silêncio.
 */
export function parsePresets(text: string): number[] {
  return text
    .split(/[\s,;]+/)
    .filter((part) => part !== "")
    .map((part) => (/^\d[\d.]*$/.test(part) ? Number(part.replace(/\./g, "")) : Number.NaN));
}

/** "1,5" e "1.5" valem; vazio vira NaN para o zod recusar com a mensagem dele. */
function toNumber(text: string): number {
  const normalized = text.trim().replace(",", ".");
  return normalized === "" ? Number.NaN : Number(normalized);
}

function toInt(text: string): number {
  const value = toNumber(text);
  return Number.isFinite(value) ? value : Number.NaN;
}

function numText(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}
