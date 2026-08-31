/**
 * Níveis do programa de fidelidade (Figma 2176:2241).
 *
 * `icon*` guarda a geometria de cada emblema porque o design NÃO os padroniza:
 * variam de 62 a 77px e cada um tem sua própria posição. Igualar tudo achataria
 * a diferença de peso visual entre os níveis.
 *
 * `glow`: Ouro, Diamante e Adamantium têm uma cópia borrada atrás do emblema
 * (blur 13.5px) que os níveis de baixo não têm.
 */
export const TIERS = [
  {
    key: "bronze",
    name: "Bronze",
    minSpend: 0,
    cashback: "1%",
    icon: "/images/tiers/bronze.png",
    iconSize: 62,
    iconLeft: 215,
    iconTop: 41,
    glow: false,
  },
  {
    key: "prata",
    name: "Prata",
    minSpend: 500,
    cashback: "1.5%",
    icon: "/images/tiers/prata.png",
    iconSize: 75,
    iconLeft: 203,
    iconTop: 38,
    glow: false,
  },
  {
    key: "ouro",
    name: "Ouro",
    minSpend: 2500,
    cashback: "2.5%",
    icon: "/images/tiers/ouro.png",
    iconSize: 70,
    iconLeft: 207,
    iconTop: 40,
    glow: true,
  },
  {
    key: "diamante",
    name: "Diamante",
    minSpend: 10000,
    cashback: "3.5%",
    icon: "/images/tiers/diamante.png",
    iconSize: 68,
    iconLeft: 214,
    iconTop: 35,
    glow: true,
  },
  {
    key: "adamantium",
    name: "Adamantium",
    minSpend: 20000,
    cashback: "5.0%",
    icon: "/images/tiers/adamantium.png",
    iconSize: 77,
    iconLeft: 207,
    iconTop: 33.5,
    glow: true,
  },
] as const;

export type Tier = (typeof TIERS)[number];
export type TierKey = Tier["key"];

/**
 * Barra de destaque no topo dos cards. No arquivo do Figma os CINCO cards usam
 * o mesmo degradê bronze — inclusive Ouro, Diamante e Adamantium. Mantido igual
 * ao design de propósito; inventar uma cor por nível seria adivinhar.
 * Ver .claude/context/open-questions.md.
 */
export const TIER_ACCENT_GRADIENT =
  "linear-gradient(to right, #562b0d 0%, #c77b24 50.962%, #5c370e 100%)";

export type LoyaltySummaryData = {
  tier: TierKey;
  /** Saldo de Lets Coins. */
  coins: number;
  cashback: string;
  totalSaved: number;
  /** Percentual de progresso até o próximo nível (0–100). */
  progress: number;
  missingToNext: number;
  nextTierName: string;
};

/**
 * Formatação em pt-BR. O design escreve "R$ 2500.00" e "R$ 950.00" — ponto como
 * separador decimal e sem separador de milhar, que não é a convenção
 * brasileira. Usamos a correta ("R$ 2.500,00"): é texto que o usuário lê, e o
 * formato do arquivo passaria por bug. Ver open-questions.
 */
export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/** Dados MOCK do resumo — os do design. Somem quando existir `GET /loyalty`. */
export const MOCK_LOYALTY: LoyaltySummaryData = {
  tier: "bronze",
  coins: 1750,
  cashback: "1%",
  totalSaved: 850,
  progress: 88,
  missingToNext: 950,
  nextTierName: "Prata",
};
