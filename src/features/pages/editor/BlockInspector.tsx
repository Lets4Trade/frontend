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
import { HOME_SHARED, isHomeSharedKey } from "../homeShared";
import { gameSectionTarget, type GameSectionLink } from "./gameSectionTarget";

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
          // Página de jogo (2026-10-09): cada seção leva ao lugar EXATO onde o
          // conteúdo dela mora — ou o edita aqui mesmo, quando é texto comum
          // dos jogos. Antes todas diziam "Abrir o Builder do jogo".
          if (page.content.kind === "gameBuilder") {
            const gameId = page.content.gameId;
            const target = gameSectionTarget(
              block.props.key,
              gameId,
              games.find((game) => game.id === gameId)?.slug,
            );
            if (target?.kind === "shared") {
              const defs = sitePage("games")?.sections ?? [];
              return (
                <div className="flex flex-col gap-[24px]">
                  <p className="font-poppins text-[12px] leading-[18px] text-brand-fg-muted">
                    Textos comuns: o que você salvar aqui aparece em TODAS as páginas de jogo.
                  </p>
                  {target.sectionKeys.map((key) => {
                    const sectionDef = defs.find((item) => item.key === key);
                    if (!sectionDef) return null;
                    const fullKey = sectionKey("games", key);
                    return (
                      <section key={fullKey} className="flex flex-col gap-[10px]">
                        {target.sectionKeys.length > 1 ? (
                          <h3 className="font-poppins text-[13px] font-bold text-white">{sectionDef.label}</h3>
                        ) : null}
                        <LegacySectionPanel
                          fullKey={fullKey}
                          def={sectionDef}
                          content={sections.find((item) => item.key === fullKey)}
                          games={games.map(({ id, name, slug }) => ({ id, name, slug }))}
                          onSaved={(content) => onLegacySaved(fullKey, content)}
                        />
                      </section>
                    );
                  })}
                  <TargetLinks links={target.links} />
                </div>
              );
            }
            if (target?.kind === "faq") {
              const defs = sitePage("games")?.sections ?? [];
              const panel = (key: string) => {
                const sectionDef = defs.find((item) => item.key === key);
                if (!sectionDef) return null;
                const fullKey = sectionKey("games", key);
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
              };
              return (
                <div className="flex flex-col gap-[24px]">
                  <div className="flex flex-col gap-[12px] rounded-[16px] border border-brand-orange/40 bg-brand-orange/5 p-[16px] font-poppins text-[13px] leading-[20px] text-brand-fg-muted">
                    <p>
                      Este bloco é a <strong className="text-white">descrição deste jogo</strong>: títulos, subtítulos e
                      textos que você monta no Builder.
                    </p>
                    <TargetLinks links={[{ label: "Editar descrição do jogo", href: target.descriptionHref }]} />
                  </div>
                  {target.orbsKey ? (
                    <section className="flex flex-col gap-[10px]">
                      <h3 className="font-poppins text-[13px] font-bold text-white">Dúvidas sobre Orbs</h3>
                      <p className="font-poppins text-[12px] leading-[18px] text-brand-fg-muted">
                        Aparece antes da descrição, só nos jogos de Path of Exile. Vale para todos eles.
                      </p>
                      {panel(target.orbsKey)}
                    </section>
                  ) : null}
                </div>
              );
            }
            if (target?.kind === "home") {
              return (
                <div className="flex flex-col gap-[12px] rounded-[16px] border border-brand-border bg-black/30 p-[16px] font-poppins text-[13px] leading-[20px] text-brand-fg-muted">
                  <p>Seção da home, com o mesmo conteúdo dela. Textos, imagens e itens são editados na Home.</p>
                  <TargetLinks links={[{ label: "Editar na Home", href: `/admin/paginas?pagina=home&secao=${target.source}` }]} />
                </div>
              );
            }
            return (
              <div className="flex flex-col gap-[12px] rounded-[16px] border border-brand-border bg-black/30 p-[16px] font-poppins text-[13px] leading-[20px] text-brand-fg-muted">
                <p>Aqui você move, esconde ou remove a seção. O conteúdo dela é editado em:</p>
                <TargetLinks
                  links={target?.links ?? [{ label: "Builder do jogo", href: `/admin/builder/${page.content.gameId}` }]}
                />
              </div>
            );
          }
          // Seção da HOME usada pronta: o conteúdo é o da home, e é lá que se edita.
          if (isHomeSharedKey(block.props.key)) {
            return (
              <div className="flex flex-col gap-[12px] rounded-[16px] border border-brand-border bg-black/30 p-[16px] font-poppins text-[13px] leading-[20px] text-brand-fg-muted">
                <p>
                  Seção da home, com o mesmo conteúdo dela. Aqui você a move, esconde ou remove; textos, imagens e
                  itens são editados na Home e mudam em todas as páginas que a usam.
                </p>
                <Link
                  href={`/admin/paginas?pagina=home&secao=${HOME_SHARED[block.props.key].source}`}
                  className="inline-flex h-[36px] w-fit items-center rounded-full bg-[image:var(--brand-orange-gradient)] px-[16px] text-[12px] font-bold text-white"
                >
                  Editar na Home
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

/** Os destinos de edição de uma seção da página de jogo, como botões. */
function TargetLinks({ links }: { links: readonly GameSectionLink[] }) {
  if (links.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-[8px]">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="inline-flex h-[36px] w-fit items-center rounded-full bg-[image:var(--brand-orange-gradient)] px-[16px] font-poppins text-[12px] font-bold text-white"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
