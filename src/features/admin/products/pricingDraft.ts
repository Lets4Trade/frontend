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
  /** Subserviços (2026-11-09). Só no 1º nível; num subserviço fica vazio. */
  children: AddonDraft[];
  /** Quantos subserviços o cliente pode marcar, como digitado. Vazio = todos. */
  maxChildren: string;
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
  /**
   * QUANTITY: desconto (%) por quantidade pronta, como digitado, pela
   * quantidade em texto ("500" → "5"). Vazio = sem desconto naquele botão.
   * Vale daquela quantidade para cima (`quote.ts`, 2026-10-27).
   */
  discounts: Record<string, string>;
  /** QUANTITY: quanto 1 unidade vale ("1.000.000" = 1Mi de ouro). Vazio = 1. */
  unitSize: string;
  hoursPerUnit: string;
  tiers: TierDraft[];
  bands: BandDraft[];
  baseHours: string;
  addons: AddonDraft[];
  /** Título da lista de serviços na loja (2026-11-09). Vazio = o padrão do modo. */
  addonsTitle: string;
  /** Quantos serviços o cliente pode marcar, como digitado. Vazio = sem limite. */
  maxAddons: string;
  /** Só preço fixo (2026-11-11): até quantas unidades por compra. Vazio = 1, sem seletor. */
  maxUnits: string;
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
    discounts: {},
    unitSize: "",
    hoursPerUnit: "",
    tiers: [],
    bands: mode === "LEVEL_RANGE" ? [{ key: newKey(), from: "1", to: "100", pricePerLevelCents: 0, hoursPerLevel: "0" }] : [],
    baseHours: "",
    addons: [],
    addonsTitle: "",
    maxAddons: "",
    maxUnits: "",
  };
}

/** Serviço/subserviço novo, vazio (percentual, como antes). */
export function emptyAddon(): AddonDraft {
  return { key: newKey(), id: null, label: "", kind: "PERCENT", percent: "", cents: 0, extraHours: "", children: [], maxChildren: "" };
}

function addonToDraft(addon: {
  id: string;
  label: string;
  kind: "PERCENT" | "FIXED";
  value: number;
  extraHours?: number;
  children?: { id: string; label: string; kind: "PERCENT" | "FIXED"; value: number; extraHours?: number }[];
  maxChildren?: number;
}): AddonDraft {
  return {
    key: newKey(),
    id: addon.id,
    label: addon.label,
    kind: addon.kind,
    percent: addon.kind === "PERCENT" ? String(addon.value) : "",
    cents: addon.kind === "FIXED" ? addon.value : 0,
    extraHours: numText(addon.extraHours),
    children: (addon.children ?? []).map((child) => addonToDraft(child)),
    maxChildren: addon.maxChildren ? String(addon.maxChildren) : "",
  };
}

