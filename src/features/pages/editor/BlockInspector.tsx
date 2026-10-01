"use client";

import { SelectField } from "@/components/ui/SelectField";
import type { SectionContent } from "@/features/site/list";
import { sectionKey, sitePage } from "@/features/site/sections";
import Link from "next/link";
import { BLOCKS } from "../catalog";
import type { BlocksPageDef } from "../registry";
import type { Block, BlockSpacing } from "../types";
import { BlockField, type EditorGame } from "./fields";
import { LegacySectionPanel } from "./LegacySectionPanel";

const SPACING_OPTIONS = [
  { value: "sm", label: "Pequeno" },
  { value: "md", label: "Médio" },
  { value: "lg", label: "Grande" },
];

/**
 * O formulário do bloco selecionado — montado a partir dos `fields` do
 * catálogo. Cada tecla altera o rascunho em memória: a prévia muda na hora e
 * o salvamento automático grava depois de uma pausa.
 */
export function BlockInspector({
  block,
  games,
  page,
  sections,
  onChange,
  onClose,
  onLegacySaved,
}: {
  block: Block;
  games: EditorGame[];
  /** A página em edição — diz onde vive o conteúdo das seções do desenho. */
  page: BlocksPageDef;
  /** Conteúdo salvo das seções do desenho, para o painel de `secao`. */
  sections: SectionContent[];
  onChange: (block: Block) => void;
  onClose: () => void;
  onLegacySaved: (key: string, content: SectionContent | null) => void;
}) {
  const def = BLOCKS[block.type];
  const props = block.props as Record<string, unknown>;

  function setProp(name: string, value: unknown) {
    const next = { ...props };
    if (value === undefined) delete next[name];
    else next[name] = value;
    // Trocar o JOGO zera a aba e a categoria: são de UM jogo só, e manter as do
    // anterior filtraria por algo que o jogo novo não tem.
    if (value !== props[name]) {
      for (const field of def.fields) {
        if ((field.kind === "tab" || field.kind === "category") && field.gameField === name) delete next[field.name];
      }
    }
    onChange({ ...block, props: next } as Block);
  }

  return (
    <div className="flex flex-col gap-[20px]">
      <div className="flex items-start justify-between gap-[10px]">
        <div>
          <p className="font-poppins text-[11px] font-bold tracking-[1px] text-brand-fg-subtle uppercase">
            {def.label}
          </p>
          <h2 className="mt-[4px] font-helvetica text-[18px] font-bold text-white">
            {block.type === "secao" ? (page.legacyLabels[block.props.key] ?? block.props.key) : "Editar bloco"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar formulário do bloco"
          className="rounded-[8px] px-[8px] py-[4px] font-poppins text-[13px] text-white/60 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      {block.type === "secao" ? (
        (() => {
          // Página de jogo: o conteúdo das seções é do Builder de jogo (banner,
          // logo, abas, servidores, descrição…) — aqui só a ordem.
          if (page.content.kind === "gameBuilder") {
            return (
              <div className="flex flex-col gap-[12px] rounded-[16px] border border-brand-border bg-black/30 p-[16px] font-poppins text-[13px] leading-[20px] text-brand-fg-muted">
                <p>
                  Seção da página do jogo. Aqui você a move, esconde ou remove; o conteúdo dela (artes, textos,
                  servidores, categorias) é editado no Builder do jogo.
                </p>
                <Link
                  href={`/admin/builder/${page.content.gameId}`}
                  className="inline-flex h-[36px] w-fit items-center rounded-full bg-[image:var(--brand-orange-gradient)] px-[16px] text-[12px] font-bold text-white"
                >
                  Abrir o Builder do jogo
                </Link>
              </div>
            );
          }
          const catalogPage = page.content.catalogPage;
          const fullKey = sectionKey(catalogPage, block.props.key);
          const sectionDef = sitePage(catalogPage)?.sections.find((item) => item.key === block.props.key);
          if (!sectionDef) {
            return (
              <p className="font-poppins text-[13px] text-brand-fg-subtle">
                O conteúdo desta seção vem da conta de quem acessa, então não há o que editar por aqui.
              </p>
            );
          }
          return (
            <LegacySectionPanel
              key={fullKey}
              fullKey={fullKey}
              def={sectionDef}
              content={sections.find((item) => item.key === fullKey)}
              games={games.map(({ id, name, slug }) => ({ id, name, slug }))}
              onSaved={(content) => onLegacySaved(fullKey, content)}
            />
          );
        })()
      ) : (
        <>
          {def.fields.map((spec) => (
            <BlockField
              key={spec.name}
              spec={spec}
              value={props[spec.name]}
              props={props}
              games={games}
              onChange={(value) => setProp(spec.name, value)}
            />
          ))}

          <div className="border-t border-white/10 pt-[18px]">
            <SelectField
              label="Espaço acima do bloco"
              options={SPACING_OPTIONS}
              value={block.spacing ?? "md"}
              onValueChange={(value) => onChange({ ...block, spacing: value as BlockSpacing } as Block)}
            />
          </div>
        </>
      )}
    </div>
  );
}
