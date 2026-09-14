import { publicApiGet } from "@/lib/publicApi";
import type { LoyaltyTierRule } from "./data";

/**
 * A tabela de níveis para quem NÃO está logado — a gaveta do carrinho e o
 * checkout de visitante.
 *
 * ── Contrato ───────────────────────────────────────────────────────────────
 *   GET /api/v1/loyalty/tiers → { coinCents, tiers: [...] }
 *
 * Arquivo SEPARADO de `data.ts` pela regra da casa: leitura pública (sem
 * cookie) e leitura autenticada nunca dividem arquivo. `data.ts` importa
 * `serverApi`, que puxa `next/headers` — e um dia em que este módulo caia numa
 * cadeia de client component, o build quebra. Já aconteceu com as abas da
 * vitrine.
 *
 * ── Cache ──────────────────────────────────────────────────────────────────
 * É a única leitura da fidelidade que pode ser cacheada: a resposta é igual
 * para todo visitante e só muda num deploy. Uma hora de `revalidate` mantém o
 * cabeçalho — que renderiza em TODA página — longe do backend, sem deixar uma
 * mudança de regra demorar mais que um turno para aparecer.
 */

const REVALIDATE_SECONDS = 3600;

export type LoyaltyTiers = {
  coinCents: number;
  tiers: LoyaltyTierRule[];
};

/**
 * As faixas do programa, com uma tabela de reserva.
 *
 * A reserva NÃO é uma segunda fonte da verdade: ela existe para o cabeçalho
 * continuar desenhando quando o backend está fora do ar, e mostra os nomes dos
 * níveis — que são de marca e não mudam. Se ela ficar diferente do backend, o
 * pior caso é o carrinho estimar um nível errado num momento em que a loja já
 * está indisponível.
 */
export async function getLoyaltyTiers(): Promise<LoyaltyTiers> {
  const data = await publicApiGet<Partial<LoyaltyTiers>>("/loyalty/tiers", {
    revalidate: REVALIDATE_SECONDS,
  });

  if (!data?.tiers?.length) return FALLBACK;

  return {
    coinCents: data.coinCents || FALLBACK.coinCents,
    tiers: data.tiers.map((tier, index) => ({
      tier: tier.tier ?? FALLBACK.tiers[index]?.tier ?? "BRONZE",
      name: tier.name ?? FALLBACK.tiers[index]?.name ?? "Bronze",
      minSpentCents: Number(tier.minSpentCents) || 0,
      cashbackBps: Number(tier.cashbackBps) || 0,
    })),
  };
}

const FALLBACK: LoyaltyTiers = {
  coinCents: 10,
  tiers: [
    { tier: "BRONZE", name: "Bronze", minSpentCents: 0, cashbackBps: 100 },
    { tier: "PRATA", name: "Prata", minSpentCents: 50_000, cashbackBps: 150 },
    { tier: "OURO", name: "Ouro", minSpentCents: 250_000, cashbackBps: 250 },
    {
      tier: "DIAMANTE",
      name: "Diamante",
      minSpentCents: 1_000_000,
      cashbackBps: 350,
    },
    {
      tier: "ADAMANTIUM",
      name: "Adamantium",
      minSpentCents: 2_000_000,
      cashbackBps: 500,
    },
  ],
};
