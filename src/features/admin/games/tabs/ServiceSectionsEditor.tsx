"use client";

import { useRef, useState } from "react";
import { TextField } from "@/components/ui/TextField";
import { RowButton, moveByKey } from "@/features/admin/builder/BuilderPanels";
import { MarkdownTextArea, type UploadImage } from "@/features/admin/MarkdownTextArea";
import { SectionContentView } from "@/features/game/SectionContentView";
import {
  MARKER_COLOR_CLASS,
  MARKER_COLOR_LABEL,
  MARKER_GLYPH,
  MARKER_LABEL,
  MAX_SECTION_BODY,
  SECTION_MARKERS,
  SECTION_MARKER_COLORS,
  type SectionMarker,
  type SectionMarkerColor,
} from "@/features/game/sectionContent";
import { uploadPageAssetAction } from "@/features/pages/actions";
import { backendAsset } from "@/lib/publicApi";
import type { TabSection } from "./types";

/**
 * Textos da coluna esquerda de uma aba SERVIÇO/QUANTIDADE/PACOTES e da página
 * do pacote (Figma 1708:3266).
 *
 * v2 (2026-10-16, pedido do usuário: "editor de texto ... título, textos, os
 * detalhes na frente dos itens ... imagem também, 100% de personalização"):
 * cada seção tem título, TEXTO FORMATADO (negrito, itálico, link, listas,
 * subtítulo e imagem), o MARCADOR dos itens de lista (bolinha, check, seta,
 * traço, estrela, nenhum ou ícone próprio) com a cor dele, e uma prévia com o
 * mesmo componente que a loja usa.
 *
 * O texto é o Markdown RESTRITO da loja, não HTML: os botões só escrevem a
 * sintaxe, e a loja desenha elementos React — o que não é HTML não vira XSS
 * armazenado. Imagens sobem por `POST /admin/pages/assets` (ADMIN/EDITOR, WebP
 * regravado) e só esse caminho é desenhado.
 *
 * Mesmos gestos das listas do Builder (renomear, ↑ ↓ ✕), para o painel inteiro
 * ensinar um jeito só de mexer em lista.
 */

export type SectionDraft = {
  key: string;
  title: string;
  body: string;
  marker: SectionMarker;
  /** `undefined` = a cor de cada tela (cinza na página, laranja no painel do card). */
  markerColor?: SectionMarkerColor;
  markerIcon?: string;
};

// Tetos altos (2026-10-06, "tirar o limite"): espelham o backend.
export const MAX_SECTIONS = 30;

/** Medidas recomendadas (regra do painel: exibição × 2; o backend reduz a 1600). */
const BODY_IMAGE_HINT = "até 1600 px de largura";
const ICON_HINT = "64×64";

/**
 * Conteúdo → rascunho. Seção do formato antigo (`items`) abre como lista no
 * texto — com o mesmo desenho na loja —, então salvar de novo a converte sem
 * perder nada.
 */
export function toSectionDrafts(sections: readonly TabSection[] | undefined | null): SectionDraft[] {
  return (sections ?? []).map((section) => {
    const legacy = section.items.map((item) => `- ${item}`).join("\n");
    const body = [legacy, section.body ?? ""].filter(Boolean).join("\n\n");
    return {
      key: crypto.randomUUID(),
      title: section.title,
      body,
      marker: section.marker ?? "dot",
      markerColor: section.markerColor,
      markerIcon: section.markerIcon,
    };
  });
}

/** Rascunho → conteúdo. Padrões (bolinha, cor da tela, texto vazio) não viajam. */
export function fromSectionDrafts(drafts: readonly SectionDraft[]): TabSection[] {
  return drafts.map((draft) => {
    const section: TabSection = { title: draft.title.trim(), items: [] };
    const body = draft.body.trim();
    if (body) section.body = body;
    if (draft.marker === "icon") {
      if (draft.markerIcon) {
        section.marker = "icon";
        section.markerIcon = draft.markerIcon;
      }
    } else if (draft.marker !== "dot") {
      section.marker = draft.marker;
    }
    if (draft.markerColor) section.markerColor = draft.markerColor;
    return section;
  });
}

