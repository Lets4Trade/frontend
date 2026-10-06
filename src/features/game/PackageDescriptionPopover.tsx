"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import type { ServiceContent } from "./types";

const WIDTH = 440;
/** Distância entre o cursor e o canto do painel. */
const OFFSET = 22;
const MARGIN = 16;
/** Fração do caminho até o cursor andada a cada quadro: < 1 dá o "arrasto" suave. */
const FOLLOW = 0.2;
/** Duração da animação de saída (`package-popover-out` em globals.css). */
const EXIT_MS = 160;

type Phase = "closed" | "open" | "closing";
type Point = { x: number; y: number };

/**
 * Painel com a descrição do serviço ao passar o mouse na ARTE do card de
 * pacote (pedido do usuário, 2026-10-06): os mesmos textos da página do pacote,
 * num painel grande que SEGUE o cursor enquanto ele está sobre a arte.
 *
 * ── Desempenho ─────────────────────────────────────────────────────────────
 * Seguir o mouse NÃO passa pelo React: o `mousemove` só grava o alvo, e um
 * laço de `requestAnimationFrame` aproxima a posição dele (lerp) escrevendo
 * `transform` direto no elemento — sem re-render por movimento, só composição
 * na GPU. O laço só roda com o painel aberto.
 *
 * ── Portal + `position: fixed` ─────────────────────────────────────────────
 * O card corta o que vaza (`overflow-hidden`) e a grade não tem espaço lateral
 * garantido. No `body`, nada corta nem empilha por cima.
 *
 * ── Lado ───────────────────────────────────────────────────────────────────
 * Abaixo e à direita do cursor; sem espaço à direita, vira para a esquerda; na
 * vertical, sobe o necessário para caber. Como o painel segue o mouse, ele não
 * recebe o ponteiro (`pointer-events: none`) e não rola: texto maior que a
 * janela é cortado com um degradê — o texto inteiro está na página do pacote.
 *
 * ── Animação ───────────────────────────────────────────────────────────────
 * Entrada e saída em CSS (`.package-popover` em globals.css), no elemento de
 * DENTRO; a posição é do de fora. `prefers-reduced-motion`: sem animação e sem
 * arrasto (o painel cola no cursor).
 *
 * ── Só onde há hover ───────────────────────────────────────────────────────
 * No toque não existe "passar o mouse"; lá a descrição fica na página do
 * pacote. `aria-hidden` pelo mesmo motivo: o caminho para teclado e leitor de
 * tela é o CONTINUAR.
 */
