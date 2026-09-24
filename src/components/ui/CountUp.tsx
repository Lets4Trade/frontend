"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Número que sobe de 1 até o valor quando entra na tela (2026-09-24) — os
 * contadores da home ("+4000 CLIENTES ATENDIDOS", "+5 ANOS…") e o selo
 * "+1000 REFERÊNCIAS" do cabeçalho.
 *
 * O valor é TEXTO editável no painel, então prefixo e sufixo são preservados:
 * "+4000" anima "+1 … +4000", "4.000+" mantém o ponto de milhar. Texto sem
 * número aparece como está.
 *
 * ── Decisões ──────────────────────────────────────────────────────────────
 * - O servidor renderiza o valor FINAL: sem JavaScript, e para buscadores, o
 *   número certo está lá. A animação é só por cima.
 * - A contagem escreve direto no nó de texto (`nodeValue`), num quadro por vez,
 *   sem estado do React: nada re-renderiza 60 vezes por segundo, e o nó
 *   continua sendo o MESMO que o React criou — se o valor mudar, ele atualiza
 *   normalmente.
 * - Dentro de `/admin` não anima: o editor de páginas edita esse texto no
 *   próprio DOM, e um número mudando sob o cursor quebraria a edição.
 * - `prefers-reduced-motion` mostra o valor final direto.
 */

const DURATION_MS = 1800;

type Parsed = { prefix: string; target: number; suffix: string; grouped: boolean };

export function parseCount(value: string): Parsed | null {
  const match = value.match(/^(\D*?)(\d[\d.]*)([\s\S]*)$/);
  if (!match) return null;
  const target = Number(match[2].replace(/\./g, ""));
  if (!Number.isFinite(target) || target <= 1) return null;
  return { prefix: match[1], target, suffix: match[3], grouped: match[2].includes(".") };
}

export function formatCount(parsed: Parsed, n: number) {
  const digits = parsed.grouped ? n.toLocaleString("pt-BR") : String(n);
  return `${parsed.prefix}${digits}${parsed.suffix}`;
}

export function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const parsed = parseCount(value);
    const node = ref.current?.firstChild;
    if (!parsed || !(node instanceof Text)) return;
    if (pathname?.startsWith("/admin")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Parte do 1 já na montagem: sem isto o número final apareceria e depois
    // "voltaria" para 1 quando o bloco entrasse na tela.
    node.nodeValue = formatCount(parsed, 1);

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();

        // O relógio começa no PRIMEIRO quadro desenhado, não na interseção:
        // em aba de fundo o navegador pausa os quadros, e a contagem tem que
        // acontecer quando a pessoa olha — não terminar escondida.
        let start = 0;
        const tick = (now: number) => {
          start ||= now;
          const t = Math.min(1, (now - start) / DURATION_MS);
          // Desacelera no fim (ease-out cúbico): os últimos números são lidos.
          const eased = 1 - (1 - t) ** 3;
          node.nodeValue = formatCount(parsed, Math.max(1, Math.round(1 + (parsed.target - 1) * eased)));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    observer.observe(ref.current!);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      // Desmontou no meio: o nó volta ao valor real.
      node.nodeValue = value;
    };
  }, [value, pathname]);

  // No editor, o texto puro de sempre: é ele que o `contentEditable` substitui.
  if (pathname?.startsWith("/admin")) return <>{value}</>;

  // `tabular-nums`: todos os dígitos com a mesma largura, então o número não
  // "treme" enquanto conta.
  return (
    <span ref={ref} className="tabular-nums">
      {value}
    </span>
  );
}
