"use client";

import Image from "next/image";
import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { quote, type Pricing } from "@/features/pricing/quote";
import { formatQuantity, initialQuantity, snapQuantity, validPresets } from "./configurator";
import { formatPrice } from "./content";
import type { ProductContext } from "./ProductCard";
import { NumberBox, ProductSelect } from "./ServiceConfigurator";
import type { GameProduct } from "./types";
import { useBuyNow } from "./useBuyNow";

/**
 * Layout QUANTIDADE (aba Gold, Figma 1629:631): painel "Selecione Sua
 * Quantidade:" (1287×352) com as quantidades PRONTAS em botões e a barra −/+
 * de quantidade livre, e à direita o card "Preço" (403×352).
 *
 * Client component só pelo estado que muda o PREÇO (produto e quantidade). O
 * servidor da URL e a lista de produtos chegam prontos do `QuantitySection`.
 * Preço = `quote()` (prévia); quem cobra é o backend, com a mesma função.
 *
 * Abaixo de 1024px o painel e o card empilham, e a grade de quantidades cai
 * de 6 para 3/2 colunas — nada com largura fixa maior que a tela.
 */
export function QuantityConfigurator({
  products,
  context,
  emptyMessage,
}: {
  products: GameProduct[];
  context: ProductContext;
  emptyMessage: string;
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const product = products.find((item) => item.id === productId) ?? products[0];

  if (!product) {
    return (
      <div className={PANEL}>
        <p role="status" className="font-helvetica text-[16px] leading-[24px] text-brand-placeholder">
          {emptyMessage}
        </p>
      </div>
    );
  }

  // `key`: trocar de produto recomeça a quantidade — a regra de um não vale
  // para o outro (mínimo, passo e quantidades prontas são por produto).
  return (
    <QuantityPanel
      key={product.id}
      product={product}
      products={products}
      onProductChange={setProductId}
      context={context}
    />
  );
}

const PANEL =
  "rounded-[30px] border border-brand-border bg-[image:var(--brand-surface-fill)] px-[24px] pt-[25px] pb-[26px] sm:px-[49px]";
const TITLE = "font-helvetica text-[18px] leading-[22px] font-bold tracking-[0.18px] text-white";
const LABEL = "font-helvetica text-[16px] leading-[20px] tracking-[0.16px] text-brand-placeholder";
/** Os botões −/+ do arquivo: 56×56, degradê laranja, borda 2px branca 10%. */
const STEP =
  "flex size-[56px] shrink-0 items-center justify-center rounded-[8px] border-2 border-white/10 bg-[image:var(--brand-orange-gradient)] font-poppins text-[18px] font-bold text-white backdrop-blur-[100px] transition-opacity outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg disabled:cursor-not-allowed disabled:opacity-40";

const FIXED: Pricing = { mode: "FIXED" };

function QuantityPanel({
  product,
  products,
  onProductChange,
  context,
}: {
  product: GameProduct;
  products: GameProduct[];
  onProductChange: (id: string) => void;
  context: ProductContext;
}) {
  const id = useId();
  const buyNow = useBuyNow(context);
  const pricing = product.pricing ?? FIXED;
  const quantityPricing = pricing.mode === "QUANTITY" ? pricing : null;

  const [quantity, setQuantity] = useState(() => (quantityPricing ? initialQuantity(quantityPricing) : 1));

  // Produto de aba QUANTITY com regra de outro modo (o admin pode salvar FIXED
  // ou faixa de nível): sem botões nem barra, e o `quote` roda com a escolha
  // padrão do modo — a tela mostra o mesmo preço que o backend cobraria.
  const result = useMemo(
    () => quote(product.priceCents, pricing, quantityPricing ? { quantity } : {}),
    [product.priceCents, pricing, quantityPricing, quantity],
  );

  const presets = quantityPricing ? validPresets(quantityPricing) : [];
  const unitLabel = quantityPricing?.unitLabel ?? "";
  function set(next: number) {
    if (quantityPricing) setQuantity(snapQuantity(quantityPricing, next));
  }

  const unavailable = product.pricingInvalid;

  return (
    <div className="flex flex-col gap-[25px] lg:flex-row lg:items-stretch">
      <section aria-labelledby={`${id}-title`} className={`${PANEL} min-w-0 lg:max-w-[1287px] lg:flex-1`}>
        {products.length > 1 ? (
          // Mais de um produto no escopo (aba + servidor): o select substitui
          // o título. `h2` escondido mantém o nome da região para leitor de tela.
          <>
            <h2 id={`${id}-title`} className="sr-only">
              {product.name}
            </h2>
            <ProductSelect products={products} value={product.id} onChange={onProductChange} />
          </>
        ) : (
          <h2 id={`${id}-title`} className={`${TITLE} break-words`}>
            {product.name}
          </h2>
        )}

        <div aria-hidden className="mt-[15px] h-px w-full bg-white/10" />

        {unavailable ? (
          <p role="status" className={`${LABEL} mt-[16px] leading-[24px]`}>
            Este produto está indisponível no momento. Fale com o suporte para comprar.
          </p>
        ) : quantityPricing ? (
          <>
            <p id={`${id}-label`} className={`${LABEL} mt-[16px]`}>
              Selecione Sua Quantidade:
            </p>

            {presets.length > 0 ? (
              <div
                role="group"
                aria-labelledby={`${id}-label`}
                className="mt-[15px] grid grid-cols-2 gap-x-[25px] gap-y-[15px] sm:grid-cols-3 lg:grid-cols-6"
              >
                {presets.map((preset) => {
                  const active = preset === quantity;
                  return (
                    <button
                      key={preset}
                      type="button"
                      aria-pressed={active}
                      // O número inteiro ao passar o mouse ("1Mi" = 1.000.000).
                      title={preset.toLocaleString("pt-BR")}
                      onClick={() => set(preset)}
                      className={`h-[40px] min-w-0 truncate rounded-[8px] border border-white/10 px-[10px] font-poppins text-[13px] font-bold tracking-[0.13px] backdrop-blur-[100px] transition-opacity outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-brand-orange ${
                        active
                          ? "bg-[image:var(--brand-orange-gradient)] text-white"
                          : "bg-[image:var(--brand-surface-fill)] text-white/80"
                      }`}
                    >
                      {formatQuantity(preset)}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {/* Quantidade livre (1025×56 no arquivo, número em laranja). */}
            <div className="mt-[15px] flex items-center gap-[15px] sm:gap-[25px]">
              <button
                type="button"
                className={STEP}
                aria-label={`Diminuir ${unitLabel.toLowerCase()}`}
                disabled={quantity <= quantityPricing.min}
                onClick={() => set(quantity - quantityPricing.step)}
              >
                −
              </button>
              <NumberBox
                id={`${id}-quantity`}
                value={quantity}
                min={quantityPricing.min}
                max={quantityPricing.max}
                onCommit={set}
                ariaLabel={`Quantidade (${unitLabel})`}
                className="h-[56px] min-w-0 flex-1 rounded-[8px] border border-white/10 bg-[image:var(--brand-surface-fill)] text-center font-poppins text-[16px] font-bold tracking-[0.16px] text-brand-orange backdrop-blur-[100px] outline-none [appearance:textfield] focus-visible:border-brand-orange [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                type="button"
                className={STEP}
                aria-label={`Aumentar ${unitLabel.toLowerCase()}`}
                disabled={quantity + quantityPricing.step > quantityPricing.max}
                onClick={() => set(quantity + quantityPricing.step)}
              >
                +
              </button>
            </div>
            <p className={`${LABEL} mt-[12px] text-[14px]`}>
              De {formatQuantity(quantityPricing.min)} a {formatQuantity(quantityPricing.max)}
              {quantityPricing.step > 1 ? `, de ${formatQuantity(quantityPricing.step)} em ${formatQuantity(quantityPricing.step)}` : ""}.
            </p>
          </>
        ) : null}
      </section>

      {/* Card "Preço" (1666:1640, 403×352). */}
      <section
        aria-labelledby={`${id}-price`}
        className={`${PANEL} flex flex-col lg:w-[403px] lg:shrink-0`}
      >
        <h2 id={`${id}-price`} className={TITLE}>
          Preço
        </h2>
        <div aria-hidden className="mt-[15px] h-px w-full bg-white/10" />

        <div className="mt-[15px] flex min-h-[115px] items-center justify-between gap-[15px] rounded-[8px] border-2 border-white/10 bg-[image:var(--brand-surface-fill)] px-[20px] py-[20px] backdrop-blur-[100px]">
          <p aria-live="polite" className="min-w-0 font-poppins text-[18px] leading-[27px] font-bold tracking-[0.18px] break-words text-white">
            {unavailable ? "-" : result.ok ? formatPrice(result.totalCents) : "-"}
          </p>
          <div className="relative h-[65px] w-[95px] shrink-0 overflow-hidden rounded-[8px] bg-[#2f2f2f]">
            {product.image ? (
              <Image src={product.image.src} alt="" fill sizes="95px" className="object-cover" />
            ) : null}
          </div>
        </div>

        <dl className="mt-[20px] flex flex-col gap-[15px]">
          <Row label="Plataforma/Servidor" value={product.serverLabel ?? context.platform} />
          {quantityPricing ? (
            <Row label="Quantidade" value={`${formatQuantity(quantity)} ${unitLabel}`} />
          ) : null}
        </dl>

        {!unavailable && !result.ok ? (
          <p role="alert" className="mt-[15px] font-helvetica text-[14px] leading-[20px] text-[#ff6b6b]">
            {result.message}
          </p>
        ) : null}

        {/* `mt-auto` encosta o botão no pé do card (352 no arquivo); o `pt`
            garante o respiro mesmo quando o conteúdo enche o card — sem ele a
            linha "Quantidade" colava no botão. */}
        <div className="mt-auto pt-[25px]">
          <Button
            variant="cta"
            fullWidth
            disabled={unavailable || !result.ok}
            onClick={() => buyNow(product, result)}
          >
            COMPRAR AGORA
          </Button>
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-[15px]">
      <dt className="font-helvetica text-[14px] leading-[18px] font-bold tracking-[0.14px] text-white/80">{label}</dt>
      <dd className="min-w-0 text-right font-poppins text-[14px] leading-[18px] font-semibold tracking-[0.07px] break-words text-white">
        {value}
      </dd>
    </div>
  );
}
