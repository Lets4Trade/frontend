"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { HomeBackdrop } from "@/features/home/HomeBackdrop";
import { cn } from "@/lib/cn";
import { composeBlocks, type ComposedBlock, type LegacyNodes } from "../compose";
import { BlockColumn, GameFrame, NarrowFrame, WideFrame } from "../frames";
import { GAME_LEGACY_GAP, type PageFrame } from "../registry";
import { EMPTY_REFS, type Block, type PageRefs } from "../types";
import { isEditorMessage, type PreviewToEditor } from "./protocol";

/**
 * O miolo da prévia: a mesma moldura da home (coluna mobile + coluna desktop
 * de 1820), com os blocos do RASCUNHO que o editor manda por mensagem.
 *
 * As sessões do desenho (`secao`) chegam PRONTAS do servidor em `legacy*` — o
 * cliente não saberia montá-las (leem banco). Os blocos novos são desenhados
 * aqui, e mudam a cada tecla no editor sem salvar nada.
 *
 * Clique num bloco SELECIONA (o editor abre o formulário dele) e nunca navega.
 */
export function PreviewCanvas({
  frame = "home",
  legacyDesktop,
  legacyMobile,
  initialBlocks,
}: {
  /** Moldura da página real (fase 4): a prévia desenha como a loja desenha. */
  frame?: PageFrame;
  legacyDesktop: LegacyNodes;
  /** Só a home tem versão separada de celular. */
  legacyMobile?: LegacyNodes;
  /** O rascunho salvo — desenhado até o editor mandar o estado vivo. */
  initialBlocks: Block[];
}) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [refs, setRefs] = useState<PageRefs>(EMPTY_REFS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || !isEditorMessage(event.data)) return;
      setBlocks(event.data.blocks);
      setRefs(event.data.refs);
      setSelectedId(event.data.selectedId);
    }
    window.addEventListener("message", onMessage);
    post({ source: "l4t-preview", type: "ready" });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Rola até o bloco escolhido no editor — em página longa ele estaria fora de vista.
  useEffect(() => {
    if (!selectedId) return;
    const visible = [...document.querySelectorAll<HTMLElement>(`[data-block-id="${CSS.escape(selectedId)}"]`)].find(
      (el) => el.offsetParent !== null,
    );
    if (!visible) return;
    // `window.scrollTo` e NÃO `scrollIntoView`: este rola também os ancestrais
    // FORA do iframe (mesma origem) — a tela inteira do editor pulava junto.
    const rect = visible.getBoundingClientRect();
    const top = window.scrollY + rect.top - Math.max(0, (window.innerHeight - rect.height) / 2);
    // Instantâneo: a rolagem suave era interrompida pelo carregamento das
    // artes da página e parava no meio do caminho (medido: 125 de ~1900px).
    window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
  }, [selectedId]);

  const legacyGap = frame === "game" ? GAME_LEGACY_GAP : undefined;
  const desktop = composeBlocks(blocks, refs, legacyDesktop, { mobile: false, legacyGap });
  const mobile = composeBlocks(blocks, refs, legacyMobile ?? legacyDesktop, { mobile: true, legacyGap });

  function onClickCapture(event: MouseEvent<HTMLElement>) {
    // Nada navega dentro da prévia: link, botão de carrinho, card de jogo.
    event.preventDefault();
    event.stopPropagation();
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-block-id]");
    if (target?.dataset.blockId) post({ source: "l4t-preview", type: "select", id: target.dataset.blockId });
  }

  const empty = blocks.filter((block) => !block.hidden).length === 0 ? (
    <p className="px-[25px] py-[80px] text-center font-poppins text-[16px] text-brand-fg-subtle">
      A página está vazia. Adicione um bloco no painel ao lado.
    </p>
  ) : null;

  // Páginas de coluna única (venda, fidelidade, jogo): a moldura da página real
  // e os blocos com o mesmo vão responsivo dela.
  if (frame !== "home") {
    const column = (
      <BlockColumn
        items={desktop}
        renderItem={(item, style, className) => (
          <BlockFrame key={item.key} id={item.key} selected={item.key === selectedId} style={style} className={className}>
            {item.node}
          </BlockFrame>
        )}
      />
    );
    return (
      <main className="flex flex-1 flex-col" onClickCapture={onClickCapture}>
        {frame === "narrow" ? <NarrowFrame>{column}</NarrowFrame> : null}
        {frame === "wide" ? <WideFrame>{column}</WideFrame> : null}
        {frame === "game" ? <GameFrame>{column}</GameFrame> : null}
        {empty}
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col" onClickCapture={onClickCapture}>
      <div className="flex-1 overflow-x-clip px-[25px] pt-[20px] pb-[60px] lg:hidden">
        <div className="mx-auto max-w-[560px]">
          <Column items={mobile} selectedId={selectedId} />
        </div>
      </div>

      <div className="hidden flex-1 overflow-x-auto lg:block">
        <div className="relative mx-auto w-full max-w-[1920px] min-w-[1820px] overflow-x-clip">
          <HomeBackdrop />
          <div className="mx-auto w-[1820px] pt-[37px] pb-[100px]">
            <Column items={desktop} selectedId={selectedId} />
          </div>
        </div>
      </div>

      {empty}
    </main>
  );
}

function Column({ items, selectedId }: { items: ComposedBlock[]; selectedId: string | null }) {
  return (
    <>
      {items.map((item, index) => (
        <BlockFrame
          key={item.key}
          id={item.key}
          selected={item.key === selectedId}
          style={index === 0 ? undefined : { marginTop: item.gap }}
        >
          {item.node}
        </BlockFrame>
      ))}
    </>
  );
}

function BlockFrame({
  id,
  selected,
  style,
  className,
  children,
}: {
  id: string;
  selected: boolean;
  style?: React.CSSProperties;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-block-id={id}
      style={style}
      className={cn(
        className,
        "relative cursor-pointer rounded-[32px] outline-offset-[6px] transition-[outline-color]",
        selected ? "outline-2 outline-brand-orange outline-solid" : "outline-2 outline-transparent outline-solid hover:outline-white/25",
      )}
    >
      {children}
    </div>
  );
}

function post(message: PreviewToEditor) {
  if (window.parent !== window) window.parent.postMessage(message, window.location.origin);
}
