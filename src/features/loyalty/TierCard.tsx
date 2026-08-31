import Image from "next/image";
import { StatBox, StatValue } from "@/components/ui/StatBox";
import { TIER_ACCENT_GRADIENT, formatBRL, type Tier } from "./tiers";

/**
 * Card de nível (Figma 2312:1085 e irmãos) — 302×450, raio 30.
 *
 * Medidas: barra de destaque de 202×2 centrada no topo (com uma cópia borrada
 * atrás), título em (25,50), subtítulo em (25,79), emblema com posição e
 * tamanho próprios de cada nível, caixa de cashback em (25,230) 252×96 e a
 * etiqueta "Seu nível atual" em (25,351) 252×49.
 *
 * A etiqueta só aparece no nível atual. No arquivo do Figma ela está nos CINCO
 * cards — provável descuido de duplicação: dizer "Seu nível atual" em todos
 * torna a informação inútil. Ver .claude/context/open-questions.md.
 */
export function TierCard({
  tier,
  isCurrent,
}: {
  tier: Tier;
  isCurrent: boolean;
}) {
  return (
    <article className="relative h-[450px] w-[302px] shrink-0 overflow-hidden rounded-[30px] border border-white/10 bg-brand-surface">
      {/* Barra de destaque: a de baixo é nítida (2px), a de cima é a mesma com
          blur de 9px fazendo o halo. */}
      <div
        aria-hidden
        className="absolute top-px left-1/2 h-[4px] w-[202px] -translate-x-1/2 rounded-[99px] blur-[9.05px]"
        style={{ backgroundImage: TIER_ACCENT_GRADIENT }}
      />
      <div
        aria-hidden
        className="absolute top-px left-1/2 h-[2px] w-[202px] -translate-x-1/2 rounded-[99px]"
        style={{ backgroundImage: TIER_ACCENT_GRADIENT }}
      />

      <h3 className="absolute top-[50px] left-[25px] font-helvetica text-[22px] leading-[24px] font-bold tracking-[0.22px] text-white">
        {tier.name}
      </h3>

      <p className="absolute top-[79px] left-[25px] font-helvetica text-[16px] leading-[16px] tracking-[0.16px] text-brand-placeholder">
        A partir de {formatBRL(tier.minSpend)}
      </p>

      {/* Emblema — cada nível tem tamanho e posição próprios (ver `tiers.ts`).
          Os níveis altos ganham uma cópia borrada atrás, como no design. */}
      {tier.glow ? (
        <Image
          src={tier.icon}
          alt=""
          width={tier.iconSize}
          height={tier.iconSize}
          aria-hidden
          className="absolute object-contain blur-[13.5px]"
          style={{
            left: tier.iconLeft,
            top: tier.iconTop,
            width: tier.iconSize,
            height: tier.iconSize,
          }}
        />
      ) : null}

      <Image
        src={tier.icon}
        alt=""
        width={tier.iconSize}
        height={tier.iconSize}
        aria-hidden
        className="absolute object-contain"
        style={{
          left: tier.iconLeft,
          top: tier.iconTop,
          width: tier.iconSize,
          height: tier.iconSize,
        }}
      />

      <StatBox
        label="Cashback"
        className="absolute top-[230px] left-[25px] h-[96px] w-[252px]"
        contentClassName="px-[25px]"
      >
        {/* 22px aqui, contra 24px no painel-resumo. */}
        <StatValue className="text-[22px] tracking-[0.22px]">
          {tier.cashback}
        </StatValue>
      </StatBox>

      {isCurrent ? (
        <p className="absolute top-[351px] left-[25px] flex h-[49px] w-[252px] items-center justify-center rounded-[15px] border border-brand-orange bg-brand-orange/[0.06] font-helvetica text-[14px] font-bold tracking-[0.14px] text-white">
          Seu nível atual
        </p>
      ) : null}
    </article>
  );
}
