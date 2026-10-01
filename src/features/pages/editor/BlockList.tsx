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
import { useState } from "react";
import { cn } from "@/lib/cn";
import { blockTitle } from "../catalog";
import type { Block } from "../types";

const onlyVertical: Modifier = ({ transform }) => ({ ...transform, x: 0 });

/**
 * A lista de blocos da página, na ordem em que aparecem na loja.
 *
 * Arrastar (mouse/toque) OU setas — as setas são o caminho de teclado e o de
 * quem não acerta o arrasto no touchpad. Remover pede confirmação na própria
 * linha: é a única ação daqui que não se desfaz com um clique (a não ser pelo
 * histórico de versões).
 */
export function BlockList({
  blocks,
  selectedId,
  legacyLabels,
  onSelect,
  onChange,
}: {
  blocks: Block[];
  selectedId: string | null;
  /** Nomes das seções do desenho DESTA página. */
  legacyLabels: Record<string, string>;
  onSelect: (id: string) => void;
  onChange: (blocks: Block[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = blocks.findIndex((block) => block.id === active.id);
    const to = blocks.findIndex((block) => block.id === over.id);
    if (from < 0 || to < 0) return;
    onChange(arrayMove(blocks, from, to));
  }

  function move(index: number, direction: -1 | 1) {
    const to = index + direction;
    if (to < 0 || to >= blocks.length) return;
    onChange(arrayMove(blocks, index, to));
  }

  function patch(id: string, next: Partial<Block>) {
    onChange(blocks.map((block) => (block.id === id ? ({ ...block, ...next } as Block) : block)));
  }

  function duplicate(index: number) {
    const source = blocks[index];
    // Cópia PROFUNDA: listas dentro das props (perguntas, jogos) não podem ser
    // compartilhadas entre o original e a cópia. Ids novos para bloco e itens.
    const copy = JSON.parse(JSON.stringify(source)) as Block;
    copy.id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    // Toda lista de itens (perguntas, contadores, depoimentos) ganha ids novos:
    // o backend recusa id repetido e o React usa o id como chave.
    const props = copy.props as { items?: { id: string }[] };
    if (Array.isArray(props.items)) {
      props.items = props.items.map((item) => ({
        ...item,
        id: crypto.randomUUID().replace(/-/g, "").slice(0, 12),
      }));
    }
    const next = [...blocks];
    next.splice(index + 1, 0, copy);
    onChange(next);
    onSelect(copy.id);
  }

  function remove(id: string) {
    onChange(blocks.filter((block) => block.id !== id));
  }

  return (
    <DndContext
      id="page-builder-blocks"
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[onlyVertical]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-[6px]">
          {blocks.map((block, index) => (
            <Row
              key={block.id}
              block={block}
              index={index}
              total={blocks.length}
              selected={block.id === selectedId}
              title={blockTitle(block, legacyLabels)}
              onSelect={() => onSelect(block.id)}
              onMove={(direction) => move(index, direction)}
              onToggleHidden={() => patch(block.id, { hidden: !block.hidden })}
              onDuplicate={block.type === "secao" ? undefined : () => duplicate(index)}
              onRemove={() => remove(block.id)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function Row({
  block,
  index,
  total,
  selected,
  title,
  onSelect,
  onMove,
  onToggleHidden,
  onDuplicate,
  onRemove,
}: {
  block: Block;
  index: number;
  total: number;
  selected: boolean;
  title: string;
  onSelect: () => void;
  onMove: (direction: -1 | 1) => void;
  onToggleHidden: () => void;
  onDuplicate?: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const [confirming, setConfirming] = useState(false);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "rounded-[14px] border bg-black/30",
        selected ? "border-brand-orange" : "border-brand-border",
        isDragging && "relative z-10 shadow-[0_10px_30px_rgba(0,0,0,.6)]",
        block.hidden && "opacity-55",
      )}
    >
      <div className="flex items-center gap-[8px] px-[10px] py-[9px]">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Arrastar ${title}`}
          className="cursor-grab touch-none px-[2px] font-poppins text-[14px] text-white/40 hover:text-white active:cursor-grabbing"
        >
          ⋮⋮
        </button>

        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-center gap-[8px] text-left"
          aria-current={selected ? "true" : undefined}
        >
          <span className="truncate font-poppins text-[13px] text-white">{title}</span>
          {block.hidden ? (
            <span className="shrink-0 rounded-full bg-white/10 px-[6px] py-[1px] font-poppins text-[10px] text-white/70">
              oculto
            </span>
          ) : null}
        </button>

        {confirming ? (
          <span className="flex shrink-0 items-center gap-[4px]">
            <span className="font-poppins text-[11px] text-white/70">Remover?</span>
            <IconButton label="Confirmar remoção" onClick={onRemove} tone="danger">
              Sim
            </IconButton>
            <IconButton label="Cancelar" onClick={() => setConfirming(false)}>
              Não
            </IconButton>
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-[2px]">
            <IconButton label="Subir" onClick={() => onMove(-1)} disabled={index === 0}>
              ↑
            </IconButton>
            <IconButton label="Descer" onClick={() => onMove(1)} disabled={index === total - 1}>
              ↓
            </IconButton>
            <IconButton label={block.hidden ? "Mostrar na loja" : "Esconder da loja"} onClick={onToggleHidden}>
              {block.hidden ? "◌" : "◉"}
            </IconButton>
            {onDuplicate ? (
              <IconButton label="Duplicar" onClick={onDuplicate}>
                ⧉
              </IconButton>
            ) : null}
            <IconButton label="Remover" onClick={() => setConfirming(true)} tone="danger">
              ✕
            </IconButton>
          </span>
        )}
      </div>
    </li>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  tone,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-[26px] min-w-[26px] rounded-[8px] px-[5px] font-poppins text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-30",
        tone === "danger" ? "text-red-9 hover:bg-red-9/15" : "text-white/70 hover:bg-white/10 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