/** `Pricing` gravado → rascunho. `null` = produto sem regra (FIXED). */
export function pricingToDraft(pricing: Pricing | null | undefined): PricingDraft {
  if (!pricing) return emptyDraft("FIXED");
  const draft = emptyDraft(pricing.mode);
  draft.baseHours = numText(pricing.baseHours);
  draft.addons = (pricing.addons ?? []).map((addon) => addonToDraft(addon));
  draft.addonsTitle = pricing.addonsTitle ?? "";
  draft.maxAddons = pricing.maxAddons ? String(pricing.maxAddons) : "";
  if (pricing.mode === "FIXED" && pricing.maxUnits) draft.maxUnits = String(pricing.maxUnits);
  if (pricing.mode === "QUANTITY") {
    draft.unitLabel = pricing.unitLabel;
    draft.min = String(pricing.min);
    draft.max = String(pricing.max);
    draft.step = String(pricing.step);
    draft.presets = (pricing.presets ?? []).join(", ");
    draft.discounts = Object.fromEntries(
      (pricing.discounts ?? []).map((discount) => [String(discount.from), String(discount.percent)]),
    );
    draft.unitSize = pricing.unitSize && pricing.unitSize > 1 ? pricing.unitSize.toLocaleString("pt-BR") : "";
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
 * Sobe (`-1`) ou desce (`+1`) a linha `index` de uma lista (faixas de nível e
 * adicionais, 2026-11-09: "preciso colocar outro valor num nível intermediário
 * e só consigo na última linha"). Fora dos limites devolve a MESMA lista.
 */
export function moveItem<T>(list: readonly T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return [...list];
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/**
 * Id do adicional: o GRAVADO quando existe (carrinhos abertos e pedidos citam
 * o id — renomear o rótulo não pode quebrá-los), senão derivado do rótulo.
 * Repetidos ganham sufixo `-2`, `-3`.
 */
export function addonIds(addons: readonly Pick<AddonDraft, "id" | "label">[]): string[] {
  return addonIdTree(addons).parents;
}

/**
 * Ids de serviços E subserviços (2026-11-09), únicos entre todos — a escolha do
 * cliente é uma lista só. Mesma regra: o gravado vence, senão sai do rótulo.
 */
export function addonIdTree(
  addons: readonly (Pick<AddonDraft, "id" | "label"> & { children?: readonly Pick<AddonDraft, "id" | "label">[] })[],
): { parents: string[]; children: string[][] } {
  const used = new Set<string>();
  const take = (addon: Pick<AddonDraft, "id" | "label">, fallback: string) => {
    const base = addon.id ?? (slugify(addon.label).slice(0, 36) || fallback);
    let id = base;
    let n = 2;
    while (used.has(id)) {
      id = `${base.slice(0, 36)}-${n}`;
      n += 1;
    }
    used.add(id);
    return id;
  };
  // Os GRAVADOS primeiro: um novo nunca pode roubar o id de um salvo.
  for (const addon of addons) {
    if (addon.id) used.add(addon.id);
    for (const child of addon.children ?? []) if (child.id) used.add(child.id);
  }
  const parents: string[] = [];
  const children: string[][] = [];
  addons.forEach((addon, index) => {
    if (addon.id) used.delete(addon.id);
    parents.push(take(addon, `adicional-${index + 1}`));
    children.push(
      (addon.children ?? []).map((child, childIndex) => {
        if (child.id) used.delete(child.id);
        return take(child, `${parents[index]}-sub-${childIndex + 1}`.slice(0, 40));
      }),
    );
  });
  return { parents, children };
}

/**
 * Rascunho → `Pricing` validado pelo `pricingSchema` (o mesmo do backend).
 * Devolve a PRIMEIRA mensagem do zod em caso de erro, como o resto do painel.
 */
export function draftToPricing(
  draft: PricingDraft,
): { ok: true; pricing: Pricing } | { ok: false; message: string } {
  const ids = addonIdTree(draft.addons);
  const toAddon = (addon: AddonDraft, id: string) => ({
    id,
    label: addon.label.trim(),
    kind: addon.kind,
    value: addon.kind === "PERCENT" ? toInt(addon.percent) : addon.cents,
    ...(addon.extraHours.trim() === "" ? {} : { extraHours: toNumber(addon.extraHours) }),
  });
  const addons = draft.addons.map((addon, index) => ({
    // Grupo (2026-11-11): serviço com subserviços é só título na loja e não
    // cobra — grava R$ 0 sem horas, seja o que for que tenha ficado no rascunho.
    ...(addon.children.length > 0
      ? { id: ids.parents[index], label: addon.label.trim(), kind: "FIXED" as const, value: 0 }
      : toAddon(addon, ids.parents[index])),
    ...(addon.children.length > 0
      ? { children: addon.children.map((child, childIndex) => toAddon(child, ids.children[index][childIndex])) }
      : {}),
    ...(addon.children.length > 0 && addon.maxChildren.trim() !== "" ? { maxChildren: toInt(addon.maxChildren) } : {}),
  }));
  const common = {
    ...(addons.length > 0 ? { addons } : {}),
    ...(draft.addonsTitle.trim() === "" ? {} : { addonsTitle: draft.addonsTitle.trim() }),
    ...(addons.length > 0 && draft.maxAddons.trim() !== "" ? { maxAddons: toInt(draft.maxAddons) } : {}),
    ...(draft.baseHours.trim() === "" ? {} : { baseHours: toNumber(draft.baseHours) }),
  };

  let raw: unknown;
  if (draft.mode === "FIXED") {
    raw = {
      mode: "FIXED",
      ...common,
      ...(draft.maxUnits.trim() === "" ? {} : { maxUnits: toInt(draft.maxUnits) }),
    };
  } else if (draft.mode === "QUANTITY") {
    raw = {
      mode: "QUANTITY",
      unitLabel: draft.unitLabel.trim(),
      min: toInt(draft.min),
      max: toInt(draft.max),
      step: toInt(draft.step),
      ...(parsePresets(draft.presets).length > 0 ? { presets: parsePresets(draft.presets) } : {}),
      ...(presetDiscounts(draft).length > 0 ? { discounts: presetDiscounts(draft) } : {}),
      // "1.000.000" (ponto é milhar, como nas quantidades prontas). 1 = sem tamanho.
      ...(unitSizeOf(draft.unitSize) > 1 ? { unitSize: unitSizeOf(draft.unitSize) } : {}),
      ...(draft.hoursPerUnit.trim() === "" ? {} : { hoursPerUnit: toNumber(draft.hoursPerUnit) }),
      // `tiers` (desconto por quantidade) não é mais gravado — 2026-10-01.
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
  discounts: "Desconto por quantidade",
  unitSize: "1 unidade vale",
  hoursPerUnit: "Horas por unidade",
  baseHours: "Horas base",
  tiers: "Faixas de quantidade",
  bands: "Faixas de nível",
  addons: "Adicionais",
  addonsTitle: "Título da lista",
  maxAddons: "Máximo de serviços",
  maxUnits: "Máximo de unidades por compra",
  maxChildren: "Máximo de subserviços",
  children: "Subserviços",
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

/**
 * Os descontos dos botões, na ordem da quantidade. Só os das quantidades que
 * ainda estão na lista: apagar o botão apaga o desconto dele.
 */
export function presetDiscounts(draft: PricingDraft): { from: number; percent: number }[] {
  const presets = [...new Set(parsePresets(draft.presets).filter(Number.isFinite))].sort((a, b) => a - b);
  return presets
    .filter((preset) => (draft.discounts[String(preset)] ?? "").trim() !== "")
    .map((preset) => ({ from: preset, percent: toInt(draft.discounts[String(preset)]) }));
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

/**
 * "1.000.000" → 1000000. Ponto e espaço são separador de milhar (como em
 * `parsePresets`); vazio = 1. Texto que não é número vira NaN e o
 * `pricingSchema` recusa com o nome do campo.
 */
export function unitSizeOf(raw: string): number {
  const text = raw.replace(/[.\s]/g, "").trim();
  if (text === "") return 1;
  return /^\d+$/.test(text) ? Number(text) : Number.NaN;
}
