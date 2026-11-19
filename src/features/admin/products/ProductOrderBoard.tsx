"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
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
import { useMemo, useState, useTransition, type MouseEvent } from "react";
import { Field, fieldSurface } from "@/components/ui/Field";
import { SelectField } from "@/components/ui/SelectField";
import { cn } from "@/lib/cn";
import { ACTION_FAILED_MESSAGE, runAction } from "@/lib/safeAction";
import { saveProductOrderAction } from "./actions";
import { productImage } from "./catalog";
import type { OrderableProduct } from "./ordering";
import {
  ALL,
  applyVisibleOrder,
  categoryOrder,
  cutFilters,
  EMPTY_FILTERS,
  hasFilters,
  matchesFilters,
  moveSelection,
  moveSelectionTo,
  NONE,
  orderScope,
  rangeBetween,
  sameOrder,
  type OrderCategory,
  type OrderFilters,
} from "./orderBoard";

/**
 * Quantos produtos a vitrine mostra por fileira no desktop (grade 6 × 4 do
 * Figma). É o que define o que é "a primeira fileira" aqui.
 */
const ROW = 6;

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 4 });

/**
 * "Organizar ordem" (2026-09-24): a aba inteira de um jogo numa grade de 6
 * colunas — a MESMA largura de fileira da vitrine —, para arrastar.
 *
 * Tudo é rascunho até "SALVAR ORDEM". Além do arrasto (mouse, toque e
 * teclado, pelo `@dnd-kit`, como no Builder), cada card tem "topo" e ←/→:
 * levar um produto da posição 90 para a primeira fileira arrastando exigiria
 * rolar a tela com o card na mão.
 *
 * Desde 2026-11-09 (pedido do usuário):
 *  - FILTROS de busca, servidor, categoria e subcategoria. Com filtro, a ordem
 *    muda só ENTRE os produtos filtrados (`applyVisibleOrder`): os escondidos
 *    ficam onde estavam. O número do card é sempre a posição REAL na aba.
 *  - MULTISSELEÇÃO: caixa no card, Ctrl/⌘+clique e Shift+clique (intervalo).
 *    Arrastar um selecionado leva o grupo inteiro, na ordem em que estavam;
 *    "Topo"/"Fim" da barra fazem o mesmo sem arrastar.
 *
 * Desde 2026-11-18 (pedido do usuário): CATEGORIA/SUBCATEGORIA escolhida no
 * filtro organiza a ordem PRÓPRIA dela, que a vitrine usa quando o cliente
 * filtra por ela; a lista da aba (sem categoria) fica intacta. Cada lista tem
 * o seu rascunho, e o SALVAR grava todas as que mudaram.
 */
