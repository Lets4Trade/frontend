import { apiGet } from "@/lib/serverApi";

/**
 * Leitura do programa de fidelidade — o que a tela `/fidelidade` desenha.
 *
 * ── Contrato (../backend/src/app/loyalty) ──────────────────────────────────
 *   GET /me/loyalty         → resumo + a TABELA DE NÍVEIS
 *   GET /me/loyalty/extrato → movimentos paginados
 *   401                     → sem sessão
 *
 * A tabela de níveis vem junto do resumo de propósito: faixa e cashback são
 * regra de negócio, e a tela que os desenha não pode ter a própria cópia — foi
 * exatamente assim que o programa passou meses existindo só no frontend.
 *
 * ⚠️ O backend apaga campos vazios da resposta (`ResponseCompressionInterceptor`
 * remove `null`, `undefined` e `""`), então tudo aqui tem valor padrão e nada é
 * testado por `=== null`. Um Adamantium não tem `nextTier` e a tela não pode
 * cair por isso.
 */

export type LoyaltyTierKey =
  | "BRONZE"
  | "PRATA"
  | "OURO"
  | "DIAMANTE"
  | "ADAMANTIUM";

export type LoyaltyTierRule = {
  tier: LoyaltyTierKey;
  name: string;
  minSpentCents: number;
  cashbackBps: number;
};

export type LoyaltySummary = {
  tier: LoyaltyTierKey;
  tierName: string;
  cashbackBps: number;
  coins: number;
  coinsCents: number;
  points: number;
  rank: number;
  totalSpentCents: number;
  totalSavedCents: number;
  /** 0–100. No topo é sempre 100. */
  progress: number;
  nextTierName: string | null;
  missingToNextCents: number;
  /** Quanto vale uma coin, em centavos. A tela não fixa a cotação. */
  coinCents: number;
  tiers: LoyaltyTierRule[];
};

export type LoyaltyEntry = {
  id: string;
  kind: "RESGATE" | "ESTORNO" | "CASHBACK" | "CASHBACK_ESTORNADO" | "AJUSTE";
  coins: number;
  amountCents: number;
  description: string;
  reference: string | null;
  createdAt: string;
};

export type LoyaltyResult =
  | { ok: true; summary: LoyaltySummary; entries: LoyaltyEntry[] }
  | { ok: false; reason: "unauthenticated" | "error" };

type ApiSummary = Partial<Omit<LoyaltySummary, "tiers">> & {
  tiers?: Partial<LoyaltyTierRule>[];
};

/**
 * Resumo e primeira página do extrato, em PARALELO.
 *
 * Duas chamadas e não uma: o resumo é o que a tela precisa para desenhar, e o
 * extrato é uma lista paginada que vai ganhar navegação própria. Juntá-los faria
 * a segunda página do extrato rebuscar o resumo inteiro.
 *
 * Em paralelo porque uma não depende da outra — em série, a tela esperaria a
 * soma das duas latências para mostrar a primeira linha.
 */
export async function getLoyalty(): Promise<LoyaltyResult> {
  const [summaryResult, statementResult] = await Promise.all([
    apiGet<ApiSummary>("/me/loyalty"),
    apiGet<{ items?: LoyaltyEntry[] }>("/me/loyalty/extrato?limit=10"),
  ]);

  if (!summaryResult.ok) {
    return { ok: false, reason: summaryResult.reason };
  }

  return {
    ok: true,
    summary: normalize(summaryResult.data),
    // O extrato falhar não pode derrubar a tela: o resumo é o conteúdo
    // principal, e uma lista vazia diz a mesma coisa que "ainda sem
    // movimentos" — que é o estado de toda conta nova.
    entries: statementResult.ok ? (statementResult.data.items ?? []) : [],
  };
}

/** Os cinco níveis, caso a resposta chegue sem eles. Só a ordem e os nomes. */
const FALLBACK_TIERS: LoyaltyTierRule[] = [
  { tier: "BRONZE", name: "Bronze", minSpentCents: 0, cashbackBps: 100 },
  { tier: "PRATA", name: "Prata", minSpentCents: 50_000, cashbackBps: 150 },
  { tier: "OURO", name: "Ouro", minSpentCents: 250_000, cashbackBps: 250 },
  { tier: "DIAMANTE", name: "Diamante", minSpentCents: 1_000_000, cashbackBps: 350 },
  {
    tier: "ADAMANTIUM",
    name: "Adamantium",
    minSpentCents: 2_000_000,
    cashbackBps: 500,
  },
];

function normalize(api: ApiSummary): LoyaltySummary {
  const tiers =
    api.tiers && api.tiers.length > 0
      ? api.tiers.map((tier, index) => ({
          tier: tier.tier ?? FALLBACK_TIERS[index]?.tier ?? "BRONZE",
          name: tier.name ?? FALLBACK_TIERS[index]?.name ?? "Bronze",
          minSpentCents: num(tier.minSpentCents),
          cashbackBps: num(tier.cashbackBps),
        }))
      : FALLBACK_TIERS;

  return {
    tier: api.tier ?? "BRONZE",
    tierName: api.tierName ?? "Bronze",
    cashbackBps: num(api.cashbackBps, 100),
    coins: num(api.coins),
    coinsCents: num(api.coinsCents),
    points: num(api.points),
    rank: num(api.rank, 1),
    totalSpentCents: num(api.totalSpentCents),
    totalSavedCents: num(api.totalSavedCents),
    progress: Math.max(0, Math.min(100, num(api.progress))),
    // Ausente = já está no topo. Ver a nota sobre campos vazios acima.
    nextTierName: api.nextTierName || null,
    missingToNextCents: num(api.missingToNextCents),
    coinCents: num(api.coinCents, 10),
    tiers,
  };
}

function num(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
