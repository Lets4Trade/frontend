"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { ACTION_FAILED_MESSAGE, runAction } from "@/lib/safeAction";
import { saveProductOrderAction } from "./actions";
import { productImage } from "./catalog";
import type { OrderableProduct } from "./ordering";

/**
 * Quantos produtos a vitrine mostra por fileira no desktop (grade 6 × 4 do
 * Figma). É o que define o que é "a primeira fileira" aqui.
 */
const ROW = 6;

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/**
 * "Organizar ordem" (2026-09-24): a aba inteira de um jogo numa grade de 6
 * colunas — a MESMA largura de fileira da vitrine —, para arrastar.
 *
 * Tudo é rascunho até "SALVAR ORDEM". Além do arrasto (mouse, toque e
 * teclado, pelo `@dnd-kit`, como no Builder), cada card tem "topo" e ←/→:
 * levar um produto da posição 90 para a primeira fileira arrastando exigiria
 * rolar a tela com o card na mão.
 */
export function ProductOrderBoard({
  gameId,
  type,
  initial,
}: {
  gameId: string;
  type: string;
  initial: OrderableProduct[];
}) {
  const [saved, setSaved] = useState(() => initial.map((item) => item.id));
  const [order, setOrder] = useState(saved);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const byId = new Map(initial.map((item) => [item.id, item]));
  const dirty = order.some((id, index) => id !== saved[index]);

  // `id` fixo: sem ele o dnd-kit sorteia um por montagem e a hidratação acusa
  // divergência (mesma nota do `SectionOrderList`).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function move(from: number, to: number) {
    if (to < 0 || to >= order.length || from === to) return;
    setOrder((current) => arrayMove(current, from, to));
    setMessage(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    move(order.indexOf(String(active.id)), order.indexOf(String(over.id)));
  }

  function save() {
    startTransition(async () => {
      const result = await runAction(() => saveProductOrderAction(gameId, type, order), {
        ok: false,
        message: ACTION_FAILED_MESSAGE,
      });
      if (result.ok) {
        setSaved(order);
        setMessage({ tone: "ok", text: "Ordem salva. A vitrine já mostra a nova ordem." });
      } else {
        setMessage({ tone: "error", text: result.message });
      }
    });
  }

  return (
    <div>
      {/* Barra fixa: salvar precisa estar à mão depois de rolar 120 produtos. */}
      <div className="sticky top-[12px] z-20 flex flex-wrap items-center gap-[16px] rounded-[20px] border border-brand-border bg-brand-surface/95 px-[20px] py-[14px] backdrop-blur-[10px]">
        <p className="font-helvetica text-[14px] text-brand-fg-muted">
          <strong className="font-bold text-white">{order.length} produtos.</strong> Arraste para
          mudar a ordem — os {ROW} primeiros formam a <strong className="text-white">1ª fileira</strong> da
          vitrine.
        </p>

        <div className="ml-auto flex items-center gap-[10px]">
          {message ? (
            <span
              role="status"
              className={cn(
                "font-helvetica text-[13px]",
                message.tone === "ok" ? "text-brand-rating" : "text-red-9",
              )}
            >
              {message.text}
            </span>
          ) : dirty ? (
            <span className="font-helvetica text-[13px] text-brand-orange">Alterações não salvas</span>
          ) : null}

          <button
            type="button"
            disabled={!dirty || pending}
            onClick={() => {
              setOrder(saved);
              setMessage(null);
            }}
            className="h-[40px] rounded-full border border-white/15 px-[18px] font-poppins text-[13px] font-bold text-white/80 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            DESCARTAR
          </button>
          <button
            type="button"
            disabled={!dirty || pending}
            onClick={save}
            className="h-[40px] rounded-full bg-[image:var(--brand-orange-gradient)] px-[22px] font-poppins text-[13px] font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "SALVANDO..." : "SALVAR ORDEM"}
          </button>
        </div>
      </div>

      <DndContext
        id="product-order"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <ol className="mt-[24px] grid grid-cols-6 gap-[14px]">
            {order.map((id, index) => {
              const product = byId.get(id);
              if (!product) return null;
              return (
                <SortableTile
                  key={id}
                  product={product}
                  index={index}
                  last={index === order.length - 1}
                  onMove={(to) => move(index, to)}
                />
              );
            })}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableTile({
  product,
  index,
  last,
  onMove,
}: {
  product: OrderableProduct;
  index: number;
  last: boolean;
  onMove: (to: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: product.id,
  });
  const image = productImage(product.imageUrl ?? null);
  const firstRow = index < ROW;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative flex flex-col rounded-[18px] border bg-brand-surface p-[10px]",
        firstRow ? "border-brand-orange/60" : "border-white/10",
        isDragging && "z-10 shadow-[0_16px_40px_rgba(0,0,0,.6)]",
      )}
    >
      {/* A ALÇA é o card inteiro menos os botões: arrastar de qualquer ponto,
          e os botões continuam clicáveis (o sensor exige 6px de movimento). */}
      <div
        {...attributes}
        {...listeners}
        aria-label={`${product.name}, posição ${index + 1}. Espaço para pegar, setas para mover.`}
        className="flex cursor-grab touch-none flex-col gap-[8px] outline-none select-none active:cursor-grabbing focus-visible:rounded-[12px] focus-visible:ring-2 focus-visible:ring-brand-orange"
      >
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "rounded-full px-[8px] py-[2px] font-poppins text-[12px] font-bold",
              firstRow ? "bg-brand-orange text-black" : "bg-white/10 text-white/80",
            )}
          >
            #{index + 1}
          </span>
          {firstRow ? (
            <span className="font-poppins text-[10px] font-bold tracking-[0.1px] text-brand-orange">
              1ª FILEIRA
            </span>
          ) : !product.ordered ? (
            <span className="font-helvetica text-[10px] text-brand-fg-subtle" title="Ainda não organizado: está em ordem alfabética">
              A–Z
            </span>
          ) : null}
        </div>

        <div className="relative aspect-[263/200] overflow-hidden rounded-[12px] bg-white/5">
          {image ? (
            <Image
              src={image.src}
              alt=""
              fill
              sizes="200px"
              className="pointer-events-none object-cover"
              draggable={false}
            />
          ) : null}
        </div>

        <p className="line-clamp-2 min-h-[36px] font-poppins text-[13px] leading-[18px] font-semibold text-white">
          {product.name}
        </p>
        <p className="font-helvetica text-[12px] text-brand-fg-muted">
          {brl.format(product.priceCents / 100)}
          {product.serverLabel ? ` · ${product.serverLabel}` : ""}
        </p>
      </div>

      <div className="mt-[8px] flex gap-[6px]">
        <TileButton onClick={() => onMove(0)} disabled={index === 0} label="Levar para o topo">
          topo
        </TileButton>
        <TileButton onClick={() => onMove(index - 1)} disabled={index === 0} label="Uma posição antes">
          ←
        </TileButton>
        <TileButton onClick={() => onMove(index + 1)} disabled={last} label="Uma posição depois">
          →
        </TileButton>
      </div>
    </li>
  );
}

function TileButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="h-[28px] flex-1 rounded-full border border-white/10 font-poppins text-[12px] text-white/80 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}
