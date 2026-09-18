"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/masks";
import { backendAsset } from "@/lib/publicApi";
import {
  formatDateTime,
  formatMoney,
  orDash,
  statusStyle,
  type AdminOrder,
} from "./types";

/**
 * "Informações de compra" — o detalhe de um pedido (Figma 2546:1136, última
 * coluna da tabela).
 *
 * O arquivo desenha o texto como um link e não mostra o que ele abre. Este
 * modal é a leitura escolhida: a tabela tem dez colunas e já está no limite da
 * largura, e o que falta ver de um pedido (produto, arte, servidor, quantidade
 * e valor) não caberia em nenhuma delas.
 *
 * SÓ LEITURA. O que o cliente comprou é o histórico congelado no momento da
 * compra — editá-lo pelo painel seria reescrever o passado de alguém, que é
 * justamente o que o congelamento no model existe para impedir. O que se altera
 * (situação e entregador) fica na linha da tabela.
 *
 * Controlado por `open`/`onOpenChange` em vez de `Dialog.Trigger`: quem abre é
 * a célula da tabela, e um gatilho por linha montaria quinze diálogos.
 */
export function OrderInfoDialog({
  order,
  onClose,
}: {
  order: AdminOrder;
  onClose: () => void;
}) {
  const style = statusStyle(order.status);
  const art = backendAsset(order.productImageUrl);

  const linhas: [string, string][] = [
    ["Código", order.reference],
    ["Data", formatDateTime(order.createdAt)],
    ["Cliente", order.customerName],
    ["Telefone", orDash(order.customerPhone && formatPhone(order.customerPhone))],
    ["Jogo", orDash(order.gameName)],
    ["Produto", order.productName],
    ["Servidor", order.platform],
    ["Quantidade", order.quantity],
    ["Entregador", orDash(order.assigneeName)],
  ];

  return (
    <Dialog.Root open onOpenChange={(next) => (next ? undefined : onClose())}>
      <Dialog.Portal>
        {/* O overlay escurece e captura o clique fora; o Radix cuida do foco
            preso, do Esc e de devolver o foco ao botão que abriu. */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]" />

        <Dialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[620px] max-w-[calc(100vw-40px)]",
            "max-h-[calc(100vh-80px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto",
            "scrollbar-orange rounded-[30px] border border-brand-border bg-brand-surface p-[40px]",
            "shadow-[0_24px_60px_rgba(0,0,0,0.6)]",
          )}
        >
          <div className="flex items-start justify-between gap-[20px]">
            <div className="min-w-0">
              <Dialog.Title className="font-helvetica text-[25px] leading-[24px] font-bold tracking-[0.25px] text-white">
                Informações de compra
              </Dialog.Title>
              <Dialog.Description className="mt-[10px] font-helvetica text-[15px] text-brand-placeholder">
                O que este pedido registrou no momento da compra.
              </Dialog.Description>
            </div>

            <span
              className={cn(
                "shrink-0 rounded-[6px] border border-white/5 px-[10px] py-[4px] font-poppins text-[12px] font-bold",
                style.className,
              )}
            >
              {style.label}
            </span>
          </div>

          <div className="mt-[30px] flex items-start gap-[25px]">
            {/* A arte é opcional: o produto pode ter sido cadastrado sem ela, e
                o pedido congela o que havia. Sem arte a caixa some, em vez de
                deixar um retângulo vazio ao lado do texto. */}
            {art ? (
              <div className="relative h-[150px] w-[143px] shrink-0 overflow-hidden rounded-[12px] border border-white/10">
                <Image
                  src={art}
                  alt=""
                  fill
                  sizes="143px"
                  className="object-cover"
                />
              </div>
            ) : null}

            <dl className="min-w-0 flex-1">
              {linhas.map(([rotulo, valor]) => (
                <div
                  key={rotulo}
                  className="flex justify-between gap-[20px] border-b border-white/5 py-[10px]"
                >
                  <dt className="shrink-0 font-poppins text-[13px] text-brand-fg-subtle">
                    {rotulo}
                  </dt>
                  <dd className="min-w-0 truncate font-poppins text-[14px] text-white">
                    {valor}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mt-[25px] flex items-baseline justify-between border-t-2 border-white/10 pt-[18px]">
            <span className="font-poppins text-[14px] text-brand-fg-subtle">
              Valor total
            </span>
            <strong className="font-helvetica text-[24px] font-bold text-white">
              {formatMoney(order.totalPrice, order.currency)}
            </strong>
          </div>

          <div className="mt-[30px] flex justify-end">
            <Dialog.Close className="h-[50px] rounded-full border border-brand-border bg-[image:var(--brand-surface-fill)] px-[35px] font-poppins text-[14px] font-bold text-white transition-opacity hover:opacity-90">
              Fechar
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
