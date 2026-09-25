"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { GameOption } from "@/features/site/sections";
import { cn } from "@/lib/cn";

/**
 * Barrinha que aparece ancorada ao item clicado, com o que fazer com ELE:
 * mover na lista, acrescentar outro depois e remover.
 *
 * ── Por que flutua, e não vive dentro do card ─────────────────────────────
 * O card é o componente da LOJA. Botão de editor dentro dele viajaria para o
 * navegador de todo visitante — a mesma razão de os campos serem só um atributo
 * no HTML. Aqui a barrinha é do editor, posicionada em coordenadas de tela
 * sobre o item.
 *
 * ── Remover pede confirmação NA PRÓPRIA barrinha ───────────────────────────
 * Sem `window.confirm`: um diálogo do navegador trava a página e, nas telas do
 * painel, é justamente o tipo de modal que atrapalha automação e leitor de
 * tela. O ✕ vira "Remover?" com Sim/Não.
 */
export type ItemSelection = {
  sectionKey: string;
  id: string;
  /** Nome do que a seção contém, no singular ("review", "membro"). */
  itemLabel: string;
  /** Posição (1..n) e total, para mostrar "2 de 5" e desabilitar as pontas. */
  index: number;
  total: number;
  /** Onde desenhar, em coordenadas de tela. */
  rect: { top: number; left: number; width: number };
  /**
   * Qual arte foi clicada, quando o clique caiu numa. Trocar a imagem é um
   * BOTÃO daqui, e não o próprio clique: abrir o seletor de arquivo do sistema
   * quando a pessoa só queria mover o card era um susto a cada clique.
   */
  imageField?: "image" | "secondaryImage";
};

export function ItemToolbar({
  selection,
  busy,
  confirmingRemove,
  games,
  onPickGame,
  onMove,
  onChangeImage,
  onAdd,
  onAskRemove,
  onConfirmRemove,
  onCancel,
}: {
  selection: ItemSelection;
  busy: boolean;
  confirmingRemove: boolean;
  /**
   * Jogos cadastrados — só para itens de sessão com seletor de jogo (slides do
   * hero). Ausente = o botão "jogo" não aparece.
   */
  games?: GameOption[];
  onPickGame?: (gameId: string) => void;
  onMove: (direction: -1 | 1) => void;
  onChangeImage: () => void;
  onAdd: () => void;
  onAskRemove: () => void;
  onConfirmRemove: () => void;
  onCancel: () => void;
}) {
  const { rect, index, total, itemLabel } = selection;

  return (
    <div
      role="toolbar"
      aria-label={`Ações do ${itemLabel}`}
      className="fixed z-50 flex items-center gap-[6px] rounded-full border border-brand-border bg-brand-surface/95 px-[8px] py-[6px] shadow-[0_10px_30px_rgba(0,0,0,.5)] backdrop-blur-[10px]"
      style={{
        // Acima do item; se ele estiver colado no topo da janela, a barra desce
        // para dentro dela em vez de sair de vista.
        top: Math.max(8, rect.top - 46),
        left: Math.max(8, rect.left),
      }}
    >
      {confirmingRemove ? (
        <>
          <span className="px-[6px] font-poppins text-[12px] text-white">Remover {itemLabel}?</span>
          <ToolbarButton onClick={onConfirmRemove} disabled={busy} tone="danger">
            Sim
          </ToolbarButton>
          <ToolbarButton onClick={onCancel} disabled={busy}>
            Não
          </ToolbarButton>
        </>
      ) : (
        <>
          <span className="px-[6px] font-helvetica text-[11px] whitespace-nowrap text-brand-fg-subtle">
            {itemLabel} {index + 1} de {total}
          </span>
          <ToolbarButton onClick={() => onMove(-1)} disabled={busy || index === 0} label="Mover para antes">
            ←
          </ToolbarButton>
          <ToolbarButton
            onClick={() => onMove(1)}
            disabled={busy || index === total - 1}
            label="Mover para depois"
          >
            →
          </ToolbarButton>
          {games && onPickGame ? (
            <GamePicker games={games} disabled={busy} onPick={onPickGame} />
          ) : null}
          {selection.imageField ? (
            <ToolbarButton onClick={onChangeImage} disabled={busy} label="Trocar a imagem">
              trocar imagem
            </ToolbarButton>
          ) : null}
          <ToolbarButton onClick={onAdd} disabled={busy} label={`Adicionar ${itemLabel}`}>
            + novo
          </ToolbarButton>
          <ToolbarButton onClick={onAskRemove} disabled={busy} tone="danger" label={`Remover ${itemLabel}`}>
            ✕
          </ToolbarButton>
        </>
      )}
    </div>
  );
}

/**
 * "jogo ▾": troca o jogo do slide entre os CADASTRADOS — nome e link vêm dele,
 * então não há o que digitar. Moldura única das camadas flutuantes do projeto
 * (raio 20, `bg-brand-surface`, itens raio 12 com realce `white/5`).
 */
function GamePicker({
  games,
  disabled,
  onPick,
}: {
  games: GameOption[];
  disabled: boolean;
  onPick: (gameId: string) => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        disabled={disabled}
        aria-label="Escolher o jogo"
        title="Escolher o jogo"
        className="h-[26px] rounded-full px-[10px] font-poppins text-[12px] text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        jogo ▾
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={6}
          className="z-[60] max-h-[320px] min-w-[220px] overflow-y-auto rounded-[20px] border border-brand-border bg-brand-surface p-[8px] shadow-[0_16px_40px_rgba(0,0,0,.5)]"
        >
          {games.length === 0 ? (
            <p className="px-[12px] py-[8px] font-poppins text-[13px] text-brand-fg-subtle">
              Nenhum jogo cadastrado.
            </p>
          ) : (
            games.map((game) => (
              <DropdownMenu.Item
                key={game.id}
                onSelect={() => onPick(game.id)}
                className="cursor-pointer rounded-[12px] px-[12px] py-[8px] font-poppins text-[14px] text-white outline-none data-[highlighted]:bg-white/5"
              >
                {game.name}
                <span className="ml-[8px] text-[12px] text-brand-fg-subtle">/games/{game.slug}</span>
              </DropdownMenu.Item>
            ))
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function ToolbarButton({
  children,
  onClick,
  disabled,
  tone,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "danger";
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "h-[26px] rounded-full px-[10px] font-poppins text-[12px] transition-colors",
        tone === "danger"
          ? "text-red-9 hover:bg-red-9/15"
          : "text-white/80 hover:bg-white/10 hover:text-white",
        "disabled:cursor-not-allowed disabled:opacity-40",
      )}
    >
      {children}
    </button>
  );
}
