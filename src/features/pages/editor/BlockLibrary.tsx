"use client";

import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import { BLOCKS, LIBRARY_TYPES, createBlock } from "../catalog";
import type { Block } from "../types";

/**
 * "+ Adicionar bloco": os tipos novos e, à parte, as SEÇÕES DO DESENHO que não
 * estão na página (cada uma só pode aparecer uma vez — o backend recusa
 * repetida). O bloco entra logo DEPOIS do selecionado, ou no fim.
 *
 * Moldura única das camadas flutuantes do projeto (raio 20, `bg-brand-surface`).
 */
export function BlockLibrary({
  blocks,
  legacyKeys,
  legacyLabels,
  onAdd,
}: {
  blocks: Block[];
  /** Seções do desenho DESTA página (a biblioteca oferece as que faltam). */
  legacyKeys: readonly string[];
  legacyLabels: Record<string, string>;
  onAdd: (block: Block) => void;
}) {
  const [open, setOpen] = useState(false);
  const usedLegacy = new Set(blocks.flatMap((block) => (block.type === "secao" ? [block.props.key] : [])));
  const missingLegacy = legacyKeys.filter((key) => !usedLegacy.has(key));

  function add(block: Block) {
    onAdd(block);
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="flex h-[42px] w-full items-center justify-center gap-[8px] rounded-[14px] border border-dashed border-white/25 font-poppins text-[13px] font-bold text-white transition-colors hover:border-brand-orange hover:bg-brand-orange/5">
        + Adicionar seção
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={8}
          // Sem devolver o foco ao botão ao fechar: o navegador rolava a TELA
          // inteira até ele (fica no fim da lista), e o bloco recém-criado já
          // está selecionado com o formulário aberto — é lá que o foco importa.
          onCloseAutoFocus={(event) => event.preventDefault()}
          className="z-50 max-h-[70dvh] w-[340px] overflow-y-auto rounded-[20px] border border-brand-border bg-brand-surface p-[8px] shadow-[0_16px_40px_rgba(0,0,0,.5)]"
        >
          <p className="px-[10px] pt-[6px] pb-[4px] font-poppins text-[11px] font-bold tracking-[1px] text-brand-fg-subtle uppercase">
            Blocos
          </p>
          {LIBRARY_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => add(createBlock(type))}
              className="flex w-full items-start gap-[10px] rounded-[12px] px-[10px] py-[9px] text-left hover:bg-white/5"
            >
              <span>
                <span className="block font-poppins text-[14px] text-white">{BLOCKS[type].label}</span>
                <span className="block font-poppins text-[12px] text-brand-fg-subtle">{BLOCKS[type].description}</span>
              </span>
            </button>
          ))}

          {missingLegacy.length > 0 ? (
            <>
              <p className="mt-[6px] border-t border-white/10 px-[10px] pt-[10px] pb-[4px] font-poppins text-[11px] font-bold tracking-[1px] text-brand-fg-subtle uppercase">
                Seções do desenho
              </p>
              {missingLegacy.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => add(createBlock("secao", { key }))}
                  className="flex w-full items-center gap-[10px] rounded-[12px] px-[10px] py-[9px] text-left hover:bg-white/5"
                >
                  <span className="font-poppins text-[14px] text-white">{legacyLabels[key] ?? key}</span>
                </button>
              ))}
            </>
          ) : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
