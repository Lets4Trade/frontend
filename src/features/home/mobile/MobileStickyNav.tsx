"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * A fileira de atalhos da home como RODAPÉ FLUTUANTE no celular, quando a
 * original (`#home-mobile-tabs`) sai da tela.
 *
 * Ficava presa no TOPO (2026-09-18); em 2026-09-24 o usuário pediu embaixo — o
 * topo agora é do cabeçalho, que ficou fixo, e dois blocos fixos empilhados em
 * cima comeriam um terço da tela. Embaixo é também onde o polegar alcança.
 *
 * Enquanto ela está visível, o `<html>` ganha `data-bottom-nav`: é o que faz a
 * bolinha do atendimento (fixa no mesmo canto) subir para cima dela em vez de
 * ficar por baixo (`globals.css`, `.contact-float`).
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

  useEffect(() => {
    const root = document.documentElement;
    if (visible) root.dataset.bottomNav = "";
    else delete root.dataset.bottomNav;
    return () => {
      delete root.dataset.bottomNav;
    };
  }, [visible]);

  return (
    <div
      aria-hidden={!visible}
      // `inert` fora de vista: os links não recebem foco nem clique escondidos.
      inert={!visible}
      className={`fixed inset-x-[16px] bottom-[max(12px,env(safe-area-inset-bottom))] z-30 rounded-[26px] border border-white/10 bg-black/70 px-[10px] py-[10px] shadow-[0_16px_40px_rgba(0,0,0,.5)] backdrop-blur-[12px] transition-all duration-200 lg:hidden ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}
