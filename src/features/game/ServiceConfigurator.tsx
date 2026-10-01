"use client";

import Image from "next/image";
import { useId, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { formatHours } from "@/features/cart/store";
import { quote, type Pricing, type Selection } from "@/features/pricing/quote";
import { ADDON_SEARCH_THRESHOLD, filterAddons, snapQuantity } from "./configurator";
import { formatPrice } from "./content";
import type { ProductContext } from "./ProductCard";
import type { GameProduct } from "./types";
import { useBuyNow } from "./useBuyNow";

/**
 * Card configurador do layout SERVIÇO (Figma 1712:3968, 554×911).
 *
 * Divisão de estado, e é o que decide o que é servidor e o que é cliente:
 *   - servidor e categoria mudam a LISTA de produtos → moram na URL e chegam
 *     prontos em `filters` (links renderizados no servidor, como no catálogo);
 *   - produto, quantidade, níveis e adicionais só mudam o PREÇO → estado local,
 *     com a prévia calculada por `quote()` a cada mudança, sem rede.
 *
 * O preço mostrado é PRÉVIA. O checkout manda só produto + escolha, e o backend
 * refaz a mesma conta com o produto do banco (`quote.ts` é espelhado lá).
 */
export function ServiceConfigurator({
  products,
  context,
  filters,
  emptyMessage,
}: {
  products: GameProduct[];
  context: ProductContext;
  /** As pílulas de servidor e categoria, montadas no servidor. */
  filters: ReactNode;
  emptyMessage: string;
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const product = products.find((item) => item.id === productId) ?? products[0];

  return (
    <div className="relative w-full shrink-0 overflow-hidden rounded-[30px] border border-brand-hairline bg-black lg:w-[554px]">
      {/* Foto do produto escolhido no topo (Mentoria 4222:1160: 551×327,
          cantos 30), ou o cinza do arquivo enquanto o admin não sobe a arte.
          Proporção no celular para a foto não virar uma faixa fina. */}
      <div className="relative aspect-[551/327] w-full overflow-hidden rounded-t-[30px] bg-[#2f2f2f] lg:aspect-auto lg:h-[327px]">
        {product?.image ? (
          <Image
            src={product.image.src}
            alt=""
            fill
            sizes="(min-width: 1024px) 554px, 100vw"
            className="object-cover"
          />
        ) : null}
        {/* Degradê preto de 121px no pé da foto: garante leitura do primeiro
            título sobre qualquer arte que o admin subir. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[121px] bg-gradient-to-b from-transparent to-black"
        />
      </div>

      <div className="relative px-[24px] pt-[30px] pb-[25px] sm:px-[50px]">
        {filters}

        {products.length === 0 || !product ? (
          <p
            role="status"
            className="mt-[25px] font-helvetica text-[16px] leading-[24px] text-brand-placeholder first:mt-0"
          >
            {emptyMessage}
          </p>
        ) : (
          <>
            {/* "Selecionar serviço" (o "Selecionar Jogo" da Mentoria 4222:1160,
                por decisão do usuário): um select, e só com mais de um
                produto — com um só, escolher seria cerimônia. */}
            {products.length > 1 ? (
              <div className="mt-[25px] first:mt-0">
                <ProductSelect products={products} value={product.id} onChange={setProductId} />
              </div>
            ) : null}

            {/* `key`: trocar de produto recomeça a escolha — níveis e
                adicionais de um serviço não valem para outro. */}
            <ProductControls key={product.id} product={product} context={context} />
          </>
        )}
      </div>
    </div>
  );
}

const TITLE =
  "font-helvetica text-[18px] leading-none font-bold tracking-[0.18px] text-white";
const LABEL = "font-helvetica text-[16px] leading-none tracking-[0.16px] text-brand-placeholder";
/** Caixa de valor do arquivo: 150×56, vidro cinza, número laranja. */
const VALUE_BOX =
  "h-[56px] w-full max-w-[150px] rounded-[8px] border border-brand-hairline bg-[linear-gradient(180deg,rgba(97,97,97,0.1),rgba(36,36,36,0.1))] text-center font-poppins text-[16px] font-bold text-brand-orange backdrop-blur-[100px] outline-none [appearance:textfield] focus-visible:border-brand-orange [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