/** Sobe a imagem pelo endpoint de artes do construtor de páginas. */
const uploadImage: UploadImage = async (file) => {
  const form = new FormData();
  form.set("image", file, file.name);
  const result = await uploadPageAssetAction(form);
  if (result.ok) return { url: result.data.url };
  if (result.reason === "unauthenticated") return { error: "Sua sessão expirou. Entre de novo para enviar a imagem." };
  if (result.reason === "forbidden") return { error: "Sua conta não pode enviar imagens." };
  return { error: result.message ?? "Não foi possível enviar a imagem. Tente de novo." };
};

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
        <p className="font-poppins text-[13px] text-brand-fg-subtle">{emptyText}</p>
      ) : null}

      <ul className="flex flex-col gap-[20px]">
        {sections.map((section, index) => (
          <li
            key={section.key}
            className="flex flex-col gap-[16px] rounded-[20px] border border-white/10 bg-black/20 p-[15px]"
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

            <MarkerPicker
              index={index}
              section={section}
              onChange={(next) => patchSection(section.key, next)}
            />

            <MarkdownTextArea
              label={`Texto da seção ${index + 1}`}
              value={section.body}
              maxLength={MAX_SECTION_BODY}
              placeholder={"Escreva o texto. Cada linha começando com - vira um item com o marcador escolhido.\n- Item 1\n- Item 2"}
              onChange={(body) => patchSection(section.key, { body })}
              onUploadImage={uploadImage}
              imageHint={BODY_IMAGE_HINT}
              imageLinks
            />

            <SectionPreview section={section} />
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={sections.length >= MAX_SECTIONS}
        onClick={() =>
          onChange([...sections, { key: crypto.randomUUID(), title: "", body: "", marker: "dot" }])
        }
        className="h-[50px] w-full rounded-full border border-dashed border-white/20 font-poppins text-[14px] font-bold text-white/80 transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        + Adicionar seção de texto
      </button>
    </div>
  );
}

const PILL =
  "flex h-[36px] items-center gap-[6px] rounded-full border px-[12px] font-poppins text-[13px] transition-opacity hover:opacity-90";
const PILL_ON = "border-brand-orange bg-brand-orange/10 text-white";
const PILL_OFF = "border-white/10 bg-[image:var(--brand-surface-fill)] text-white/80";

/** Marcador dos itens + cor + ícone próprio. Seleção única, como os filtros da loja. */
function MarkerPicker({
  index,
  section,
  onChange,
}: {
  index: number;
  section: SectionDraft;
  onChange: (next: Partial<SectionDraft>) => void;
}) {
  const colorClass = section.markerColor ? MARKER_COLOR_CLASS[section.markerColor] : "text-brand-placeholder";
  const glyph = section.marker === "none" || section.marker === "icon" ? null : MARKER_GLYPH[section.marker];

  return (
    <div className="flex flex-col gap-[12px]">
      <fieldset className="flex flex-col gap-[8px]">
        <legend className="mb-[8px] font-poppins text-[13px] font-bold text-white/80">
          Marcador dos itens da seção {index + 1}
        </legend>
        <div className="flex flex-wrap gap-[6px]">
          {SECTION_MARKERS.map((marker) => (
            <button
              key={marker}
              type="button"
              aria-pressed={section.marker === marker}
              onClick={() => onChange({ marker })}
              className={`${PILL} ${section.marker === marker ? PILL_ON : PILL_OFF}`}
            >
              {marker === "none" || marker === "icon" ? null : (
                <span aria-hidden className={colorClass}>
                  {MARKER_GLYPH[marker]}
                </span>
              )}
              {MARKER_LABEL[marker]}
            </button>
          ))}
        </div>
      </fieldset>

      {section.marker === "icon" ? (
        <MarkerIconField
          index={index}
          icon={section.markerIcon}
          onChange={(markerIcon) => onChange({ markerIcon })}
        />
      ) : null}

      {glyph ? (
        <fieldset className="flex flex-col gap-[8px]">
          <legend className="mb-[8px] font-poppins text-[13px] font-bold text-white/80">
            Cor do marcador da seção {index + 1}
          </legend>
          <div className="flex flex-wrap gap-[6px]">
            <button
              type="button"
              aria-pressed={!section.markerColor}
              onClick={() => onChange({ markerColor: undefined })}
              className={`${PILL} ${!section.markerColor ? PILL_ON : PILL_OFF}`}
            >
              Padrão
            </button>
            {SECTION_MARKER_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-pressed={section.markerColor === color}
                onClick={() => onChange({ markerColor: color })}
                className={`${PILL} ${section.markerColor === color ? PILL_ON : PILL_OFF}`}
              >
                <span aria-hidden className={MARKER_COLOR_CLASS[color]}>
                  {glyph}
                </span>
                {MARKER_COLOR_LABEL[color]}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
    </div>
  );
}

/** Ícone próprio do marcador: caixa pequena que envia na hora, como o banner do Builder. */
function MarkerIconField({
  index,
  icon,
  onChange,
}: {
  index: number;
  icon?: string;
  onChange: (next: string | undefined) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const src = backendAsset(icon);

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(undefined);
    try {
      const result = await uploadImage(file);
      if ("error" in result) setError(result.error);
      else onChange(result.url);
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-[6px]">
      <div className="flex items-center gap-[12px]">
        <div className="flex size-[50px] shrink-0 items-center justify-center rounded-[12px] border border-dashed border-white/20 bg-black/30">
          {src ? (
            // Prévia da arte recém-enviada (dimensão desconhecida).
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="size-[28px] object-contain" />
          ) : (
            <span aria-hidden className="font-poppins text-[11px] text-white/40">
              vazio
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={uploading}
          onClick={() => input.current?.click()}
          className={`${PILL} ${PILL_OFF} disabled:opacity-50`}
        >
          {uploading ? "Enviando…" : src ? "Trocar ícone" : "Enviar ícone"}
        </button>
        {src ? (
          <button type="button" onClick={() => onChange(undefined)} className={`${PILL} ${PILL_OFF}`}>
            Tirar
          </button>
        ) : null}
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          aria-label={`Ícone dos itens da seção ${index + 1}`}
          onChange={(event) => void upload(event.target.files?.[0])}
        />
      </div>
      <p className="font-poppins text-[12px] text-brand-fg-subtle">
        Ícone dos itens ({ICON_HINT}, PNG com fundo transparente fica melhor). Sem ícone, a loja mostra a bolinha.
      </p>
      {error ? (
        <p role="alert" className="font-poppins text-[13px] text-brand-orange">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Como a seção sai na loja — o MESMO componente da página do pacote. */
function SectionPreview({ section }: { section: SectionDraft }) {
  const [content] = fromSectionDrafts([section]);
  const empty = !content.title && !content.body;

  return (
    <div className="rounded-[16px] border border-white/10 bg-black/40 p-[16px]">
      <p className="mb-[12px] font-poppins text-[11px] font-bold tracking-[0.06em] text-brand-fg-subtle uppercase">
        Prévia
      </p>
      {empty ? (
        <p className="font-poppins text-[13px] text-brand-fg-subtle">Escreva um título ou um texto para ver a prévia.</p>
      ) : (
        // Só para olhar: os links da prévia não navegam para fora do painel.
        <div inert>
          <SectionContentView section={content} />
        </div>
      )}
    </div>
  );
}
