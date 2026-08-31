import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MOCK_PROFILE } from "@/features/account/profile";
import { LoyaltySummary } from "@/features/loyalty/LoyaltySummary";
import { TierCard } from "@/features/loyalty/TierCard";
import { MOCK_LOYALTY, TIERS } from "@/features/loyalty/tiers";

export const metadata: Metadata = {
  title: "Fidelidade | Lets4Trade",
  description:
    "Acompanhe seu nível, cashback e saldo de Lets Coins no programa de fidelidade.",
  robots: { index: false, follow: false },
};

/**
 * Tela de Fidelidade — Figma nó 2176:2241.
 *
 * Diferente das outras do painel: NÃO tem o card de perfil na lateral. É um
 * layout de largura cheia — painel-resumo de 1612×549 no topo, o título "Todos
 * os Níveis" e a faixa com os cinco cards de 302×450 (vão de 25px).
 *
 * Vãos verticais do design: resumo termina em 700, título em 750 (50), cards
 * em 801 (25 após o título).
 *
 * ⚠️ Dados MOCK e rota sem guarda. Ver .claude/context/open-questions.md.
 */
export default function FidelidadePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-brand-bg">
      <SiteHeader
        user={{ name: MOCK_PROFILE.name, avatar: MOCK_PROFILE.avatar, online: true }}
      />

      <main className="flex-1 overflow-x-auto">
        <div className="mx-auto w-max px-[154px] pt-[68px] pb-[100px]">
          <LoyaltySummary data={MOCK_LOYALTY} />

          <h2 className="mt-[50px] font-helvetica text-[25px] leading-[26px] font-bold tracking-[0.25px] text-white">
            Todos os Níveis
          </h2>

          <div className="mt-[25px] flex gap-[25px]">
            {TIERS.map((tier) => (
              <TierCard
                key={tier.key}
                tier={tier}
                isCurrent={tier.key === MOCK_LOYALTY.tier}
              />
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

