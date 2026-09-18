"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/cn";
import type { EditorBlock } from "./PageEditor";

/** Trava o arrasto no eixo vertical — mesma função do painel do builder. */
const onlyVertical: Modifier = ({ transform }) => ({ ...transform, x: 0 });

/**
 * A lista de sessões: arrastar para reordenar, olho para esconder.
 *
 * O ARRASTO fica NA LISTA, não na maquete ao lado. A maquete é escalada por
 * `transform`, e arrastar dentro dela erra a conta da posição — mesma decisão
 * já tomada na etapa 10 do Builder de Páginas.
 */
export function SectionOrderList({
  blocks,
  order,
  hidden,
  onChange,
}: {
  blocks: EditorBlock[];
  order: string[];
  hidden: string[];
  onChange: (order: string[], hidden: string[]) => void;
}) {
  // `id` fixo no `DndContext`: sem ele o dnd-kit gera um por montagem
  // (`DndDescribedBy-0`, `-1`, …), o servidor e o cliente sorteiam números
  // diferentes e o React acusa divergência de hidratação.
  const dndId = "site-sections";
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const label = (key: string) => blocks.find((block) => block.key === key)?.label ?? key;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = order.indexOf(String(active.id));
    const to = order.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onChange(arrayMove(order, from, to), hidden);
  }

  return (
    <div className="mt-[16px]">
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[onlyVertical]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-[6px]">
            {order.map((key, index) => (
              <SortableRow
                key={key}
                id={key}
                label={label(key)}
                position={index + 1}
                onHide={() => onChange(order.filter((item) => item !== key), [...hidden, key])}
                // As setas são o caminho de TECLADO que dá para provar — o
                // arrasto por teclado do dnd-kit nunca foi confirmado aqui.
                onMove={(direction) => {
                  const to = index + direction;
                  if (to < 0 || to >= order.length) return;
                  onChange(arrayMove(order, index, to), hidden);
                }}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {hidden.length > 0 ? (
        <div className="mt-[14px]">
          <p className="font-helvetica text-[12px] text-brand-fg-subtle">Escondidas da loja</p>
          <ul className="mt-[6px] flex flex-col gap-[6px]">
            {hidden.map((key) => (
              <li
                key={key}
                className="flex items-center justify-between gap-[8px] rounded-[12px] border border-white/10 px-[12px] py-[8px]"
              >
                <span className="truncate font-poppins text-[13px] text-white/50">{label(key)}</span>
                <button
                  type="button"
                  onClick={() => onChange([...order, key], hidden.filter((item) => item !== key))}
                  className="shrink-0 font-poppins text-[12px] font-semibold text-brand-orange hover:underline"
                >
                  mostrar
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function SortableRow({
  id,
  label,
  position,
  onHide,
  onMove,
}: {
  id: string;
  label: string;
  position: number;
  onHide: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-[8px] rounded-[12px] border border-white/10 bg-black/20 px-[10px] py-[8px]",
        isDragging && "border-brand-orange/60 opacity-80",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Arrastar ${label}`}
        className="cursor-grab px-[4px] font-poppins text-[14px] text-white/40 hover:text-white active:cursor-grabbing"
      >
        ⠿
      </button>
      <span className="w-[18px] shrink-0 text-center font-helvetica text-[11px] text-white/40">{position}</span>
      <span className="min-w-0 flex-1 truncate font-poppins text-[13px] text-white">{label}</span>
      <button type="button" onClick={() => onMove(-1)} aria-label={`Subir ${label}`} className="px-[4px] text-white/50 hover:text-white">
        ↑
      </button>
      <button type="button" onClick={() => onMove(1)} aria-label={`Descer ${label}`} className="px-[4px] text-white/50 hover:text-white">
        ↓
      </button>
      <button type="button" onClick={onHide} aria-label={`Esconder ${label}`} className="px-[4px] text-white/50 hover:text-white">
        👁
      </button>
    </li>
  );
}
