"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * A fileira de abas do jogo. No celular ela ROLA de lado (2026-10-09), e a aba
 * ativa podia nascer fora da tela — Carry, Gold e as do fim da lista apareciam
 * só como uma pontinha laranja na borda. Ao montar, a fileira rola até deixar
 * a ativa no meio.
 *
 * Mexe só no `scrollLeft` da própria fileira: `scrollIntoView` rolaria a
 * PÁGINA também. No desktop as abas embrulham e não há rolagem — nada acontece.
 */
export function TabsRow({ className, children }: { className: string; children: ReactNode }) {
  const row = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const nav = row.current;
    if (!nav || nav.scrollWidth <= nav.clientWidth) return;
    const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
    if (!active) return;
    nav.scrollLeft = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
  }, []);

  return (
    // `relative`: o `offsetLeft` da aba passa a ser medido a partir da fileira.
    <nav ref={row} className={`relative ${className}`}>
      {children}
    </nav>
  );
}
