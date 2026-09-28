"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { formatHours, useCart } from "@/features/cart/store";
import { quote, type Pricing, type Selection } from "@/features/pricing/quote";
import { formatPrice } from "./content";
import { pillClassName } from "./pill";
import type { ProductContext } from "./ProductCard";
import type { GameProduct } from "./types";

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
  const groupId = useId();

  return (
    <div className="relative w-full shrink-0 overflow-hidden rounded-[30px] border border-brand-hairline bg-black lg:w-[554px]">
      {/* Espaço da arte: a do produto escolhido, ou o cinza do arquivo. */}
      <div className="relative h-[276px] overflow-hidden rounded-t-[30px] bg-[#2f2f2f]">
        {product?.image ? (
          <Image
            src={product.image.src}
            alt=""
            fill
            sizes="(min-width: 1024px) 554px, 100vw"
            className="object-cover"
          />
        ) : null}
      </div>
      {/* Degradê do arquivo (y 225 → 328): apaga a base da arte e passa por
          trás do primeiro título. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[225px] h-[103px] bg-gradient-to-b from-transparent to-black"
      />

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
            {products.length > 1 ? (
              <div className="mt-[25px] first:mt-0">
                <h3 id={`${groupId}-product`} className={TITLE}>
                  Selecionar Serviço:
                </h3>
                <PillRadioGroup
                  labelledBy={`${groupId}-product`}
                  options={products.map((item) => ({ value: item.id, label: item.name }))}
                  value={product.id}
                  onChange={setProductId}
                />
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
 * Pílulas de escolha única com a semântica de `radiogroup`: Tab entra no
 * grupo pela escolhida, setas trocam — o padrão da WAI-ARIA.
 */
function PillRadioGroup({
  labelledBy,
  options,
  value,
  onChange,
}: {
  labelledBy: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  function move(from: number, delta: number, event: React.KeyboardEvent<HTMLDivElement>) {
    const next = options[(from + delta + options.length) % options.length];
    onChange(next.value);
    const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]");
    buttons[(from + delta + options.length) % options.length]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="mt-[15px] flex flex-wrap gap-[25px]"
      onKeyDown={(event) => {
        const index = options.findIndex((option) => option.value === value);
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          move(index, 1, event);
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          move(index, -1, event);
        }
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={pillClassName(active, "max-w-full truncate")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

const FIXED: Pricing = { mode: "FIXED" };

function initialSelection(pricing: Pricing): Selection {
  if (pricing.mode === "QUANTITY") return { quantity: pricing.min };
  if (pricing.mode === "LEVEL_RANGE") return { levelFrom: pricing.min, levelTo: pricing.max };
  return {};
}

function ProductControls({ product, context }: { product: GameProduct; context: ProductContext }) {
  const router = useRouter();
  const addToCart = useCart((state) => state.add);
  const closeCart = useCart((state) => state.close);

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

  function buy() {
    if (!result.ok) return;
    addToCart(
      {
        productId: product.id,
        gameSlug: context.gameSlug,
        name: product.name,
        image: product.image?.src,
        gameLogo: context.gameLogo,
        platform: product.serverLabel ?? context.platform,
        // PRÉVIA para desenhar o carrinho — o backend recalcula no checkout.
        unitPriceCents: result.totalCents,
        selection: result.selection,
        summary: result.summary,
        hours: result.hours,
      },
      1,
    );
    // "Comprar agora" vai direto ao checkout; a gaveta aberta por cima dele
    // seria um passo a mais.
    closeCart();
    router.push("/checkout");
  }

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
        <AddonChips
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
function NumberBox({
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
  const snap = (raw: number) => {
    const bounded = clamp(raw, min, max);
    let snapped = min + Math.round((bounded - min) / step) * step;
    if (snapped > max) snapped -= step;
    return Math.max(snapped, min);
  };

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

function AddonChips({
  addons,
  selected,
  onToggle,
}: {
  addons: NonNullable<Pricing["addons"]>;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const id = useId();
  return (
    <div className="mt-[25px] first:mt-0">
      <h3 id={id} className={TITLE}>
        Adicionais:
      </h3>
      <div role="group" aria-labelledby={id} className="mt-[15px] flex flex-wrap gap-[15px]">
        {addons.map((addon) => {
          const on = selected.includes(addon.id);
          const suffix =
            addon.kind === "PERCENT" ? `+${addon.value}%` : `+${formatPrice(addon.value)}`;
          return (
            <button
              key={addon.id}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(addon.id)}
              className={pillClassName(on, "!min-w-0 h-[44px] px-[20px] text-[14px]")}
            >
              {addon.label}
              <span className={`ml-[8px] ${on ? "text-black/70" : "text-brand-orange"}`}>{suffix}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
