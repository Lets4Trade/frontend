import Image from "next/image";
import { cn } from "@/lib/cn";
import { ORDER_STEPS, type OrderStepKey } from "./types";

/**
 * Trilha de progresso do pedido (Figma 2073:1612).
 *
 * Medidas do design: círculos de 25.23px espaçados 112.27px (centro a centro),
 * conectores de 88.304×1.261 e rótulos de 10.092px. Os valores quebrados vêm
 * do arquivo — o componente foi desenhado numa escala e reduzido depois.
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

const CIRCLE = 25.23;
const GAP = 112.27;
const CONNECTOR_WIDTH = 88.304;

export function OrderStatusTracker({
  currentStep,
  className,
}: {
  currentStep: OrderStepKey;
  className?: string;
}) {
  const currentIndex = ORDER_STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div
      className={cn("relative h-[48px]", className)}
      style={{ width: GAP * (ORDER_STEPS.length - 1) + CIRCLE }}
      // O tracker é decorativo em cima de um texto que já diz a etapa; o
      // resumo abaixo é o que leitor de tela anuncia.
      role="group"
      aria-label={`Progresso: ${ORDER_STEPS[currentIndex]?.label.replace("\n", " ")}`}
    >
      {ORDER_STEPS.map((step, index) => {
        const state =
          index < currentIndex ? "done" : index === currentIndex ? "current" : "pending";
        const left = index * GAP;

        return (
          <div key={step.key}>
            {/* Conector até a próxima etapa. Verde só quando a etapa já foi
                concluída — é o que separa o trecho percorrido do restante. */}
            {index < ORDER_STEPS.length - 1 ? (
              <div
                aria-hidden
                className={cn(
                  "absolute h-[1.261px]",
                  index < currentIndex ? "bg-[#00cb45]" : "bg-[#383838]",
                )}
                style={{
                  left: left + CIRCLE,
                  top: CIRCLE / 2,
                  width: CONNECTOR_WIDTH,
                }}
              />
            ) : null}

            <Image
              src={STEP_ICON[state]}
              alt=""
              width={26}
              height={26}
              aria-hidden
              className="absolute top-0"
              style={{ left, width: CIRCLE, height: CIRCLE }}
            />

            <span
              aria-hidden
              className="absolute top-[31.5px] text-center font-poppins text-[10.092px] leading-[15.138px] font-bold tracking-[0.2018px] whitespace-pre-line text-white"
              style={{ left: left + CIRCLE / 2 - 40, width: 80 }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
