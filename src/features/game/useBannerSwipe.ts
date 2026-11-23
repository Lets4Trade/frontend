"use client";

import { useRef, type MouseEvent, type PointerEvent } from "react";

/** Arrasto mínimo (px) para o toque contar como "trocar de banner". */
export const SWIPE_PX = 50;

/** Janela em que o clique logo após um arrasto é anulado. */
const CLICK_GUARD_MS = 400;

/**
 * Arrastar com o dedo troca de banner — UM só para o banner do jogo e os da
 * home, computador e celular (2026-11-23, pedido do usuário: "passar os
 * banners com o dedo arrastado" na home do celular; o do jogo já tinha).
 *
 * Só toque/caneta: com mouse, arrastar seleciona/arrasta a imagem, e as setas e
 * barrinhas já resolvem. Conta ao SOLTAR, se o dedo andou ≥ 50px mais na
 * horizontal que na vertical. Quem usa põe `touch-pan-y` na caixa: o
 * navegador continua rolando a página na vertical e deixa o horizontal para nós.
 *
 * O clique que o navegador dispara logo depois do arrasto é anulado (senão
 * abriria o link do slide) — só nessa janela curta, para não engolir um clique
 * de teclado mais tarde.
 */
export function useBannerSwipe({
  enabled,
  onSwipe,
}: {
  enabled: boolean;
  /** +1 = próximo (dedo para a esquerda), -1 = anterior. */
  onSwipe: (step: 1 | -1) => void;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const swipedAt = useRef(0);

  return {
    onPointerDown(event: PointerEvent) {
      if (event.pointerType === "mouse") return;
      start.current = { x: event.clientX, y: event.clientY };
    },
    onPointerUp(event: PointerEvent) {
      const from = start.current;
      start.current = null;
      if (!from || !enabled) return;
      const dx = event.clientX - from.x;
      const dy = event.clientY - from.y;
      if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) <= Math.abs(dy)) return;
      swipedAt.current = Date.now();
      onSwipe(dx < 0 ? 1 : -1);
    },
    // Rolou a página na vertical: o navegador assumiu o gesto.
    onPointerCancel() {
      start.current = null;
    },
    onClickCapture(event: MouseEvent) {
      if (Date.now() - swipedAt.current < CLICK_GUARD_MS) event.preventDefault();
    },
  };
}
