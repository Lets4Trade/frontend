"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reduz a página real para caber na área disponível, MEDINDO em vez de assumir
 * uma escala fixa.
 *
 * Irmão do hook do Builder de Páginas, e pelo mesmo motivo: escala fixa deixava
 * vazio à direita numa tela larga e cortava a página numa estreita.
 *
 * `fixedScale` força um valor (o botão "100%"), sem deixar de medir a ALTURA —
 * que é o que dá à área de rolagem o tamanho certo, já que `transform` não
 * ocupa espaço no fluxo.
 *
 * ⚠️ Mede UMA VEZ na hora e só depois liga o `ResizeObserver` — a callback dele
 * é entregue nos passos de renderização, que o navegador PAUSA em aba de
 * segundo plano (lição de 2026-09-10).
 */
export function useScaledPreview(pageWidth: number, fixedScale?: number) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(fixedScale ?? 0.5);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const measure = () => {
      const available = outer.clientWidth;
      if (available <= 0) return;
      // Teto de 1: reduzir faz sentido, ampliar a página não.
      const next = fixedScale ?? Math.min(1, available / pageWidth);
      setScale(next);
      setHeight(inner.scrollHeight * next);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [pageWidth, fixedScale]);

  return { outerRef, innerRef, scale, height };
}