export function PackageDescriptionPopover({
  title,
  content,
  image,
  className,
  children,
}: {
  title: string;
  content: ServiceContent;
  /** A arte do produto, mostrada no pé do painel. */
  image?: string;
  /** Classes do bloco da arte, que é o próprio gatilho. */
  className?: string;
  children: ReactNode;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const cursor = useRef<Point>({ x: 0, y: 0 });
  const current = useRef<Point | null>(null);
  const frame = useRef<number | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useRef(false);
  const [phase, setPhase] = useState<Phase>("closed");

  /** Onde o painel deve ficar para o cursor atual, já dentro da janela. */
  function targetFor({ x, y }: Point) {
    const height = outerRef.current?.offsetHeight ?? 0;
    const flipX = x + OFFSET + WIDTH > window.innerWidth - MARGIN;
    const left = flipX ? x - OFFSET - WIDTH : x + OFFSET;
    const top = y + OFFSET;
    return {
      point: {
        x: Math.max(MARGIN, left),
        y: Math.max(
          MARGIN,
          Math.min(top, window.innerHeight - height - MARGIN),
        ),
      },
      origin: `top ${flipX ? "right" : "left"}`,
    };
  }

  function place(point: Point) {
    if (outerRef.current) {
      outerRef.current.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`;
    }
  }

  function tick() {
    frame.current = null;
    if (!current.current) return;
    const { point: target, origin } = targetFor(cursor.current);
    const prev = current.current;
    const factor = reducedMotion.current ? 1 : FOLLOW;
    const next = {
      x: prev.x + (target.x - prev.x) * factor,
      y: prev.y + (target.y - prev.y) * factor,
    };
    current.current = next;
    place(next);
    innerRef.current?.style.setProperty("--pkg-origin", origin);
    // Continua até encostar no alvo; parado o mouse, o laço para sozinho.
    if (
      Math.abs(target.x - next.x) > 0.3 ||
      Math.abs(target.y - next.y) > 0.3
    ) {
      frame.current = requestAnimationFrame(tick);
    }
  }

  function schedule() {
    if (frame.current === null) frame.current = requestAnimationFrame(tick);
  }

  function stopTimers() {
    if (exitTimer.current) clearTimeout(exitTimer.current);
    exitTimer.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }

  function handleEnter(event: MouseEvent) {
    if (!window.matchMedia("(hover: hover)").matches) return;
    reducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (exitTimer.current) clearTimeout(exitTimer.current);
    exitTimer.current = null;
    cursor.current = { x: event.clientX, y: event.clientY };
    setPhase("open");
  }

  function handleMove(event: MouseEvent) {
    cursor.current = { x: event.clientX, y: event.clientY };
    if (phase === "open") schedule();
  }

  function handleLeave() {
    if (phase !== "open") return;
    setPhase("closing");
    exitTimer.current = setTimeout(() => {
      stopTimers();
      current.current = null;
      setPhase("closed");
    }, EXIT_MS);
  }

  // Ao abrir: mede o painel já montado e o põe NO cursor antes de pintar —
  // sem isso ele entraria voando do canto da tela.
  useLayoutEffect(() => {
    if (phase !== "open" || current.current) return;
    const { point, origin } = targetFor(cursor.current);
    current.current = point;
    place(point);
    innerRef.current?.style.setProperty("--pkg-origin", origin);
  }, [phase]);

  useEffect(() => stopTimers, []);

  return (
    <div
      onMouseEnter={handleEnter}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={className}
    >
      {children}
      {phase !== "closed"
        ? createPortal(
            <div
              ref={outerRef}
              aria-hidden
              data-package-tooltip
              className="pointer-events-none fixed top-0 left-0 z-[100] will-change-transform"
              style={{ width: WIDTH }}
            >
              <div
                ref={innerRef}
                data-state={phase === "open" ? "open" : "closed"}
                className="package-popover relative flex flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[#0d0d0d]/95 px-[24px] pt-[24px] shadow-[0_24px_70px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,115,0,0.08)] backdrop-blur-md"
                style={{ maxHeight: `calc(100vh - ${MARGIN * 2}px)` }}
              >
                {/* Filete laranja no topo: a assinatura da marca no painel. */}
                <span
                  aria-hidden
                  className="absolute inset-x-[24px] top-0 h-px bg-gradient-to-r from-transparent via-brand-orange to-transparent opacity-70"
                />
                <p className="shrink-0 font-poppins text-[18px] leading-[26px] font-bold tracking-[0.36px] text-white">
                  {title}
                </p>
                {/* Só o TEXTO encolhe quando falta altura na janela: a arte no
                    pé tem altura reservada e nunca é cortada. */}
                {/* `pb` próprio: o degradê de corte fica sobre ESTA margem vazia
                    e só cobre texto quando ele realmente passa da altura (antes
                    cobria a última linha, 2026-10-06). */}
                <div className="relative min-h-0 flex-1 overflow-hidden pb-[24px]">
                  {content.sections.map((section, index) => (
                    <div key={index} className="mt-[18px]">
                      {section.title ? (
                        <p className="font-poppins text-[15px] leading-[22px] font-bold tracking-[0.15px] text-white">
                          {section.title}
                        </p>
                      ) : null}
                      {section.items.length > 0 ? (
                        <ul className="mt-[6px] flex flex-col gap-[4px]">
                          {section.items.map((item, itemIndex) => (
                            <li
                              key={itemIndex}
                              className="flex gap-[8px] font-helvetica text-[14px] leading-[22px] tracking-[0.14px] text-brand-placeholder"
                            >
                              <span aria-hidden className="text-brand-orange">
                                ●
                              </span>
                              <span className="min-w-0 break-words">
                                {item}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                  {/* Texto além da janela: some num degradê em vez de cortar seco. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-[24px] bg-gradient-to-b from-transparent to-[#0d0d0d]"
                  />
                </div>
                {image ? (
                  <div className="relative mb-[24px] h-[200px] shrink-0 overflow-hidden rounded-[14px] border border-white/10 bg-[#2f2f2f]">
                    <Image
                      src={image}
                      alt=""
                      fill
                      sizes="392px"
                      className="object-cover"
                    />
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
