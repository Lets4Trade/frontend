import Image from "next/image";
import type { CSSProperties } from "react";
import { StatBox, StatValue } from "@/components/ui/StatBox";
import { cn } from "@/lib/cn";
import type { LoyaltyTierRule } from "./data";
import {
  TIER_ACCENT_GRADIENT,
  formatBps,
  formatCents,
  tierArt,
} from "./tiers";

/**
 * Card de nível (Figma 2312:1085 e irmãos).
 *
 * ── Reorganizado em 2026-10-27 (pedido do usuário) ─────────────────────────
 * O arquivo desenha 302×450 com tudo em posição ABSOLUTA. Dois defeitos:
 * o emblema não ocupava lugar, então "A partir de R$ 20.000,00" corria por
 * baixo da arte do Adamantium; e a altura fixa deixava ~130px de vazio entre
 * o título e o cashback — no celular, cinco cards de 450px empilhados.
 *
 * Agora é fluxo normal: título e emblema lado a lado (o texto encolhe, a arte
 * não), e a altura é a do conteúdo. No celular o card vira uma LINHA — emblema,
 * nome e o percentual à direita —, sem a caixa de cashback, que ali só repetia
 * o número com mais moldura.
 *
 * A etiqueta "Seu nível atual" só aparece no nível atual. No arquivo do Figma
 * ela está nos CINCO cards — provável descuido de duplicação: dizer "Seu nível
 * atual" em todos torna a informação inútil. Ver .claude/context/open-questions.md.
 */
export function TierCard({
  tier,
  isCurrent,
}: {
  tier: LoyaltyTierRule;
  isCurrent: boolean;
}) {
  // A faixa e o cashback vêm do backend; a arte é a única coisa que a tela
  // decide sozinha. Ver `tiers.ts`.
  const art = tierArt(tier.tier, tier.iconUrl);
  const cashback = formatBps(tier.cashbackBps);

  return (
    <article
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-[20px] border bg-brand-surface px-[16px] py-[14px] sm:rounded-[30px] sm:px-[25px] sm:pt-[30px] sm:pb-[25px]",
        // No celular a etiqueta fica pequena; a borda laranja diz o resto.
        isCurrent ? "border-brand-orange/60 sm:border-white/10" : "border-white/10",
      )}
    >
      {/* Barra de destaque: a de baixo é nítida (2px), a de cima é a mesma com
          blur de 9px fazendo o halo. */}
      <div
        aria-hidden
        className="absolute top-px left-1/2 h-[4px] w-[min(202px,60%)] -translate-x-1/2 rounded-[99px] blur-[9.05px]"
        style={{ backgroundImage: TIER_ACCENT_GRADIENT }}
      />
      <div
        aria-hidden
        className="absolute top-px left-1/2 h-[2px] w-[min(202px,60%)] -translate-x-1/2 rounded-[99px]"
        style={{ backgroundImage: TIER_ACCENT_GRADIENT }}
      />

      {/* Altura mínima = o maior emblema (77px, menos o recuo de 6): assim a
          caixa de cashback começa na mesma altura nos cinco cards. */}
      <div className="flex items-center gap-[14px] sm:min-h-[72px] sm:items-start sm:justify-between">
        {/* Emblema — o tamanho de cada nível vem de `tiers.ts` (o peso visual
            cresce com o nível); no celular, todos um pouco menores. Os níveis
            altos ganham uma cópia borrada atrás, como no design. */}
        <span
          aria-hidden
          className="relative order-first size-[52px] shrink-0 sm:order-last sm:-mt-[6px] sm:-mr-[4px] sm:size-[var(--tier-icon)]"
          style={{ "--tier-icon": `${art.iconSize}px` } as CSSProperties}
        >
          {art.glow ? (
            <Image src={art.icon} alt="" fill sizes="77px" className="object-contain blur-[13.5px]" />
          ) : null}
          <Image src={art.icon} alt="" fill sizes="77px" className="object-contain" />
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="font-helvetica text-[18px] leading-[22px] font-bold tracking-[0.2px] text-white sm:text-[22px] sm:leading-[24px]">
            {tier.name}
          </h3>
          <p className="mt-[4px] font-helvetica text-[14px] leading-[18px] tracking-[0.16px] text-brand-placeholder sm:mt-[6px] sm:text-[16px] sm:leading-[20px]">
            A partir de {formatCents(tier.minSpentCents)}
          </p>
        </div>

        {/* Celular: o percentual na própria linha. */}
        <div className="shrink-0 text-right sm:hidden">
          <p className="font-helvetica text-[12px] leading-[14px] font-bold text-white/70">Cashback</p>
          <StatValue className="mt-[2px] text-[20px] leading-[24px]">{cashback}</StatValue>
        </div>
      </div>

      <StatBox
        label="Cashback"
        className="mt-[12px] hidden h-[84px] sm:block"
        contentClassName="px-[22px]"
      >
        {/* 22px aqui, contra 24px no painel-resumo. */}
        <StatValue className="text-[22px] tracking-[0.22px]">{cashback}</StatValue>
      </StatBox>

      {isCurrent ? (
        <p className="mt-[12px] flex h-[34px] items-center justify-center rounded-[12px] border border-brand-orange bg-brand-orange/[0.06] font-helvetica text-[13px] font-bold tracking-[0.14px] text-white sm:mt-[14px] sm:h-[44px] sm:rounded-[15px] sm:text-[14px]">
          Seu nível atual
        </p>
      ) : null}
    </article>
  );
}
