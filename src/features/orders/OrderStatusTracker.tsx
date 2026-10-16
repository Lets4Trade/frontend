import Image from "next/image";
import { cn } from "@/lib/cn";
import { ORDER_STEPS, type Order, type OrderTrack } from "./types";

/**
 * Trilha de progresso do pedido.
 *
 * Aparece em TRÊS tamanhos:
 *   `card`    (2073:1612) — no card de "Meus Pedidos": círculos de 25,23px a
 *                            cada 112,27. Os valores quebrados são do arquivo,
 *                            que desenhou numa escala e reduziu depois.
 *   `compact` — celular e compra com vários itens: cabe em 358px.
 *   `page`    (2569:1682) — na tela do pedido: círculos de 40px a cada 178,33.
 *
 * Um componente com várias medidas em vez de vários componentes: o que muda é
 * tamanho, não comportamento, e duplicar significaria corrigir a lógica de
 * "concluído / atual / pendente / cancelado" mais de uma vez.
 *
 * Os estados vêm de ASSETS exportados: `step-1` (concluído, com check),
 * `step-2` (atual, miolo preenchido) e `step-3` (pendente, miolo vazado). O X
 * do cancelado não existe no arquivo: é desenhado aqui, na mesma geometria,
 * com o vermelho da pílula "Cancelado".
 *
 * ── Dinâmica (2026-10-15) ──────────────────────────────────────────────────
 * A posição vem de `track`, DERIVADO da situação do pedido (`toTrack`). Antes
 * vinha de um campo que o backend nunca atualizava, e a trilha ficava parada
 * em "Pedido Feito" com o pedido já entregue. Entregue conclui TODAS as
 * etapas; cancelado conclui as alcançadas e põe o X na seguinte.
 */
const STEP_ICON = {
  done: "/icons/order/step-1.svg",
  current: "/icons/order/step-2.svg",
  pending: "/icons/order/step-3.svg",
} as const;

const CANCELED_RED = "#ff2828";
const DONE_GREEN = "#00cb45";

const SIZES = {
  card: {
    circle: 25.23,
    gap: 112.27,
    connector: 88.304,
    connectorHeight: 1.261,
    labelTop: 31.5,
    labelWidth: 80,
    labelClass: "text-[10.092px] leading-[15.138px] tracking-[0.2018px]",
    dateClass: "text-[10px] leading-[14px]",
    /** Rótulo de até 2 linhas; com datas, +1 linha. */
    height: 62,
    heightWithDates: 78,
  },
  compact: {
    circle: 25.23,
    gap: 92,
    connector: 66.77,
    connectorHeight: 1.261,
    labelTop: 31.5,
    labelWidth: 80,
    labelClass: "text-[10.092px] leading-[15.138px] tracking-[0.2018px]",
    dateClass: "text-[10px] leading-[14px]",
    height: 62,
    heightWithDates: 78,
  },
  page: {
    circle: 40,
    gap: 178.33,
    connector: 138.33,
    connectorHeight: 2,
    labelTop: 50,
    labelWidth: 130,
    labelClass: "text-[16px] leading-[24px] tracking-[0.32px]",
    dateClass: "text-[13px] leading-[18px]",
    height: 97,
    heightWithDates: 118,
  },
} as const;

export type TrackerSize = keyof typeof SIZES;

type StepState = "done" | "current" | "pending" | "canceled";

/**
 * O estado de cada etapa. Separado do desenho para ser testado sem DOM.
 *
 * Cancelado: o X fica na etapa SEGUINTE à última alcançada (cancelado sem
 * pagar = X em "Aprovado"); um pedido estornado depois de entregue põe o X na
 * última, que é onde ele estava.
 */
