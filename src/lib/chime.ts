"use client";

import { useEffect, useRef } from "react";

/**
 * Som curto de aviso, gerado no navegador (Web Audio, sem arquivo). Usado no
 * aviso de VENDA do painel (2026-10-16) e no aviso de RESPOSTA do chat da loja
 * (2026-10-23).
 *
 * O navegador só deixa tocar som depois de um gesto na página: o contexto de
 * áudio nasce no primeiro clique/tecla e fica pronto para os próximos avisos.
 * Sem gesto ainda, o aviso fica mudo (o card continua).
 */
export function useAudioUnlock() {
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => {
    const unlock = () => {
      if (audio.current) return;
      const Ctx =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) audio.current = new Ctx();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);
  return audio;
}

/** Duas notas curtas (sol → dó), volume baixo. Sem contexto liberado, fica mudo. */
export function playChime(ctx: AudioContext | null) {
  if (!ctx) return;
  try {
    void ctx.resume();
    const now = ctx.currentTime;
    [784, 1047].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + index * 0.16;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch {
    // Áudio indisponível: o card e o contador continuam.
  }
}
