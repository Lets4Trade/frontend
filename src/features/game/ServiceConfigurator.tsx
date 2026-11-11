"use client";

import Image from "next/image";
import { useId, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { SelectField } from "@/components/ui/SelectField";
import { formatHours } from "@/features/cart/store";
import { addonsTitle, isAddonGroup, maxUnitsOf, quote, type Pricing, type Selection } from "@/features/pricing/quote";
import { ADDON_SEARCH_THRESHOLD, atLimit, filterAddons, snapQuantity, toggleAddon } from "./configurator";
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
  topArt = "banner",
}: {
  products: GameProduct[];
  context: ProductContext;
  /** As pílulas de servidor e categoria, montadas no servidor. */
  filters: ReactNode;
  emptyMessage: string;
  /**
   * Qual arte vai no topo (2026-11-04, pedido do usuário): a aba SERVIÇO usa o
   * banner; a página do PACOTE usa a imagem do card (o banner do pacote vai
   * para o painel que abre ao passar o mouse no card). Sem a arte, só o texto.
   */
  topArt?: "banner" | "image";
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const product = products.find((item) => item.id === productId) ?? products[0];
  const art = topArt === "image" ? product?.image : product?.banner;

  return (
    <div className="relative w-full shrink-0 overflow-hidden rounded-[30px] border border-brand-hairline bg-black desk:w-[554px]">
      {/* Banner do serviço escolhido no topo (Mentoria 4222:1160: 551×327,
          cantos 30). SEM banner, a tela mostra só o texto (2026-11-04, pedido
          do usuário) — antes caía na arte do card ou num retângulo cinza.
          Proporção no celular para a foto não virar uma faixa fina. */}
      {art ? (
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-t-[30px] desk:aspect-auto",
            // Imagem do card: quadro mais alto (4:3 no celular, 420 no
            // computador) para a arte inteira não ficar pequena.
            topArt === "image"
              ? "aspect-[4/3] bg-black desk:h-[420px]"
              : "aspect-[551/327] bg-[#2f2f2f] desk:h-[327px]",
          )}
        >
          {/* Imagem do card (pacote) é quadrada/em pé e a faixa é deitada:
              `contain` mostra a arte INTEIRA sobre o preto do quadro (2026-11-04,
              pedido do usuário — com `cover` a ponta da arma era cortada). O
              banner é feito para a faixa (1102×654) e continua preenchendo. */}
          <Image
            src={art.src}
            alt=""
            fill
            sizes="(min-width: 1392px) 554px, 100vw"
            className={topArt === "image" ? "object-contain" : "object-cover"}
          />
          {/* Degradê preto no pé da foto: garante leitura do primeiro título
              sobre qualquer arte que o admin subir. Mais curto na imagem do
              card, que já termina no preto e perderia a parte de baixo. */}
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-b from-transparent to-black",
              topArt === "image" ? "h-[40px]" : "h-[121px]",
            )}
          />
        </div>
      ) : null}

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
      // Nome próprio do menu quando o admin escreveu um (2026-11-04).
      options={products.map((item) => ({ value: item.id, label: item.serviceLabel || item.name }))}
      value={value}
      onValueChange={onChange}
      className="desk:max-w-[452px]"
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
  // Quantas vezes a mesma escolha (2026-11-11, pedido do usuário). Só no preço
  // fixo com "máximo de unidades por compra" no painel; vazio = sem seletor.
  const maxUnits = maxUnitsOf(pricing);
  const multiUnit = maxUnits > 1;
  const [units, setUnits] = useState(1);

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

  const buy = () => buyNow(product, result, multiUnit ? units : 1);
  const shownUnits = multiUnit ? units : 1;

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
          // um extra. Nos outros modos continuam "Adicionais". Desde
          // 2026-11-09 o título vem do painel (`addonsTitle`), com esses padrões.
          title={addonsTitle(pricing)}
          addons={pricing.addons}
          maxAddons={pricing.maxAddons}
          selected={addonIds}
          // Limites de serviços e subserviços aplicados no clique (`toggleAddon`).
          onToggle={(id) => setAddonIds((current) => toggleAddon(pricing, current, id))}
        />
      ) : null}

      <div aria-hidden className="mt-[26px] h-px w-full bg-white/20" />

      {/* Preço à esquerda e, no preço fixo, o seletor de quantidade à direita,
          logo acima do COMPRAR AGORA (2026-11-11). O total já é × quantidade —
          a mesma conta que o backend faz (`quote` de uma × unidades). */}
      <div className="mt-[25px] flex items-center justify-between gap-[15px]">
        <div aria-live="polite" className="min-w-0">
          {result.ok ? (
            <>
              <p className="font-poppins text-[18px] leading-[27px] font-bold tracking-[0.36px] break-words text-white">
                {formatPrice(result.totalCents * shownUnits)}
              </p>
              {shownUnits > 1 ? (
                <p className="mt-[2px] font-helvetica text-[13px] leading-[18px] text-white/60">
                  {shownUnits} × {formatPrice(result.totalCents)}
                </p>
              ) : null}
              {result.hours > 0 ? (
                <p className="mt-[5px] font-helvetica text-[14px] leading-none font-bold tracking-[0.14px] text-white/80">
                  Total de Horas: {formatHours(result.hours * shownUnits)}
                </p>
              ) : null}
            </>
          ) : (
            <p role="alert" className="font-helvetica text-[15px] leading-[22px] text-[#ff6b6b]">
              {result.message}
            </p>
          )}
        </div>
        {multiUnit ? <UnitStepper value={units} max={maxUnits} onChange={setUnits} label={product.name} /> : null}
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
  maxAddons,
  selected,
  onToggle,
}: {
  title: string;
  addons: NonNullable<Pricing["addons"]>;
  /** Quantos serviços podem ser marcados (2026-11-09). Ausente = sem limite. */
  maxAddons?: number;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const id = useId();
  const [search, setSearch] = useState("");
  // A busca conta OPÇÕES marcáveis: os serviços soltos e os subserviços dos
  // grupos (o grupo em si é só título).
  const options = addons.reduce((total, addon) => total + (isAddonGroup(addon) ? addon.children!.length : 1), 0);
  const searchable = options > ADDON_SEARCH_THRESHOLD;
  const visible = searchable ? filterAddons(addons, search, selected) : addons;
  const chosen = addons.filter((addon) => !isAddonGroup(addon) && selected.includes(addon.id)).length;
  const full = atLimit(chosen, maxAddons);

  return (
    <div className="mt-[25px] first:mt-0">
      <h3 id={id} className={TITLE}>
        {title}
      </h3>
      {maxAddons ? <LimitHint max={maxAddons} chosen={chosen} /> : null}

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
          if (!isAddonGroup(addon)) {
            const on = selected.includes(addon.id);
            return <AddonRow key={addon.id} addon={addon} on={on} disabled={!on && full} onToggle={() => onToggle(addon.id)} />;
          }
          // Grupo (2026-11-11, pedido do usuário): o serviço com subserviços
          // é a CAIXINHA GRANDE sem preço e os subserviços ficam menores,
          // alinhados com ela (sem recuo nem linha), sempre abertos. A caixinha não é clicável: só
          // ACENDE quando algum subserviço está marcado (é o grupo que não
          // cobra — quem entra na conta são os subserviços).
          const children = addon.children ?? [];
          const chosenChildren = (addons.find((item) => item.id === addon.id)?.children ?? []).filter((child) =>
            selected.includes(child.id),
          ).length;
          const headingId = `${id}-${addon.id}`;
          return (
            // Respiro entre um grupo e o que vem antes (2026-11-11: "tá tudo
            // colado"): os 15px do `gap` da lista + 15px aqui.
            <div key={addon.id} role="group" aria-labelledby={headingId} className="[&:not(:first-child)]:mt-[15px]">
              <div className="flex items-center gap-[15px]">
                <AddonBox on={chosenChildren > 0} />
                <h4
                  id={headingId}
                  className="min-w-0 flex-1 font-helvetica text-[16px] leading-[20px] tracking-[0.16px] break-words text-brand-placeholder"
                >
                  {addon.label}
                </h4>
              </div>
              <div className="mt-[12px] flex flex-col gap-[12px]">
                {addon.maxChildren ? <LimitHint max={addon.maxChildren} chosen={chosenChildren} /> : null}
                {children.map((child) => {
                  const childOn = selected.includes(child.id);
                  return (
                    <AddonRow
                      key={child.id}
                      addon={child}
                      on={childOn}
                      small
                      disabled={!childOn && atLimit(chosenChildren, addon.maxChildren)}
                      onToggle={() => onToggle(child.id)}
                    />
                  );
                })}
              </div>
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

/** "Escolha até 2 · 1 escolhido" — o limite de uma lista (2026-11-09). */
function LimitHint({ max, chosen }: { max: number; chosen: number }) {
  return (
    <p className="mt-[8px] font-helvetica text-[13px] leading-[18px] text-white/60">
      {max === 1 ? "Escolha 1" : `Escolha até ${max}`}
      {chosen > 0 ? ` · ${chosen} ${chosen === 1 ? "escolhido" : "escolhidos"}` : ""}
    </p>
  );
}

/**
 * Uma linha marcável (serviço ou subserviço). Caixa de seleção NATIVA escondida
 * por baixo do desenho: teclado (espaço), leitor de tela e o `<label>`
 * clicável vêm de graça. `disabled` = lista no limite.
 */
function AddonRow({
  addon,
  on,
  disabled,
  small = false,
  onToggle,
}: {
  addon: { id: string; label: string; kind: "PERCENT" | "FIXED"; value: number };
  on: boolean;
  disabled: boolean;
  /** Subserviço dentro de um grupo: caixinha e texto menores. */
  small?: boolean;
  onToggle: () => void;
}) {
  // Percentual negativo é DESCONTO (2026-10-09): "− 100%", nunca "+ -100%".
  const sign = addon.value < 0 ? "−" : "+";
  const suffix = addon.kind === "PERCENT" ? `${sign} ${Math.abs(addon.value)}%` : `+ ${formatPrice(addon.value)}`;
  return (
    <label
      className={`flex items-center gap-[15px] ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
      title={disabled ? "Limite de escolhas atingido: desmarque outro para trocar." : undefined}
    >
      <input type="checkbox" checked={on} disabled={disabled} onChange={onToggle} className="peer sr-only" />
      <AddonBox on={on} small={small} />
      <span
        className={`min-w-0 flex-1 font-helvetica ${small ? "text-[15px]" : "text-[16px]"} leading-[20px] tracking-[0.16px] break-words text-brand-placeholder`}
      >
        {addon.label}
      </span>
      <span className="shrink-0 font-helvetica text-[16px] leading-none font-bold tracking-[0.16px] text-white">
        {suffix}
      </span>
    </label>
  );
}

/**
 * O desenho da caixinha (33×30 no Figma; 26×24 no subserviço). Só desenho: na
 * linha marcável quem recebe foco é o `<input>` escondido antes dela (o
 * `peer`); no grupo ela só acende (2026-11-11).
 *
 * Subserviço marcado ganha o ✓ branco dentro (2026-11-11, pedido do usuário).
 */
function AddonBox({ on, small = false }: { on: boolean; small?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex ${small ? "h-[24px] w-[26px]" : "h-[30px] w-[33px]"} shrink-0 items-center justify-center rounded-[8px] border-2 border-white/10 backdrop-blur-[100px] peer-focus-visible:ring-2 peer-focus-visible:ring-brand-orange ${
        on ? "bg-[image:var(--brand-orange-gradient)]" : "bg-[image:var(--brand-surface-fill)]"
      }`}
    >
      {on && small ? (
        <svg viewBox="0 0 16 16" fill="none" className="size-[14px]" data-testid="addon-check">
          <path d="M3.5 8.5l3 3 6-7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </span>
  );
}

/**
 * Seletor de quantidade do preço fixo (2026-11-11): − N +, no estilo dos
 * botões do card de produto. 1 a `max` (o `maxUnits` do painel); o backend
 * confere de novo.
 */
function UnitStepper({
  value,
  max,
  onChange,
  label,
}: {
  value: number;
  max: number;
  /** Recebe a ATUALIZAÇÃO (não o número): dois cliques seguidos somam dois. */
  onChange: (update: (current: number) => number) => void;
  label: string;
}) {
  const STEP_BUTTON =
    "flex size-[40px] items-center justify-center rounded-[8px] border border-white/10 bg-[image:var(--brand-surface-fill)] font-poppins text-[18px] font-bold text-white transition-opacity outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-brand-orange disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div role="group" aria-label={`Quantidade de ${label}`} className="flex shrink-0 items-center gap-[10px]">
      <button
        type="button"
        className={STEP_BUTTON}
        aria-label="Diminuir a quantidade"
        disabled={value <= 1}
        onClick={() => onChange((current) => Math.max(1, current - 1))}
      >
        −
      </button>
      <span aria-live="polite" className="min-w-[24px] text-center font-poppins text-[18px] font-bold text-white tabular-nums">
        {value}
      </span>
      <button
        type="button"
        className={STEP_BUTTON}
        aria-label="Aumentar a quantidade"
        disabled={value >= max}
        onClick={() => onChange((current) => Math.min(max, current + 1))}
      >
        +
      </button>
    </div>
  );
}
