"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Desenho de LARGURA FIXA (as seções de desktop da home, 1820px) dentro de uma
 * coluna fluida, reduzido por inteiro para caber: o que cabe numa tela de 1920
 * cabe igual, só que menor, numa de 1366, sem barra de rolagem horizontal.
 *
 * `zoom` e não `transform: scale`: o zoom muda o LAYOUT (a altura acompanha
 * sozinha, sem medir) e não vira bloco de contenção de `position: fixed` (o
 * modal do vídeo abre em portal de qualquer jeito). Nunca aumenta: numa coluna
 * maior que o desenho ele fica no tamanho original, centralizado.
 *
 * Antes da hidratação o zoom não existe e o excesso fica cortado
 * (`overflow-hidden`), em vez de criar rolagem horizontal por um instante.
 */
export function FitWidth({ width, children }: { width: number; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    const measure = () => setZoom(Math.min(1, element.clientWidth / width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div ref={box} className="w-full overflow-hidden">
      <div className="mx-auto" style={{ width, zoom }}>
        {children}
      </div>
    </div>
  );
}