/**
 * "Selecionar serviço:" — select do tema (Radix, nunca o nativo) com os
 * produtos do escopo. Exportado para o painel de quantidade usar o mesmo.
 */
export function ProductSelect({
  products,
  value,
  onChange,
}: {
  products: readonly GameProduct[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <SelectField
      label="Selecionar serviço:"
      options={products.map((item) => ({ value: item.id, label: item.name }))}
      value={value}
      onValueChange={onChange}
      className="lg:max-w-[452px]"
    />
  );
}

const FIXED: Pricing = { mode: "FIXED" };

function initialSelection(pricing: Pricing): Selection {
  if (pricing.mode === "QUANTITY") return { quantity: pricing.min };
  if (pricing.mode === "LEVEL_RANGE") return { levelFrom: pricing.min, levelTo: pricing.max };
  return {};
}

function ProductControls({ product, context }: { product: GameProduct; context: ProductContext }) {
  const buyNow = useBuyNow(context);

  const pricing = product.pricing ?? FIXED;
  const [selection, setSelection] = useState<Selection>(() => initialSelection(pricing));
  const [addonIds, setAddonIds] = useState<string[]>([]);

  const result = useMemo(
    () => quote(product.priceCents, pricing, { ...selection, addonIds }),
    [product.priceCents, pricing, selection, addonIds],
  );

  if (product.pricingInvalid) {
    return (
      <p role="status" className={`${LABEL} mt-[25px] leading-[24px]`}>
        Este serviço está indisponível no momento. Fale com o suporte para contratar.
      </p>
    );
  }

  const buy = () => buyNow(product, result);

  return (
    <>
      {pricing.mode === "QUANTITY" ? (
        <QuantityControl
          pricing={pricing}
          basePriceCents={product.priceCents}
          value={selection.quantity ?? pricing.min}
          onChange={(quantity) => setSelection({ quantity })}
        />
      ) : null}

      {pricing.mode === "LEVEL_RANGE" ? (
        <LevelRangeControl
          pricing={pricing}
          from={selection.levelFrom ?? pricing.min}
          to={selection.levelTo ?? pricing.max}
          onChange={(levelFrom, levelTo) => setSelection({ levelFrom, levelTo })}
        />
      ) : null}

      {pricing.addons && pricing.addons.length > 0 ? (
        <AddonList
          // Preço fixo + serviços marcáveis é o layout "Lista de serviços"
          // (Figma 1735:4247, "Select Service"): ali eles SÃO o serviço, não
          // um extra. Nos outros modos continuam "Adicionais".
          title={pricing.mode === "FIXED" ? "Selecionar serviços:" : "Adicionais:"}
          addons={pricing.addons}
          selected={addonIds}
          onToggle={(id) =>
            setAddonIds((current) =>
              current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
            )
          }
        />
      ) : null}

      <div aria-hidden className="mt-[26px] h-px w-full bg-white/20" />

      <div aria-live="polite" className="mt-[25px]">
        {result.ok ? (
          <>
            <p className="font-poppins text-[18px] leading-[27px] font-bold tracking-[0.36px] text-white">
              {formatPrice(result.totalCents)}
            </p>
            {result.hours > 0 ? (
              <p className="mt-[5px] font-helvetica text-[14px] leading-none font-bold tracking-[0.14px] text-white/80">
                Total de Horas: {formatHours(result.hours)}
              </p>
            ) : null}
          </>
        ) : (
          <p role="alert" className="font-helvetica text-[15px] leading-[22px] text-[#ff6b6b]">
            {result.message}
          </p>
        )}
      </div>

      <Button variant="cta" fullWidth className="mt-[15px]" disabled={!result.ok} onClick={buy}>
        COMPRAR AGORA
      </Button>
    </>
  );
}

/** Valida o texto digitado: inteiro, preso ao intervalo. `null` = vazio/lixo. */
function parseInteger(raw: string): number | null {
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Campo numérico que só confirma no blur/Enter, já corrigido para a regra. */
export function NumberBox({
  id,
  value,
  min,
  max,
  onCommit,
  className = VALUE_BOX,
  ariaLabel,
}: {
  id: string;
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    if (draft === null) return;
    const parsed = parseInteger(draft);
    setDraft(null);
    onCommit(parsed === null ? value : clamp(parsed, min, max));
  }

  return (
    <input
      id={id}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={draft ?? String(value)}
      aria-label={ariaLabel}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        }
      }}
      className={className}
    />
  );
}

