import type { LegacyNodes } from "@/features/pages/compose";
import type { SectionView } from "@/features/site/content";
import type { LoyaltyEntry, LoyaltySummary as LoyaltySummaryData } from "./data";
import { LoyaltyStatement } from "./LoyaltyStatement";
import { LoyaltySummary } from "./LoyaltySummary";
import { TierCard } from "./TierCard";

/**
 * As três SEÇÕES DO DESENHO da Fidelidade (resumo, níveis, extrato) como peças
 * separadas (2026-09-25): o construtor de páginas pode reordená-las, escondê-las
 * e pôr blocos novos entre elas. Sem página publicada, `app/fidelidade` as
 * desenha nesta mesma ordem.
 *
 * Os dados são DA CONTA de quem vê — na prévia do editor, a do admin.
 */
export function loyaltyNodes(
  summary: LoyaltySummaryData,
  entries: LoyaltyEntry[],
  section: (key: string) => SectionView,
): LegacyNodes {
  return {
    resumo: {
      gap: 0,
      node: <LoyaltySummary data={summary} caption={section("resumo").title || undefined} />,
    },
    niveis: {
      gap: 50,
      node: (
        <section>
          <h2 className="font-helvetica text-[25px] leading-[26px] font-bold tracking-[0.25px] text-white">
            {section("niveis").title || "Todos os Níveis"}
          </h2>
          {/* Grade que ENCOLHE antes de quebrar: em 1920 são cinco colunas de
              302px (as do arquivo); abaixo de ~250px por card ela passa para
              quatro, três… — nunca um card sozinho sobrando numa linha. */}
          <div className="mt-[25px] grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-[25px]">
            {summary.tiers.map((tier) => (
              <TierCard key={tier.tier} tier={tier} isCurrent={tier.tier === summary.tier} />
            ))}
          </div>
        </section>
      ),
    },
    extrato: {
      gap: 50,
      node: <LoyaltyStatement entries={entries} coinCents={summary.coinCents} />,
    },
  };
}

export const LOYALTY_ORDER = ["resumo", "niveis", "extrato"] as const;
