"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";

/** Tempo de cada banner na tela quando ele passa sozinho. */
export const BANNER_INTERVAL_MS = 6000;

/**
 * O "passa sozinho" dos banners — UM só para a página de jogo e o banner da
 * esquerda da home (2026-11-23, pedido do usuário: "o mesmo timer do banner
 * do jogo"). Antes a home só trocava no clique.
 *
 * Mesmas regras do slider do jogo: 6 s por arte; parado com `paused` (mouse
 * em cima / foco dentro), com a aba em segundo plano e com
 * `prefers-reduced-motion`; trocar à mão reinicia a contagem (`current` nas
 * dependências). Dentro do painel (`/admin`, prévias e editor na página) não
 * anda: lá quem troca é quem edita.
 */
export function useBannerAutoplay({
  count,
  current,
  setActive,
  paused = false,
  enabled = true,
}: {
  count: number;
  current: number;
  setActive: Dispatch<SetStateAction<number>>;
  paused?: boolean;
  enabled?: boolean;
}) {
  useEffect(() => {
    if (!enabled || paused || count < 2) return;
    if (window.location.pathname.startsWith("/admin")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => {
      if (!document.hidden) setActive((value) => (Math.min(value, count - 1) + 1) % count);
    }, BANNER_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, paused, count, current, setActive]);
}
