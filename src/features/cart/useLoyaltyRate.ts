"use client";

import { useEffect, useState } from "react";
import { fetchWithSession } from "@/lib/browserSession";

/**
 * O nível de fidelidade da CONTA, para o cashback do carrinho.
 *
 * Lido do navegador (`GET /me/loyalty`, a mesma rota do checkout) e SÓ quando
 * a gaveta abre com alguém logado: o cabeçalho de toda página não paga essa
 * chamada, e visitante nunca a faz. Uma leitura por carregamento de página —
 * o nível não muda enquanto a pessoa escolhe produtos.
 *
 * Falhou ou está deslogado: `null`, e o carrinho usa o nível inicial com o
 * convite para entrar.
 */
export type LoyaltyRate = {
  /** Chave do nível (`BRONZE`…), para o ícone. */
  tier: string;
  tierName: string;
  cashbackBps: number;
  coinCents: number;
  nextTierName: string | null;
  missingToNextCents: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

let cached: Promise<LoyaltyRate | null> | null = null;

function int(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : fallback;
}

async function load(): Promise<LoyaltyRate | null> {
  if (API_URL === "") return null;
  try {
    const response = await fetchWithSession(`${API_URL}/me/loyalty`, {
      headers: { accept: "application/json", "x-pt-surface": "client" },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { data?: Record<string, unknown> };
    const data = body?.data;
    if (!data || typeof data !== "object") return null;
    return {
      tier: typeof data.tier === "string" ? data.tier : "BRONZE",
      tierName: typeof data.tierName === "string" ? data.tierName : "Bronze",
      cashbackBps: int(data.cashbackBps),
      coinCents: int(data.coinCents, 1) || 1,
      nextTierName: typeof data.nextTierName === "string" ? data.nextTierName : null,
      missingToNextCents: int(data.missingToNextCents),
    };
  } catch {
    return null;
  }
}

export function useLoyaltyRate(enabled: boolean): LoyaltyRate | null {
  const [rate, setRate] = useState<LoyaltyRate | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    cached ??= load();
    cached.then((value) => {
      if (!value) cached = null; // falha não fica guardada: tenta de novo na próxima abertura
      if (alive) setRate(value);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);

  return enabled ? rate : null;
}
