import Image from "next/image";
import { cn } from "@/lib/cn";
import { OrderStatusTracker } from "./OrderStatusTracker";
import { ORDER_STATUS_STYLES, type Order } from "./types";

/**
 * Cartão de pedido (Figma 2073:1612) — 1000×239, raio 30, fundo preto a 10%
 * e borda branca a 10%.
 *
 * O posicionamento interno é ABSOLUTO de propósito: o design coloca sete
 * blocos em coordenadas que não formam nenhuma grade regular (título em y=25,
 * linha de ações em y=36, tracker em y=82), e reproduzir isso com fluxo exigiria
 * margens arbitrárias que se desalinham ao primeiro texto mais longo.
 *
 * Consequência assumida: abaixo de ~1100px o cartão não cabe e o container rola
 * na horizontal. Um layout empilhado para telas pequenas ainda está pendente —
 * ver .claude/context/open-questions.md.
 */
export function OrderCard({ order }: { order: Order }) {
  const status = ORDER_STATUS_STYLES[order.status];

  const linhas = [
    { label: "Plataforma/Servidor", value: order.platform, top: 71, valueTop: 67 },
    { label: "Quantidade", value: order.quantity, top: 106, valueTop: 102 },
    { label: "Preço", value: order.price, top: 145, valueTop: 141 },
  ];

  return (
    <article className="relative h-[239px] w-[1000px] shrink-0 rounded-[30px] border border-white/10 bg-black/10">
      <div className="absolute top-[25px] left-[50px] h-[189px] w-[146px] overflow-hidden rounded-[12px] border-2 border-white/10">
        <Image
          src={order.image}
          alt={order.productName}
          width={146}
          height={189}
          className="h-full w-full object-cover"
        />
      </div>

      <h3 className="absolute top-[25px] left-[224px] w-[265px] font-poppins text-[18px] leading-[27px] font-bold tracking-[0.36px] text-white">
        {order.productName}
      </h3>

      {/* Rótulo à esquerda, valor alinhado à direita numa coluna que termina em
          x=525. Os `top` saem direto do design; o valor fica 4px acima do
          rótulo porque as duas fontes têm caixas de altura diferente. */}
      {linhas.map((linha) => (
        <div key={linha.label}>
          <span
            className="absolute left-[222px] font-helvetica text-[14px] leading-[16px] font-bold tracking-[0.14px] text-white/80"
            style={{ top: linha.top }}
          >
            {linha.label}
          </span>
          {/* `whitespace-nowrap`: a caixa do design tem 114px e "Eternal
              Softcore" mede ~110 em Poppins SemiBold 14 — no limite. Sem isto
              ela quebra em duas linhas e invade a linha de baixo. Como o texto
              é alinhado à direita e à esquerda só existe espaço vazio,
              transbordar é o comportamento certo (é o que o Figma faz). */}
          <span
            className="absolute w-[114px] text-right font-poppins text-[14px] leading-[23px] font-semibold tracking-[0.07px] whitespace-nowrap text-white"
            style={{ top: linha.valueTop, left: 525 - 114 }}
          >
            {linha.value}
          </span>
        </div>
      ))}

      {/* Chat: pílula com borda laranja e fundo em degradê escuro. */}
      <button
        type="button"
        className="absolute top-[36px] left-[582px] flex h-[24px] w-[74px] items-center justify-center gap-[6px] rounded-[66px] border border-brand-orange bg-gradient-to-b from-[#222] to-[#1d1d1d] transition-opacity hover:opacity-80"
      >
        <Image src="/icons/order/chat.svg" alt="" width={16} height={16} aria-hidden />
        <span className="font-helvetica text-[14px] leading-[15px] text-white">
          Chat
        </span>
      </button>

      <span
        className={cn(
          "absolute top-[36px] left-[671px] flex h-[24px] w-[100px] items-center justify-center rounded-[66px] border border-white/5 font-helvetica text-[14px] tracking-[0.14px]",
          status.className,
        )}
      >
        {status.label}
      </span>

      <div
        aria-hidden
        className="absolute top-[31px] left-[873px] h-[29px] w-px bg-white/20"
      />

      <time className="absolute top-[39px] left-[884px] font-helvetica text-[16px] leading-[13px] tracking-[0.16px] text-brand-placeholder">
        {order.date}
      </time>

      <OrderStatusTracker
        currentStep={order.currentStep}
        className="absolute top-[82px] left-[572px]"
      />
    </article>
  );
}
