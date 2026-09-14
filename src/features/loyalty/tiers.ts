import type { LoyaltySummary, LoyaltyTierKey } from "./data";

/**
 * A ARTE dos níveis do programa de fidelidade (Figma 2176:2241).
 *
 * ── O que está aqui e o que NÃO está ───────────────────────────────────────
 * Aqui: emblema, tamanho, posição e brilho — decisões de layout, que só existem
 * no arquivo do Figma e não têm por que viajar pela rede.
 *
 * NÃO está aqui: a faixa de cada nível e o percentual de cashback. Esses são
 * REGRA DE NEGÓCIO e vêm do backend (`GET /api/v1/me/loyalty`), de
 * `backend/src/app/loyalty/loyalty.rules.ts`.
 *
 * Até 2026-09-10 os números moravam neste arquivo e o backend não os conhecia —
 * o programa inteiro existia só na tela. É a mesma classe de erro do preço que
 * o cliente mandava junto do pedido: quem decide quanto vale um benefício não
 * pode ser o navegador de quem recebe o benefício.
 *
 * `iconSize/iconLeft/iconTop` guardam a geometria de cada emblema porque o
 * design NÃO os padroniza: variam de 62 a 77px e cada um tem sua própria
 * posição. Igualar tudo achataria a diferença de peso visual entre os níveis.
 *
 * `glow`: Ouro, Diamante e Adamantium têm uma cópia borrada atrás do emblema
 * (blur 13.5px) que os níveis de baixo não têm.
 */
export const TIER_ART: Record<
  LoyaltyTierKey,
  { icon: string; iconSize: number; iconLeft: number; iconTop: number; glow: boolean }
> = {
  BRONZE: {
    icon: "/images/tiers/bronze.png",
    iconSize: 62,
    iconLeft: 215,
    iconTop: 41,
    glow: false,
  },
  PRATA: {
    icon: "/images/tiers/prata.png",
    iconSize: 75,
    iconLeft: 203,
    iconTop: 38,
    glow: false,
  },
  OURO: {
    icon: "/images/tiers/ouro.png",
    iconSize: 70,
    iconLeft: 207,
    iconTop: 40,
    glow: true,
  },
  DIAMANTE: {
    icon: "/images/tiers/diamante.png",
    iconSize: 68,
    iconLeft: 214,
    iconTop: 35,
    glow: true,
  },
  ADAMANTIUM: {
    icon: "/images/tiers/adamantium.png",
    iconSize: 77,
    iconLeft: 207,
    iconTop: 33.5,
    glow: true,
  },
};

/** A arte de um nível, com o Bronze como rede de segurança. */
export function tierArt(tier: string) {
  return TIER_ART[tier as LoyaltyTierKey] ?? TIER_ART.BRONZE;
}

/**
 * Barra de destaque no topo dos cards. No arquivo do Figma os CINCO cards usam
 * o mesmo degradê bronze — inclusive Ouro, Diamante e Adamantium. Mantido igual
 * ao design de propósito; inventar uma cor por nível seria adivinhar.
 * Ver .claude/context/open-questions.md.
 */
export const TIER_ACCENT_GRADIENT =
  "linear-gradient(to right, #562b0d 0%, #c77b24 50.962%, #5c370e 100%)";

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

/** O mesmo, a partir de centavos — que é como o backend fala de dinheiro. */
export function formatCents(cents: number) {
  return formatBRL(cents / 100);
}

/**
 * "1%", "2,5%" — o percentual a partir dos pontos-base do backend.
 *
 * Pontos-base e não número quebrado pelo mesmo motivo dos centavos: 2,5% em
 * float é 0.025000000000000001, e o valor viaja em JSON.
 */
export function formatBps(bps: number) {
  return `${(bps / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

/** O nível vigente dentro da tabela que o backend mandou. */
export function currentTierOf(summary: LoyaltySummary) {
  return (
    summary.tiers.find((tier) => tier.tier === summary.tier) ?? summary.tiers[0]
  );
}