export function stepStates(track: OrderTrack): StepState[] {
  const reached = ORDER_STEPS.findIndex((step) => step.key === track.step);
  const last = ORDER_STEPS.length - 1;
  const cancelAt = Math.min(reached + 1, last);

  return ORDER_STEPS.map((_, index) => {
    if (track.state === "done") return "done";
    if (track.state === "canceled") {
      if (index < cancelAt) return "done";
      return index === cancelAt ? "canceled" : "pending";
    }
    if (index < reached) return "done";
    return index === reached ? "current" : "pending";
  });
}

export function OrderStatusTracker({
  track,
  dates,
  size = "card",
  className,
}: {
  track: OrderTrack;
  /** Data de cada etapa ("15/10 14:32"). Ausente = trilha sem datas. */
  dates?: Order["stepDates"];
  size?: TrackerSize;
  className?: string;
}) {
  const states = stepStates(track);
  const m = SIZES[size];
  const showDates = !!dates && Object.keys(dates).length > 0;

  const summary =
    track.state === "canceled"
      ? "Cancelado"
      : track.state === "done"
        ? "Finalizado"
        : (ORDER_STEPS.find((step) => step.key === track.step)?.label.replace("\n", " ") ?? "");

  return (
    <div
      className={cn("relative", className)}
      style={{
        width: m.gap * (ORDER_STEPS.length - 1) + m.circle,
        height: showDates ? m.heightWithDates : m.height,
      }}
      // Os rótulos são decorativos; o resumo é o que o leitor de tela anuncia.
      role="group"
      aria-label={`Progresso: ${summary}`}
    >
      {ORDER_STEPS.map((step, index) => {
        const state = states[index];
        const left = index * m.gap;
        const date = !showDates
          ? undefined
          : state === "canceled"
            ? dates?.cancelado
            : state === "pending"
              ? undefined
              : dates?.[step.key];

        return (
          <div key={step.key}>
            {/* Conector até a próxima etapa: verde no trecho percorrido, cinza
                no resto (inclusive o que leva ao X do cancelado). */}
            {index < ORDER_STEPS.length - 1 ? (
              <div
                aria-hidden
                className="absolute"
                style={{
                  left: left + m.circle,
                  top: m.circle / 2,
                  width: m.connector,
                  height: m.connectorHeight,
                  backgroundColor: states[index + 1] === "done" || states[index + 1] === "current" ? DONE_GREEN : "#383838",
                }}
              />
            ) : null}

            {state === "canceled" ? (
              <CanceledIcon size={m.circle} left={left} />
            ) : (
              <Image
                src={STEP_ICON[state]}
                alt=""
                width={Math.round(m.circle)}
                height={Math.round(m.circle)}
                aria-hidden
                className="absolute top-0"
                style={{ left, width: m.circle, height: m.circle }}
              />
            )}

            <span
              aria-hidden
              className="absolute flex flex-col items-center text-center"
              style={{
                top: m.labelTop,
                left: left + m.circle / 2 - m.labelWidth / 2,
                width: m.labelWidth,
              }}
            >
              <span
                className={cn("font-poppins font-bold whitespace-pre-line", m.labelClass)}
                style={{ color: state === "canceled" ? CANCELED_RED : state === "pending" ? "rgba(255,255,255,.45)" : "#fff" }}
              >
                {state === "canceled" ? "Cancelado" : step.label}
              </span>
              {date ? (
                <span className={cn("font-helvetica whitespace-nowrap text-brand-placeholder", m.dateClass)}>{date}</span>
              ) : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** O X do cancelado, na geometria dos assets (anel de 1,26/25,23 do diâmetro). */
function CanceledIcon({ size, left }: { size: number; left: number }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 25.2298 25.2298"
      fill="none"
      className="absolute top-0"
      style={{ left, width: size, height: size }}
    >
      <circle cx="12.6149" cy="12.6149" r="11.9841" stroke={CANCELED_RED} strokeWidth="1.26149" />
      <path d="M9.1 9.1l7.03 7.03M16.13 9.1L9.1 16.13" stroke={CANCELED_RED} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
