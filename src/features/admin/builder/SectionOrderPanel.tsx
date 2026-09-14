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
import {
  DEFAULT_SECTION_ORDER,
  GAME_SECTIONS,
  sectionDef,
  type GameSectionKey,
} from "@/features/game/sections";

/**
 * Trava o arrasto no eixo vertical.
 *
 * É o que `@dnd-kit/modifiers` chama de `restrictToVerticalAxis`, escrito à mão
 * — um modificador é só uma função que devolve a transformação ajustada, e
 * instalar um pacote inteiro para zerar um número seria dependência por
 * conveniência. Numa lista de uma coluna, deixar o bloco vagar na horizontal só
 * dá a impressão de que ele pode ser solto em algum outro lugar.
 */
const onlyVertical: Modifier = ({ transform }) => ({ ...transform, x: 0 });

/**
 * Etapa 10 — "Ordem da página": arrastar os blocos e ligar/desligar cada um.
 *
 * NÃO está no arquivo do Figma (3883:2153), que desenha nove etapas. Entrou
 * porque o usuário pediu personalização total — "tenho que poder arrastar a
 * lista de produtos pra cima do banner principal".
 *
 * ── Por que arrastar AQUI e não dentro da pré-visualização ─────────────────
 * A maquete é desenhada em medidas reais e reduzida por `transform: scale()`.
 * O dnd-kit calcula distância em pixels de tela, e dentro de um elemento
 * escalado o ponteiro anda 0,626px para cada pixel que o cursor percorre — o
 * bloco "foge" do cursor e a soltura cai no lugar errado. Corrigir isso pede
 * medir a escala e reprojetar cada coordenada, para ganhar um arrasto pior do
 * que o de uma lista.
 *
 * O resultado aparece na pré-visualização assim que se solta.
 *
 * ── Arrasto E botões ───────────────────────────────────────────────────────
 * Cada linha tem ↑ e ↓ além da alça. O `KeyboardSensor` do dnd-kit está
 * registrado e o espaço PEGA o item — mas as setas não moveram nos testes, e
 * publicar um caminho de teclado que eu não consegui ver funcionando seria
 * prometer acessibilidade sem entregá-la. Os dois botões trocam vizinhos e
 * funcionam sempre; é o mesmo par que o `ListPanel` já usa aqui ao lado.
 *
 * ── A ordem é a lista dos VISÍVEIS ─────────────────────────────────────────
 * Desligar um bloco tira ele do `sectionOrder`; ligar devolve. Assim ordem e
 * visibilidade são um campo só e não podem discordar entre si. Um bloco
 * desligado continua listado aqui embaixo, para poder voltar — o que não
 * existe é ele na lista que vai para o banco.
 */