export function ProductOrderBoard({
  gameId,
  tabId,
  initial,
  initialCategoryOrders = {},
  servers = [],
  categories = [],
}: {
  gameId: string;
  /** A aba do jogo (`tabId`). */
  tabId: string;
  initial: OrderableProduct[];
  /** Ordem gravada de cada categoria (id → ids). */
  initialCategoryOrders?: Record<string, string[]>;
  /** Servidores do jogo (filtro). */
  servers?: { id: string; label: string }[];
  /** Categorias que valem NESTA aba (globais + as da aba), lista plana com `parentId`. */
  categories?: OrderCategory[];
}) {
  const [saved, setSaved] = useState(() => initial.map((item) => item.id));
  const [order, setOrder] = useState(saved);
  // Ordem gravada de cada categoria, e os rascunhos das que a pessoa mexeu.
  const [categorySaved, setCategorySaved] = useState(initialCategoryOrders);
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, string[]>>({});
  const [filters, setFilters] = useState<OrderFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [anchor, setAnchor] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const byId = useMemo(() => new Map(initial.map((item) => [item.id, item])), [initial]);
  const filtered = hasFilters(filters);

  // Qual lista está aberta: a da aba (`null`) ou a de uma categoria.
  const scope = orderScope(filters);
  /** A ordem gravada de uma categoria, completada com os produtos dela. */
  const categoryBaseline = (categoryId: string) =>
    categoryOrder(saved, categoryId, categorySaved[categoryId], byId, categories);
  const list = scope
    ? (categoryDrafts[scope] ?? categoryOrder(order, scope, categorySaved[scope], byId, categories))
    : order;

  const changedCategories = Object.keys(categoryDrafts).filter(
    (categoryId) => !sameOrder(categoryDrafts[categoryId], categoryBaseline(categoryId)),
  );
  const tabDirty = !sameOrder(order, saved);
  const dirty = tabDirty || changedCategories.length > 0;

  // Busca e servidor recortam a lista aberta.
  const cut = cutFilters(filters);
  const visible = list.filter((id) => {
    const product = byId.get(id);
    return product ? matchesFilters(product, cut, categories) : false;
  });
  const position = new Map(list.map((id, index) => [id, index]));
  const categorySavedSet = scope ? new Set(categorySaved[scope] ?? []) : null;
  const selectedVisible = new Set(visible.filter((id) => selected.has(id)));

  const roots = categories.filter((category) => !category.parentId);
  const children = categories.filter((category) => category.parentId && category.parentId === filters.category);
  const hasNoServer = initial.some((item) => !item.serverId);
  const hasNoCategory = initial.some((item) => !item.categoryId && !(item.extraCategoryIds ?? []).length);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /** Nova ordem dos VISÍVEIS, encaixada nas posições que eles ocupavam. */
  function reorderVisible(next: string[]) {
    if (scope) {
      // A lista da categoria muda; a da aba não.
      setCategoryDrafts((current) => ({ ...current, [scope]: applyVisibleOrder(list, visible, next) }));
    } else {
      setOrder((current) => applyVisibleOrder(current, visible, next));
    }
    setMessage(null);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= visible.length || from === to) return;
    reorderVisible(arrayMove(visible, from, to));
  }

  function changeFilters(next: Partial<OrderFilters>) {
    setFilters((current) => ({ ...current, ...next }));
    // Seleção feita com outro filtro poderia mover produtos que a pessoa não vê.
    setSelected(new Set());
    setAnchor(null);
  }

  function toggle(id: string, event?: { shiftKey?: boolean }) {
    if (event?.shiftKey && anchor) {
      const range = rangeBetween(visible, anchor, id);
      setSelected((current) => new Set([...current, ...range]));
      return;
    }
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setAnchor(id);
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    setActiveId(id);
    // Arrastar um card FORA da seleção é arrasto de um só: a seleção some
    // para ninguém achar que o grupo vai junto.
    if (!selected.has(id) && selected.size > 0) setSelected(new Set());
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeKey = String(active.id);
    const overKey = String(over.id);
    if (selectedVisible.has(activeKey) && selectedVisible.size > 1) {
      reorderVisible(moveSelection(visible, selectedVisible, activeKey, overKey));
      return;
    }
    move(visible.indexOf(activeKey), visible.indexOf(overKey));
  }

  function save() {
    // Fotografia do que vai ser gravado: a pessoa pode seguir mexendo.
    const tabOrder = tabDirty ? order : null;
    const categoryLists = changedCategories.map((categoryId) => [categoryId, categoryDrafts[categoryId]] as const);
    startTransition(async () => {
      const failed = { ok: false as const, message: ACTION_FAILED_MESSAGE };
      if (tabOrder) {
        const result = await runAction(() => saveProductOrderAction(gameId, tabId, tabOrder), failed);
        if (!result.ok) {
          setMessage({ tone: "error", text: result.message });
          return;
        }
        setSaved(tabOrder);
      }
      // Uma gravação por categoria mexida (normalmente uma ou duas).
      for (const [categoryId, ids] of categoryLists) {
        const result = await runAction(() => saveProductOrderAction(gameId, tabId, ids, categoryId), failed);
        if (!result.ok) {
          setMessage({ tone: "error", text: result.message });
          return;
        }
        setCategorySaved((current) => ({ ...current, [categoryId]: ids }));
        setCategoryDrafts((current) => {
          const next = { ...current };
          if (next[categoryId] === ids) delete next[categoryId];
          return next;
        });
      }
      setMessage({ tone: "ok", text: "Ordem salva. A vitrine já mostra a nova ordem." });
    });
  }

  function discard() {
    setOrder(saved);
    setCategoryDrafts({});
    setMessage(null);
  }

  const dragging = activeId !== null && selectedVisible.has(activeId) && selectedVisible.size > 1;

  return (
    <div>
      {/* Barra fixa: salvar precisa estar à mão depois de rolar 120 produtos. */}
      <div className="sticky top-[12px] z-20 flex flex-col gap-[12px] rounded-[20px] border border-brand-border bg-brand-surface/95 px-[20px] py-[14px] backdrop-blur-[10px]">
        <div className="flex flex-wrap items-center gap-[16px]">
          <p className="font-helvetica text-[14px] text-brand-fg-muted">
            <strong className="font-bold text-white">
              {visible.length !== order.length
                ? `${visible.length} de ${order.length} produtos.`
                : `${order.length} produtos.`}
            </strong>{" "}
            Arraste para mudar a ordem. Os {ROW} primeiros formam a{" "}
            <strong className="text-white">1ª fileira</strong> da vitrine.
          </p>

          <div className="ml-auto flex items-center gap-[10px]">
            {message ? (
              <span
                role="status"
                className={cn("font-helvetica text-[13px]", message.tone === "ok" ? "text-brand-rating" : "text-red-9")}
              >
                {message.text}
              </span>
            ) : dirty ? (
              <span className="font-helvetica text-[13px] text-brand-orange">Alterações não salvas</span>
            ) : null}

            <button
              type="button"
              disabled={!dirty || pending}
              onClick={discard}
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

        {/* Seleção (aparece com 1+ marcado): o que dá para fazer com o grupo. */}
        {selectedVisible.size > 0 ? (
          <div className="flex flex-wrap items-center gap-[10px] border-t border-white/10 pt-[12px]">
            <span className="font-poppins text-[13px] font-bold text-white">
              {selectedVisible.size} {selectedVisible.size === 1 ? "selecionado" : "selecionados"}
            </span>
            <BarButton onClick={() => reorderVisible(moveSelectionTo(visible, selectedVisible, "top"))}>
              Mover para o topo
            </BarButton>
            <BarButton onClick={() => reorderVisible(moveSelectionTo(visible, selectedVisible, "bottom"))}>
              Mover para o fim
            </BarButton>
            <BarButton onClick={() => setSelected(new Set())}>Limpar seleção</BarButton>
            <span className="font-helvetica text-[12px] text-brand-fg-subtle">
              Arraste qualquer um dos selecionados para levar o grupo todo.
            </span>
          </div>
        ) : null}
      </div>

      {/* Filtros (2026-11-09). */}
      <div className="mt-[18px] grid grid-cols-1 items-end gap-[12px] sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
        <Field label="Buscar" htmlFor="ordem-busca" errorId="ordem-busca-erro">
          <input
            id="ordem-busca"
            type="search"
            value={filters.search}
            onChange={(event) => changeFilters({ search: event.target.value })}
            placeholder="Nome do produto"
            maxLength={80}
            className={cn(fieldSurface(), "h-[50px] rounded-full")}
          />
        </Field>
        <SelectField
          label="Servidor"
          value={filters.server}
          onValueChange={(server: string) => changeFilters({ server })}
          options={[
            { value: ALL, label: "Todos os servidores" },
            ...servers.map((server) => ({ value: server.id, label: server.label })),
            ...(hasNoServer ? [{ value: NONE, label: "Sem servidor" }] : []),
          ]}
        />
        <SelectField
          label="Categoria"
          value={filters.category}
          onValueChange={(category: string) => changeFilters({ category, subcategory: ALL })}
          options={[
            { value: ALL, label: "Todas as categorias" },
            ...roots.map((category) => ({ value: category.id, label: category.label })),
            ...(hasNoCategory ? [{ value: NONE, label: "Sem categoria" }] : []),
          ]}
        />
        <SelectField
          label="Subcategoria"
          value={filters.subcategory}
          disabled={children.length === 0}
          onValueChange={(subcategory: string) => changeFilters({ subcategory })}
          options={[
            { value: ALL, label: children.length ? "Todas as subcategorias" : "Escolha uma categoria" },
            ...children.map((category) => ({ value: category.id, label: category.label })),
          ]}
        />
        <div className="flex flex-wrap gap-[8px]">
          <BarButton onClick={() => setSelected(new Set(visible))} disabled={visible.length === 0}>
            Selecionar {filtered ? "filtrados" : "todos"}
          </BarButton>
          {filtered ? <BarButton onClick={() => changeFilters(EMPTY_FILTERS)}>Limpar filtros</BarButton> : null}
        </div>
      </div>
      <p className="mt-[10px] pl-[4px] font-helvetica text-[12px] text-brand-fg-subtle">
        {scope ? (
          <>
            Organizando a ordem de <strong className="text-white">{categoryLabel(categories, scope)}</strong>: é a que
            o cliente vê ao filtrar por ela. A ordem da aba (sem categoria) não muda.
          </>
        ) : (
          <>
            Organizando a ordem da <strong className="text-white">aba inteira</strong>. Escolha uma categoria ou
            subcategoria para organizar a ordem própria dela.
          </>
        )}
        {filtered && (filters.search.trim() || filters.server !== ALL)
          ? " Busca e servidor só recortam: a ordem muda entre os filtrados e os outros ficam onde estão."
          : ""}
      </p>

      {visible.length === 0 ? (
        <p className="mt-[24px] rounded-2xl border border-white/10 px-4 py-6 text-center font-helvetica text-[14px] text-brand-fg-muted">
          Nenhum produto com esses filtros.
        </p>
      ) : (
        <DndContext
          id="product-order"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragCancel={() => setActiveId(null)}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={visible} strategy={rectSortingStrategy}>
            <ol className="mt-[24px] grid grid-cols-2 gap-[14px] md:grid-cols-4 xl:grid-cols-6">
              {visible.map((id, index) => {
                const product = byId.get(id);
                if (!product) return null;
                return (
                  <SortableTile
                    key={id}
                    product={product}
                    position={position.get(id) ?? index}
                    // Na lista de uma categoria, "organizado" é ter posição
                    // gravada NELA; o resto segue a ordem da aba.
                    ordered={categorySavedSet ? categorySavedSet.has(id) : product.ordered}
                    unorderedLabel={categorySavedSet ? "Aba" : "A–Z"}
                    index={index}
                    last={index === visible.length - 1}
                    lastIndex={visible.length - 1}
                    selected={selected.has(id)}
                    groupCount={id === activeId && dragging ? selectedVisible.size : 0}
                    faded={dragging && id !== activeId && selected.has(id)}
                    onToggle={(event) => toggle(id, event)}
                    onMove={(to) => move(index, to)}
                  />
                );
              })}
            </ol>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function BarButton({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-[36px] rounded-full border border-white/15 px-[14px] font-poppins text-[12px] font-bold text-white/85 transition-colors hover:border-brand-orange/60 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** Nome da categoria aberta ("Armas › Chaves" para subcategoria). */
function categoryLabel(categories: readonly OrderCategory[], id: string): string {
  const category = categories.find((item) => item.id === id);
  if (!category) return "esta categoria";
  const parent = category.parentId ? categories.find((item) => item.id === category.parentId) : undefined;
  return parent ? `${parent.label} › ${category.label}` : category.label;
}

function SortableTile({
  product,
  position,
  ordered,
  unorderedLabel,
  index,
  last,
  lastIndex,
  selected,
  groupCount,
  faded,
  onToggle,
  onMove,
}: {
  product: OrderableProduct;
  /** Posição REAL na lista aberta (aba ou categoria, 0-based), com ou sem recorte. */
  position: number;
  /** Já tem posição gravada na lista aberta. */
  ordered: boolean;
  /** Etiqueta de quem ainda não foi organizado ("A–Z" na aba, "Aba" na categoria). */
  unorderedLabel: string;
  /** Posição na lista visível (para os botões ←/→/topo). */
  index: number;
  last: boolean;
  /** Índice do último da lista visível (botão "fim", 2026-11-09). */
  lastIndex: number;
  selected: boolean;
  /** Arrastando um grupo: quantos vão junto (mostrado no card que se move). */
  groupCount: number;
  /** Os outros selecionados enquanto o grupo é arrastado. */
  faded: boolean;
  onToggle: (event: { shiftKey?: boolean }) => void;
  onMove: (to: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: product.id,
  });
  const image = productImage(product.imageUrl ?? null);
  const firstRow = position < ROW;

  // Ctrl/⌘+clique e Shift+clique no card também selecionam (o arrasto só
  // começa com 6px de movimento, então o clique chega aqui).
  function handleClick(event: MouseEvent) {
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      event.preventDefault();
      onToggle({ shiftKey: event.shiftKey });
    }
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative flex flex-col rounded-[18px] border bg-brand-surface p-[10px] transition-opacity",
        selected ? "border-brand-orange ring-2 ring-brand-orange/50" : firstRow ? "border-brand-orange/60" : "border-white/10",
        isDragging && "z-10 shadow-[0_16px_40px_rgba(0,0,0,.6)]",
        faded && "opacity-40",
      )}
    >
      {groupCount > 1 ? (
        <span className="absolute -top-[10px] -right-[10px] z-20 rounded-full bg-brand-orange px-[10px] py-[3px] font-poppins text-[12px] font-bold text-black shadow">
          {groupCount} produtos
        </span>
      ) : null}

      {/* A ALÇA é o card inteiro menos os botões: arrastar de qualquer ponto,
          e os botões continuam clicáveis (o sensor exige 6px de movimento). */}
      <div
        {...attributes}
        {...listeners}
        onClick={handleClick}
        aria-label={`${product.name}, posição ${position + 1}. Espaço para pegar, setas para mover.`}
        className="flex cursor-grab touch-none flex-col gap-[8px] outline-none select-none active:cursor-grabbing focus-visible:rounded-[12px] focus-visible:ring-2 focus-visible:ring-brand-orange"
      >
        <div className="flex items-center justify-between gap-[6px]">
          <span
            className={cn(
              "rounded-full px-[8px] py-[2px] font-poppins text-[12px] font-bold",
              firstRow ? "bg-brand-orange text-black" : "bg-white/10 text-white/80",
            )}
          >
            #{position + 1}
          </span>
          {firstRow ? (
            <span className="font-poppins text-[10px] font-bold tracking-[0.1px] text-brand-orange">1ª FILEIRA</span>
          ) : !ordered ? (
            <span
              className="font-helvetica text-[10px] text-brand-fg-subtle"
              title={
                unorderedLabel === "A–Z"
                  ? "Ainda não organizado: está em ordem alfabética"
                  : "Ainda não organizado nesta categoria: segue a ordem da aba"
              }
            >
              {unorderedLabel}
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

      {/* Caixa de seleção FORA da alça: clicar nela nunca começa arrasto. */}
      <label className="absolute top-[44px] left-[16px] z-10 flex size-[26px] cursor-pointer items-center justify-center rounded-[8px] border border-white/30 bg-black/70 backdrop-blur-sm">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => undefined}
          onClick={(event) => onToggle({ shiftKey: event.shiftKey })}
          aria-label={`Selecionar ${product.name}`}
          className="size-[16px] cursor-pointer accent-[var(--brand-orange,#ff7300)]"
        />
      </label>

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
        {/* "fim" (2026-11-09, pedido do usuário): o par do "topo". Com filtro,
            vai para o último lugar entre os filtrados, como o "topo". */}
        <TileButton onClick={() => onMove(lastIndex)} disabled={last} label="Levar para o fim">
          fim
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
