"use client";

import { TextField } from "@/components/ui/TextField";
import { RowButton, moveByKey } from "@/features/admin/builder/BuilderPanels";
import type { TabSection } from "./types";

/**
 * Textos da coluna esquerda de uma aba SERVIÇO (Figma 1708:3266): seções com
 * título e lista de itens ("Como funciona", "O que está incluso"...).
 *
 * TEXTO PURO de propósito — sem editor rico, sem markdown. A vitrine desenha
 * como texto, e o que não é HTML não vira XSS armazenado.
 *
 * Mesmos gestos das listas do Builder (renomear, ↑ ↓ ✕), para o painel inteiro
 * ensinar um jeito só de mexer em lista.
 */

export type SectionDraft = {
  key: string;
  title: string;
  items: { key: string; text: string }[];
};

// Tetos altos (2026-10-06, "tirar o limite"): espelham o backend.
export const MAX_SECTIONS = 30;
export const MAX_ITEMS = 100;

export function toSectionDrafts(sections: readonly TabSection[] | undefined | null): SectionDraft[] {
  return (sections ?? []).map((section) => ({
    key: crypto.randomUUID(),
    title: section.title,
    items: section.items.map((text) => ({ key: crypto.randomUUID(), text })),
  }));
}

/** Rascunho → conteúdo. Itens em branco caem aqui (a lista ganha linha vazia a cada "+"). */
export function fromSectionDrafts(drafts: readonly SectionDraft[]): TabSection[] {
  return drafts.map((section) => ({
    title: section.title.trim(),
    items: section.items.map((item) => item.text.trim()).filter((text) => text !== ""),
  }));
}

export function ServiceSectionsEditor({
  sections,
  onChange,
  emptyText = "Nenhum texto ainda. A coluna da esquerda da aba fica vazia na loja.",
}: {
  sections: SectionDraft[];
  onChange: (next: SectionDraft[]) => void;
  /** O que dizer sem nenhuma seção — o efeito muda conforme quem usa o editor. */
  emptyText?: string;
}) {
  function patchSection(key: string, next: Partial<SectionDraft>) {
    onChange(sections.map((section) => (section.key === key ? { ...section, ...next } : section)));
  }

  return (
    <div className="flex flex-col gap-[20px]">
      {sections.length === 0 ? (
        <p className="font-poppins text-[13px] text-brand-fg-subtle">
          {emptyText}
        </p>
      ) : null}

      <ul className="flex flex-col gap-[20px]">
        {sections.map((section, index) => (
          <li
            key={section.key}
            className="flex flex-col gap-[12px] rounded-[20px] border border-white/10 bg-black/20 p-[15px]"
          >
            <div className="flex items-end gap-[10px]">
              <div className="min-w-0 flex-1">
                <TextField
                  label={`Título da seção ${index + 1}`}
                  value={section.title}
                  maxLength={200}
                  placeholder="Como funciona"
                  onChange={(event) => patchSection(section.key, { title: event.target.value })}
                />
              </div>
              <RowButton
                label={`Mover seção ${index + 1} para cima`}
                onClick={() => onChange(moveByKey(sections, section.key, -1))}
                disabled={index === 0}
              >
                ↑
              </RowButton>
              <RowButton
                label={`Mover seção ${index + 1} para baixo`}
                onClick={() => onChange(moveByKey(sections, section.key, 1))}
                disabled={index === sections.length - 1}
              >
                ↓
              </RowButton>
              <RowButton
                label={`Remover seção ${index + 1}`}
                onClick={() => onChange(sections.filter((current) => current.key !== section.key))}
                danger
              >
                ✕
              </RowButton>
            </div>

            <ul className="flex flex-col gap-[10px] pl-[20px] sm:pl-[40px]">
              {section.items.map((item, itemIndex) => (
                <li key={item.key} className="flex items-end gap-[10px]">
                  <div className="min-w-0 flex-1">
                    <TextField
                      label={`Item ${itemIndex + 1}`}
                      value={item.text}
                      maxLength={2000}
                      onChange={(event) =>
                        patchSection(section.key, {
                          items: section.items.map((current) =>
                            current.key === item.key ? { ...current, text: event.target.value } : current,
                          ),
                        })
                      }
                    />
                  </div>
                  <RowButton
                    label={`Mover item ${itemIndex + 1} para cima`}
                    onClick={() => patchSection(section.key, { items: moveByKey(section.items, item.key, -1) })}
                    disabled={itemIndex === 0}
                  >
                    ↑
                  </RowButton>
                  <RowButton
                    label={`Mover item ${itemIndex + 1} para baixo`}
                    onClick={() => patchSection(section.key, { items: moveByKey(section.items, item.key, 1) })}
                    disabled={itemIndex === section.items.length - 1}
                  >
                    ↓
                  </RowButton>
                  <RowButton
                    label={`Remover item ${itemIndex + 1}`}
                    onClick={() =>
                      patchSection(section.key, {
                        items: section.items.filter((current) => current.key !== item.key),
                      })
                    }
                    danger
                  >
                    ✕
                  </RowButton>
                </li>
              ))}
            </ul>

            <button
              type="button"
              disabled={section.items.length >= MAX_ITEMS}
              onClick={() =>
                patchSection(section.key, {
                  items: [...section.items, { key: crypto.randomUUID(), text: "" }],
                })
              }
              className="ml-[20px] h-[40px] rounded-full border border-dashed border-white/15 font-poppins text-[13px] font-bold text-white/70 transition-opacity hover:opacity-90 disabled:opacity-40 sm:ml-[40px]"
            >
              + Adicionar item
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={sections.length >= MAX_SECTIONS}
        onClick={() => onChange([...sections, { key: crypto.randomUUID(), title: "", items: [] }])}
        className="h-[50px] w-full rounded-full border border-dashed border-white/20 font-poppins text-[14px] font-bold text-white/80 transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        + Adicionar seção de texto
      </button>
      <p className="-mt-[10px] font-poppins text-[12px] text-brand-fg-subtle">
        Texto simples, sem formatação nem links.
      </p>
    </div>
  );
}