export function SectionOrderPanel({
  order,
  onChange,
}: {
  /** Blocos VISÍVEIS, na ordem. */
  order: GameSectionKey[];
  onChange: (next: GameSectionKey[]) => void;
}) {
  const hidden = GAME_SECTIONS.filter((section) => !order.includes(section.key));
  const isDefault =
    order.length === DEFAULT_SECTION_ORDER.length &&
    order.every((key, index) => key === DEFAULT_SECTION_ORDER[index]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // 6px de folga antes de virar arrasto: sem isso, o clique no botão de
      // ligar/desligar dentro da linha seria engolido como início de arrasto.
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /**
   * O que o leitor de tela fala durante o arrasto.
   *
   * O dnd-kit tem textos padrão, e eles são em INGLÊS e citam a CHAVE do item
   * ("Draggable item banner was moved…") — num produto em português, para uma
   * pessoa que só ouve a tela, isso é ruído. Aqui eles falam o rótulo do bloco
   * e a posição, que é a informação que importa quando não se enxerga a lista.
   */
  const announcements = {
    onDragStart: ({ active }: { active: { id: string | number } }) =>
      `Pegou ${labelOf(active.id)}. Use as setas para mover e espaço para soltar.`,
    onDragOver: ({ over }: { over: { id: string | number } | null }) =>
      over ? `Sobre ${labelOf(over.id)}.` : undefined,
    onDragEnd: ({ over }: { over: { id: string | number } | null }) =>
      over ? `Soltou em ${labelOf(over.id)}.` : "Arrasto cancelado.",
    onDragCancel: () => "Arrasto cancelado.",
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = order.indexOf(active.id as GameSectionKey);
    const to = order.indexOf(over.id as GameSectionKey);
    if (from < 0 || to < 0) return;

    onChange(arrayMove(order, from, to));
  }

  function show(key: GameSectionKey) {
    // Volta para a posição PADRÃO dele, não para o fim da lista: religar o
    // banner e encontrá-lo embaixo do FAQ seria uma surpresa a cada vez.
    const next = [...order, key].sort(
      (a, b) => positionOf(a, order) - positionOf(b, order),
    );
    onChange(next);
  }

  function hide(key: GameSectionKey) {
    onChange(order.filter((current) => current !== key));
  }

  /**
   * Mover um passo, por BOTÃO.
   *
   * Existe ao lado do arrasto, e não em vez dele. O arrasto do dnd-kit tem um
   * sensor de teclado, mas ele depende de foco, de sequência de teclas e de
   * cálculo de colisão — coisas que não consegui provar funcionando aqui. Dois
   * botões que trocam vizinhos funcionam para teclado, leitor de tela e para
   * quem só quer mover uma posição sem mirar. É o mesmo par de setas que o
   * `ListPanel` deste builder já usa nas listas de servidor e categoria.
   */
  function move(key: GameSectionKey, direction: -1 | 1) {
    const index = order.indexOf(key);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= order.length) return;
    onChange(arrayMove(order, index, target));
  }

  return (
    <>
      <DndContext
        accessibility={{ announcements }}
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[onlyVertical]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-[10px]">
            {order.map((key, index) => (
              <SortableRow
                key={key}
                sectionKey={key}
                position={index + 1}
                total={order.length}
                onHide={() => hide(key)}
                onMove={(direction) => move(key, direction)}
                canHide={order.length > 1}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {hidden.length > 0 ? (
        <div>
          <p className="font-poppins text-[13px] font-bold text-brand-fg-subtle">
            Escondidos da página
          </p>
          <ul className="mt-[10px] flex flex-col gap-[10px]">
            {hidden.map((section) => (
              <li
                key={section.key}
                className="flex h-[56px] items-center gap-[15px] rounded-[12px] border border-dashed border-white/15 px-[15px] opacity-60"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-poppins text-[14px] font-bold text-white">
                    {section.label}
                  </span>
                  <span className="block truncate font-poppins text-[12px] text-brand-fg-subtle">
                    {section.hint}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => show(section.key)}
                  className="h-[36px] shrink-0 rounded-full border border-white/15 px-[18px] font-poppins text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                >
                  Mostrar
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-[15px]">
        <p className="max-w-[520px] font-poppins text-[13px] text-brand-fg-subtle">
          Arraste pela alça (⠿) ou use os botões ↑ e ↓ para mover uma posição. A
          pré-visualização mostra o resultado na hora — nada é publicado até
          apertar “SALVAR E PUBLICAR PAGE”.
        </p>

        {/*
          Volta à ordem do arquivo do Figma, com todos os blocos visíveis.

          Sem ele, desfazer uma bagunça significaria arrastar bloco a bloco até
          acertar de novo a ordem original — e religar um a um os escondidos, que
          é a parte que dá mais trabalho.

          Grava a lista completa, e não a lista vazia que o banco também aceita
          como "não personalizado": as duas produzem exatamente a mesma página
          (`resolveSectionOrder`), e a explícita é a que se lê no banco sem
          precisar saber da convenção.
        */}
        <button
          type="button"
          onClick={() => onChange([...DEFAULT_SECTION_ORDER])}
          disabled={isDefault}
          className="h-[40px] shrink-0 rounded-full border border-white/15 px-[22px] font-poppins text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Voltar à ordem padrão
        </button>
      </div>

      {order.includes("catalog") ? null : (
        <p
          role="alert"
          className="rounded-[12px] border border-brand-orange/40 bg-brand-orange/10 px-[20px] py-[15px] font-poppins text-[13px] text-white"
        >
          A lista de produtos está escondida — a loja deste game vai abrir sem
          nada para comprar. É permitido, mas raramente é o que se quer.
        </p>
      )}
    </>
  );
}

/** Rótulo de um bloco para os anúncios, com reserva para chave inesperada. */
function labelOf(id: string | number): string {
  return sectionDef(String(id))?.label ?? String(id);
}

function SortableRow({
  sectionKey,
  position,
  total,
  onHide,
  onMove,
  canHide,
}: {
  sectionKey: GameSectionKey;
  position: number;
  total: number;
  onHide: () => void;
  onMove: (direction: -1 | 1) => void;
  canHide: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sectionKey });
  const section = sectionDef(sectionKey);
  if (!section) return null;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`flex h-[56px] items-center gap-[15px] rounded-[12px] border px-[15px] ${
        isDragging
          ? "z-10 border-brand-orange/60 bg-brand-orange/10"
          : "border-white/10 bg-[image:var(--brand-surface-fill)]"
      }`}
    >
      {/*
        A alça é o que recebe os `listeners`, e não a linha inteira: com a linha
        arrastável, selecionar o texto do rótulo viraria um arrasto. E ela é um
        `<button>` de verdade — é assim que o dnd-kit entrega o arrasto por
        teclado (espaço para pegar, setas para mover, espaço para soltar).
      */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reordenar ${section.label}`}
        className="flex size-[36px] shrink-0 cursor-grab items-center justify-center rounded-[8px] border border-white/10 bg-black/40 text-brand-fg-subtle active:cursor-grabbing"
      >
        ⠿
      </button>

      <span
        aria-hidden
        className="w-[20px] shrink-0 text-center font-poppins text-[13px] font-bold text-brand-fg-subtle"
      >
        {position}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate font-poppins text-[14px] font-bold text-white">
          {section.label}
        </span>
        <span className="block truncate font-poppins text-[12px] text-brand-fg-subtle">
          {section.hint}
        </span>
      </span>

      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={position === 1}
        aria-label={`Mover ${section.label} para cima`}
        className="flex size-[36px] shrink-0 items-center justify-center rounded-[8px] border border-white/10 bg-black/40 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={position === total}
        aria-label={`Mover ${section.label} para baixo`}
        className="flex size-[36px] shrink-0 items-center justify-center rounded-[8px] border border-white/10 bg-black/40 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
      >
        ↓
      </button>

      <button
        type="button"
        onClick={onHide}
        disabled={!canHide}
        className="h-[36px] shrink-0 rounded-full border border-white/15 px-[18px] font-poppins text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
        title={canHide ? undefined : "A página precisa de ao menos um bloco visível."}
      >
        Esconder
      </button>
    </li>
  );
}

/**
 * Onde um bloco entra ao ser religado.
 *
 * Usa a ordem PADRÃO como referência para quem já está na lista manter a
 * posição relativa que tem, e o que volta cair perto de onde nasceria. Não é
 * perfeito quando a lista foi muito embaralhada — e não precisa ser: depois de
 * religar, arrastar para o lugar exato é um gesto.
 */
function positionOf(key: GameSectionKey, current: GameSectionKey[]): number {
  const inCurrent = current.indexOf(key);
  if (inCurrent >= 0) {
    // Quem já está na lista mantém a ordem atual, com folga entre os índices
    // para o recém-chegado poder cair entre dois.
    return inCurrent * 100;
  }
  const defaultIndex = DEFAULT_SECTION_ORDER.indexOf(key);
  // O recém-chegado se posiciona pela vizinhança padrão: fica logo depois do
  // último bloco que, na ordem do arquivo, vem antes dele.
  const predecessors = current.filter(
    (other) => DEFAULT_SECTION_ORDER.indexOf(other) < defaultIndex,
  );
  return predecessors.length * 100 - 1;
}
