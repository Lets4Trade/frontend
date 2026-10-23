import { publicApiGet } from "@/lib/publicApi";
import { LAYOUT_TAG } from "@/features/site/layoutContent";

/**
 * Aviso de CUPOM para quem vai sair do site sem conta (2026-10-23, pedido do
 * usuário). Configurado em Configurações da loja → Cupom de saída (sessão
 * `layout:cupom-saida`).
 *
 * O cupom em si vem do BACKEND (`GET /coupons/exit-offer`), que lê a
 * configuração e só devolve o cupom se ele valer AGORA — nunca um cupom morto.
 * Leitura cacheada com a etiqueta do layout: salvar a configuração derruba na
 * hora; mudança só no cupom (desativar, esgotar) pega em até 5 min.
 */

export type ExitOffer = {
  code: string;
  /** "10% OFF" / "R$ 15,00 OFF". */
  discount: string;
  /** Condições em uma linha ("Em compras a partir de R$ 50,00 · válido até 31/10"). */
  conditions: string;
};

export type ExitOfferConfig = {
  title: string;
  text: string;
  imageUrl?: string;
  button: string;
  /** Dias até mostrar de novo para a mesma pessoa (0 = toda visita). */
  days: number;
};

type RawOffer = {
  code?: unknown;
  kind?: unknown;
  value?: unknown;
  maxDiscountCents?: unknown;
  minSubtotalCents?: unknown;
  endsAt?: unknown;
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });

/** Resposta da API → o que o aviso mostra. Formato inesperado = sem aviso. */
export function toExitOffer(raw: unknown): ExitOffer | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as RawOffer;
  if (typeof data.code !== "string" || !/^[A-Z0-9_-]{3,40}$/.test(data.code)) return null;
  if (typeof data.value !== "number" || data.value <= 0) return null;

  // PERCENT em pontos-base (1000 = 10%), como o cupom grava; FIXED em centavos.
  let discount: string;
  if (data.kind === "PERCENT") {
    discount = `${(data.value / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% OFF`;
  } else if (data.kind === "FIXED") {
    discount = `${money.format(data.value / 100)} OFF`;
  } else {
    return null;
  }

  const conditions: string[] = [];
  if (typeof data.minSubtotalCents === "number" && data.minSubtotalCents > 0) {
    conditions.push(`Em compras a partir de ${money.format(data.minSubtotalCents / 100)}`);
  }
  if (data.kind === "PERCENT" && typeof data.maxDiscountCents === "number" && data.maxDiscountCents > 0) {
    conditions.push(`até ${money.format(data.maxDiscountCents / 100)} de desconto`);
  }
  if (typeof data.endsAt === "string") {
    const end = new Date(data.endsAt);
    if (!Number.isNaN(end.getTime())) conditions.push(`válido até ${date.format(end)}`);
  }
  return { code: data.code, discount, conditions: conditions.join(" · ") };
}

export async function getExitOffer(): Promise<ExitOffer | null> {
  const data = await publicApiGet<unknown>("/coupons/exit-offer", { revalidate: 300, tags: [LAYOUT_TAG] });
  return toExitOffer(data);
}

/** Configuração da sessão (textos e extras). `null` = aviso desligado. */
export function exitOfferConfig(section: {
  title: string;
  subtitle: string;
  imageUrl?: string;
  extra: (name: string, fallback: string) => string;
}): ExitOfferConfig | null {
  if (section.extra("ativo", "desligado") !== "ligado") return null;
  const days = Number.parseInt(section.extra("dias", "7"), 10);
  return {
    title: section.title || "Espera! Tem um presente pra você",
    text: section.subtitle || "Crie sua conta e use este cupom na sua primeira compra.",
    imageUrl: section.imageUrl || undefined,
    button: section.extra("botao", "CRIAR CONTA E USAR") || "CRIAR CONTA E USAR",
    days: Number.isFinite(days) && days >= 0 ? Math.min(days, 365) : 7,
  };
}
