"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * A fileira de atalhos da home FIXA no topo do celular, quando a original
 * (`#home-mobile-tabs`) sai da tela — o desenho mobile (Figma 2667:1864) a
 * mostra flutuando sobre o bloco do vídeo.
 *
 * `IntersectionObserver` e não um ouvinte de `scroll`: o navegador avisa só
 * quando a visibilidade muda, sem rodar código a cada pixel rolado.
 */
export function MobileStickyNav({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById("home-mobile-tabs");
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Só aparece depois que a fileira original passou PARA CIMA da tela —
        // antes dela (topo da página) não há o que substituir.
        setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      aria-hidden={!visible}
      // `inert` fora de vista: os links não recebem foco nem clique escondidos.
      inert={!visible}
      className={`fixed inset-x-[25px] top-[12px] z-30 rounded-[26px] border border-white/10 bg-black/70 px-[10px] py-[10px] backdrop-blur-[12px] transition-all duration-200 lg:hidden ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-4 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}