function QuantityControl({
  pricing,
  basePriceCents,
  value,
  onChange,
}: {
  pricing: Extract<Pricing, { mode: "QUANTITY" }>;
  basePriceCents: number;
  value: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const { min, max, step } = pricing;

  // Só valores da regra: min, min+step, min+2·step… ≤ max.
  const snap = (raw: number) => snapQuantity(pricing, raw);

  const tiers = [...(pricing.tiers ?? [])].sort((a, b) => a.from - b.from);

  return (
    <div className="mt-[25px] first:mt-0">
      <label htmlFor={id} className={TITLE}>
        {pricing.unitLabel}:
      </label>
      <div className="mt-[15px] flex items-center gap-[15px]">
        <StepButton label={`Diminuir ${pricing.unitLabel.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(snap(value - step))}>
          −
        </StepButton>
        <NumberBox id={id} value={value} min={min} max={max} onCommit={(next) => onChange(snap(next))} />
        <StepButton label={`Aumentar ${pricing.unitLabel.toLowerCase()}`} disabled={value + step > max} onClick={() => onChange(snap(value + step))}>
          +
        </StepButton>
      </div>
      <p className={`${LABEL} mt-[12px] leading-[22px]`}>
        De {min} a {max}
        {step > 1 ? `, de ${step} em ${step}` : ""}. {formatPrice(basePriceCents)} cada.
      </p>
      {tiers.length > 0 ? (
        <ul className="mt-[6px] space-y-[4px]">
          {tiers.map((tier) => (
            <li key={tier.from} className={`${LABEL} leading-[22px]`}>
              A partir de {tier.from}: {formatPrice(tier.unitPriceCents)} cada
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function StepButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-[50px] items-center justify-center rounded-[8px] border border-white/10 bg-[image:var(--brand-surface-fill)] font-poppins text-[18px] font-bold text-white transition-opacity outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-brand-orange disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/**
 * Nível inicial → desejado (Figma: as duas caixas, a seta e a trilha).
 *
 * UMA trilha, e ela controla o DESEJADO — o inicial se digita na caixa. Dois
 * polegares na mesma trilha ficam inalcançáveis quando se encostam, e o
 * inicial quase sempre é "onde eu estou", digitado uma vez.
 */
function LevelRangeControl({
  pricing,
  from,
  to,
  onChange,
}: {
  pricing: Extract<Pricing, { mode: "LEVEL_RANGE" }>;
  from: number;
  to: number;
  onChange: (from: number, to: number) => void;
}) {
  const id = useId();
  const { min, max } = pricing;
  const span = Math.max(max - min, 1);
  const pct = (value: number) => ((value - min) / span) * 100;

  return (
    <div className="mt-[25px] first:mt-0">
      <div className="grid grid-cols-[minmax(0,150px)_1fr_minmax(0,150px)] items-end">
        <label htmlFor={`${id}-from`} className={LABEL}>
          Nível Inicial:
        </label>
        <span />
        <label htmlFor={`${id}-to`} className={LABEL}>
          Nível Desejado:
        </label>
      </div>
      <div className="mt-[16px] grid grid-cols-[minmax(0,150px)_1fr_minmax(0,150px)] items-center">
        <NumberBox
          id={`${id}-from`}
          value={from}
          min={min}
          max={Math.max(min, to - 1)}
          onCommit={(next) => onChange(next, to)}
        />
        <Image
          src="/icons/game/service-arrow.svg"
          alt=""
          width={35}
          height={24.15}
          aria-hidden
          className="mx-auto h-[24.15px] w-[35px]"
        />
        <NumberBox
          id={`${id}-to`}
          value={to}
          min={Math.min(max, from + 1)}
          max={max}
          onCommit={(next) => onChange(from, next)}
        />
      </div>

      <label htmlFor={`${id}-range`} className={`${TITLE} mt-[25px] block`}>
        {pricing.unitLabel}:
      </label>
      <div className="relative mt-[21px] h-[29px] w-full">
        {/* A trilha e o polegar são DESENHO; quem recebe foco, teclado e
            leitor de tela é o `<input type="range">` nativo por cima deles. */}
        <input
          id={`${id}-range`}
          type="range"
          min={min}
          max={max}
          step={1}
          value={to}
          aria-valuetext={`${pricing.unitLabel} ${from} até ${to}`}
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange(from, Math.max(next, Math.min(max, from + 1)));
          }}
          className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        <div
          aria-hidden
          className="absolute top-[6px] left-0 h-[17px] w-full overflow-hidden rounded-[3px] border border-brand-hairline bg-[linear-gradient(180deg,rgba(97,97,97,0.1),rgba(36,36,36,0.1))]"
        >
          <div
            className="absolute inset-y-0 bg-[linear-gradient(175.5deg,#ff7300_13.8%,#ff4d00_89.2%)]"
            style={{ left: `${pct(from)}%`, width: `${Math.max(pct(to) - pct(from), 0)}%` }}
          />
        </div>
        <div
          aria-hidden
          className="absolute top-0 h-[29px] w-[8px] -translate-x-1/2 rounded-full bg-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand-orange peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-black"
          style={{ left: `clamp(4px, ${pct(to)}%, calc(100% - 4px))` }}
        />
      </div>
      <div className="mt-[16px] flex justify-between">
        <span className={LABEL}>lvl: {min}</span>
        <span className={LABEL}>lvl: {max}</span>
      </div>
    </div>
  );
}

/**
 * Adicionais como LINHAS marcáveis (Figma 1735:4247): caixinha 33×30 à
 * esquerda, nome em #d8d8d8 e "+ R$ 180,00" à direita. Acima de
 * `ADDON_SEARCH_THRESHOLD` itens entra o campo "Pesquisar itens..." — a busca
 * só FILTRA a lista (os marcados nunca somem); preço continua sendo só `quote`.
 *
 * Caixa de seleção NATIVA escondida por baixo do desenho: teclado (espaço),
 * leitor de tela e o `<label>` clicável vêm de graça.
 */
function AddonList({
  title,
  addons,
  selected,
  onToggle,
}: {
  title: string;
  addons: NonNullable<Pricing["addons"]>;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const id = useId();
  const [search, setSearch] = useState("");
  const searchable = addons.length > ADDON_SEARCH_THRESHOLD;
  const visible = searchable ? filterAddons(addons, search, selected) : addons;

  return (
    <div className="mt-[25px] first:mt-0">
      <h3 id={id} className={TITLE}>
        {title}
      </h3>

      {searchable ? (
        <div role="search" className="relative mt-[15px] h-[50px] w-full">
          <Image
            src="/icons/search.svg"
            alt=""
            width={20}
            height={20}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-[25px] size-[20px] -translate-y-1/2"
          />
          <input
            type="search"
            value={search}
            maxLength={80}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Pesquisar itens"
            placeholder="Pesquisar itens..."
            className="h-full w-full rounded-full border border-brand-border bg-[image:var(--brand-surface-fill)] pr-[20px] pl-[60px] font-helvetica text-[15px] tracking-[0.15px] text-white outline-none placeholder:text-brand-placeholder focus-visible:border-brand-orange"
          />
        </div>
      ) : null}

      <div role="group" aria-labelledby={id} className="mt-[15px] flex flex-col gap-[15px]">
        {visible.map((addon) => {
          const on = selected.includes(addon.id);
          const suffix =
            addon.kind === "PERCENT" ? `+ ${addon.value}%` : `+ ${formatPrice(addon.value)}`;
          return (
            <div key={addon.id}>
              <label className="flex cursor-pointer items-center gap-[15px]">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => onToggle(addon.id)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className={`h-[30px] w-[33px] shrink-0 rounded-[8px] border-2 border-white/10 backdrop-blur-[100px] peer-focus-visible:ring-2 peer-focus-visible:ring-brand-orange ${
                    on ? "bg-[image:var(--brand-orange-gradient)]" : "bg-[image:var(--brand-surface-fill)]"
                  }`}
                />
                <span className="min-w-0 flex-1 font-helvetica text-[16px] leading-[20px] tracking-[0.16px] break-words text-brand-placeholder">
                  {addon.label}
                </span>
                <span className="shrink-0 font-helvetica text-[16px] leading-none font-bold tracking-[0.16px] text-white">
                  {suffix}
                </span>
              </label>
            </div>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p role="status" className={`${LABEL} mt-[15px] leading-[22px]`}>
          Nenhum item encontrado.
        </p>
      ) : null}
    </div>
  );
}
