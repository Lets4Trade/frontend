import Image from "next/image";
import { cn } from "@/lib/cn";
import { ORDER_STEPS, type OrderStepKey } from "./types";

/**
 * Trilha de progresso do pedido.
 *
 * Aparece em DOIS tamanhos, e os dois vêm do arquivo:
 *   `card`  (2073:1612) — dentro do cartão de "Meus Pedidos": círculos de
 *                          25,23px a cada 112,27. Os valores quebrados são do
 *                          arquivo, que desenhou numa escala e reduziu depois.
 *   `page`  (2569:1682) — na tela do pedido: círculos de 40px a cada 178,33,
 *                          rótulos de 16px.
 *
 * Um componente com duas medidas em vez de dois componentes: o que muda é
 * tamanho, não comportamento, e duplicar significaria corrigir a lógica de
 * "concluído / atual / pendente" duas vezes.
 *
 * Os três estados são ASSETS exportados, não CSS: `step-1` (concluído, com
 * check), `step-2` (atual, miolo preenchido) e `step-3` (pendente, miolo
 * vazado). Assim o tracker aceita qualquer etapa como atual, em vez de repetir
 * os quatro ícones fixos que o design mostra num único estado.
 */
const STEP_ICON = {
  done: "/icons/order/step-1.svg",
  current: "/icons/order/step-2.svg",
  pending: "/icons/order/step-3.svg",
} as const;

const SIZES = {
  card: {
    circle: 25.23,
    gap: 112.27,
    connector: 88.304,
    connectorHeight: 1.261,
    labelTop: 31.5,
    labelWidth: 80,
    labelClass: "text-[10.092px] leading-[15.138px] tracking-[0.2018px]",
    height: 48,
  },
  page: {
    circle: 40,
    gap: 178.33,
    connector: 138.33,
    connectorHeight: 2,
    labelTop: 50,
    labelWidth: 130,
    labelClass: "text-[16px] leading-[24px] tracking-[0.32px]",
    height: 97,
  },
} as const;

export type TrackerSize = keyof typeof SIZES;

export function OrderStatusTracker({
  currentStep,
  size = "card",
  className,
}: {
  currentStep: OrderStepKey;
  size?: TrackerSize;
  className?: string;
}) {
  const currentIndex = ORDER_STEPS.findIndex((s) => s.key === currentStep);
  const m = SIZES[size];

  return (
    <div
      className={cn("relative", className)}
      style={{
        width: m.gap * (ORDER_STEPS.length - 1) + m.circle,
        height: m.height,
      }}
      // O tracker é decorativo em cima de um texto que já diz a etapa; o
      // resumo abaixo é o que leitor de tela anuncia.
      role="group"
      aria-label={`Progresso: ${ORDER_STEPS[currentIndex]?.label.replace("\n", " ")}`}
    >
      {ORDER_STEPS.map((step, index) => {
        const state =
          index < currentIndex ? "done" : index === currentIndex ? "current" : "pending";
        const left = index * m.gap;

        return (
          <div key={step.key}>
            {/* Conector até a próxima etapa. Verde só quando a etapa já foi
                concluída — é o que separa o trecho percorrido do restante. */}
            {index < ORDER_STEPS.length - 1 ? (
              <div
                aria-hidden
                className={cn(
                  "absolute",
                  index < currentIndex ? "bg-[#00cb45]" : "bg-[#383838]",
                )}
                style={{
                  left: left + m.circle,
                  top: m.circle / 2,
                  width: m.connector,
                  height: m.connectorHeight,
                }}
              />
            ) : null}

            <Image
              src={STEP_ICON[state]}
              alt=""
              width={Math.round(m.circle)}
              height={Math.round(m.circle)}
              aria-hidden
              className="absolute top-0"
              style={{ left, width: m.circle, height: m.circle }}
            />

            <span
              aria-hidden
              className={cn(
                "absolute text-center font-poppins font-bold whitespace-pre-line text-white",
                m.labelClass,
              )}
              style={{
                top: m.labelTop,
                left: left + m.circle / 2 - m.labelWidth / 2,
                width: m.labelWidth,
              }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
