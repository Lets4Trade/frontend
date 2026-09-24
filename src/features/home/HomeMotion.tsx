"use client";

import { useEffect } from "react";

/**
 * Motor das ENTRADAS da home (2026-09-24): quem tem `data-reveal` ganha
 * `data-revealed` na primeira vez que aparece na tela, e o CSS
 * (`globals.css`, bloco "ENTRADAS") toca o gesto daquele elemento.
 *
 * ── Por que um componente para a página inteira ───────────────────────────
 * UM `IntersectionObserver` para todos os elementos, e nenhum componente de
 * seção vira client por causa disso: as seções continuam no servidor e só
 * carregam atributos. O gesto em si é `@keyframes`, no compositor.
 *
 * ── Sem JavaScript, nada some ─────────────────────────────────────────────
 * O CSS só esconde o que ainda não entrou quando o `<html>` tem a classe
 * `motion-ready`, que ESTE componente põe. Sem JS, com JS quebrado, no editor
 * do `/admin` (que desenha os mesmos blocos mas não monta isto) e para quem
 * pediu menos movimento, a página aparece inteira e parada.
 *
 * ── O que já está na tela ao carregar não anima ───────────────────────────
 * Entraria piscando: o servidor já pintou, e esconder para mostrar de novo é
 * um flash. Esses são marcados como revelados na hora, sem gesto.
 */
export function HomeMotion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = document.documentElement;
    const pending: HTMLElement[] = [];
    const viewport = window.innerHeight;

    for (const element of document.querySelectorAll<HTMLElement>("[data-reveal]")) {
      const rect = element.getBoundingClientRect();
      // Tamanho zero = versão escondida pelo CSS (o desenho mobile no desktop,
      // e vice-versa). Fica pendente: se a tela mudar, ela anima ao aparecer.
      const visibleNow = rect.height > 0 && rect.top < viewport && rect.bottom > 0;
      if (visibleNow) {
        element.dataset.revealed = "";
        element.dataset.revealInstant = "";
      } else {
        pending.push(element);
      }
    }

    root.classList.add("motion-ready");

    const waiting = new Set(pending);
    const show = (element: HTMLElement) => {
      element.dataset.revealed = "";
      waiting.delete(element);
      observer.unobserve(element);
      if (waiting.size === 0) window.removeEventListener("scroll", onScroll);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) show(entry.target as HTMLElement);
        }
      },
      // Dispara um pouco ANTES da borda de baixo: o gesto começa enquanto a
      // pessoa ainda está chegando, não depois que ela já parou para ler.
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    pending.forEach((element) => observer.observe(element));

    /**
     * Rede de segurança para rolagem RÁPIDA (End, link âncora, rolagem forte).
     *
     * O observador só avisa quando o estado muda entre dois quadros desenhados.
     * Um elemento pequeno pode ir de "abaixo da tela" direto para "acima da
     * tela" sem nunca ser visto cruzando — e ficaria invisível para sempre,
     * inclusive quando a pessoa voltasse. Achado no teste: o subtítulo das
     * reviews ficava preso assim. Aqui, uma checagem por quadro revela todo
     * pendente cujo topo já passou do ponto de disparo. Some quando não há
     * mais pendentes.
     */
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const trigger = window.innerHeight * 0.9;
        for (const element of waiting) {
          const rect = element.getBoundingClientRect();
          if (rect.height > 0 && rect.top < trigger) show(element);
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      observer.disconnect();
      // Saindo da home (navegação no cliente), a classe não pode seguir para
      // outras páginas — o editor, por exemplo, usa os mesmos atributos.
      root.classList.remove("motion-ready");
    };
  }, []);

  return null;
}

