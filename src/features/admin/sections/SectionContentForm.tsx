"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { toastError, toastOk } from "@/components/ui/Toasts";
import { RichTextField } from "@/features/site/editing/RichTextField";
import { resetSectionAction, saveSectionAction } from "@/features/site/actions";
import type { SectionContent } from "@/features/site/list";
import type { GameOption, SiteSectionDef } from "@/features/site/sections";
import { ACTION_FAILED_MESSAGE, ACTION_FAILED_UPLOAD_MESSAGE, runAction } from "@/lib/safeAction";
import { SectionItemsEditor } from "./SectionItemsEditor";

/**
 * Os campos de UMA sessão do catálogo (`features/site/sections.ts`) + salvar,
 * voltar ao padrão e, se houver, a lista de itens.
 *
 * Extraído do `LegacySectionPanel` (2026-10-01) para servir também às telas
 * "Configurações da loja" e "Cabeçalho"/"Rodapé" — o mesmo formulário em três
 * lugares, gravando pela mesma action. Grava DIRETO na loja (o modelo
 * `SiteSectionContent` não tem rascunho).
 */
export function SectionContentForm({
  fullKey,
  def,
  content,
  games,
  onSaved,
}: {
  /** `layout:contatos`. */
  fullKey: string;
  def: SiteSectionDef;
  content: SectionContent | undefined;
  games: GameOption[];
  /** Depois de gravar (ou de mexer na lista): o conteúdo novo, ou `null` se voltou ao padrão. */
  onSaved: (content: SectionContent | null) => void;
}) {
  const [title, setTitle] = useState(content?.title ?? "");
  const [subtitle, setSubtitle] = useState(content?.subtitle ?? "");
  const [footnote, setFootnote] = useState(content?.footnote ?? "");
  const [body, setBody] = useState(content?.body ?? "");
  const [extras, setExtras] = useState<Record<string, string>>(() =>
    Object.fromEntries((def.extraFields ?? []).map((field) => [field.name, content?.extras?.[field.name] ?? ""])),
  );
  const [pending, startTransition] = useTransition();
  const imageInput = useRef<HTMLInputElement>(null);
  const [imageName, setImageName] = useState<string | null>(null);

  const hasTitle = def.hasTitle !== false;
  const hasSubtitle = def.defaultSubtitle !== undefined || Boolean(def.subtitleLabel);
  const hasFootnote = def.defaultFootnote !== undefined || Boolean(def.footnoteLabel);
  const hasExtras = (def.extraFields?.length ?? 0) > 0;
  const hasFields = hasTitle || hasSubtitle || hasFootnote || def.hasBody || def.hasImage || hasExtras;

  function save() {
    const form = new FormData();
    form.set("key", fullKey);
    form.set("title", title);
    form.set("subtitle", subtitle);
    form.set("footnote", footnote);
    form.set("body", body);
    // TODOS os extras declarados, inclusive vazios: vazio é como o admin volta
    // ao padrão (o backend apaga a chave). Os que a seção não declara não vão,
    // e a mescla do backend os preserva.
    if (hasExtras) form.set("extras", JSON.stringify(extras));
    const file = imageInput.current?.files?.[0];
    if (file) form.set("image", file, file.name);

    startTransition(async () => {
      const result = await runAction(() => saveSectionAction(form), {
        ok: false,
        reason: "error",
        message: ACTION_FAILED_UPLOAD_MESSAGE,
      });
      if (!result.ok) {
        toastError(result.message ?? "Não conseguimos salvar.");
        return;
      }
      setImageName(null);
      if (imageInput.current) imageInput.current.value = "";
      onSaved(result.data);
      toastOk("Salvo. A loja já mostra.");
    });
  }

  function reset() {
    startTransition(async () => {
      const result = await runAction(() => resetSectionAction(fullKey), {
        ok: false,
        reason: "error",
        message: ACTION_FAILED_MESSAGE,
      });
      if (!result.ok) {
        toastError(result.message ?? "Não conseguimos restaurar.");
        return;
      }
      setTitle("");
      setSubtitle("");
      setFootnote("");
      setBody("");
      setExtras((current) => Object.fromEntries(Object.keys(current).map((name) => [name, ""])));
      onSaved(null);
      toastOk("Voltou ao texto padrão.");
    });
  }

  return (
    <div className="flex flex-col gap-[18px]">
      {hasFields ? (
        <div className="flex flex-col gap-[16px]">
          {hasTitle && def.rich?.includes("title") ? (
            <RichTextField
              label={def.titleLabel ?? "Título"}
              value={title}
              placeholder={def.defaultTitle}
              maxLength={160}
              hint="Selecione um trecho para formatar · Shift+Enter quebra a linha."
              onChange={setTitle}
            />
          ) : hasTitle ? (
            <TextField
              label={def.titleLabel ?? "Título"}
              value={title}
              placeholder={def.defaultTitle}
              maxLength={160}
              mask={def.titleMask}
              onChange={(event) => setTitle(event.target.value)}
            />
          ) : null}
          {/* 200, não 300: é o limite do backend (`sections.dto.ts`). */}
          {hasSubtitle && def.rich?.includes("subtitle") ? (
            <RichTextField
              label={def.subtitleLabel ?? "Subtítulo"}
              value={subtitle}
              placeholder={def.defaultSubtitle}
              maxLength={200}
              onChange={setSubtitle}
            />
          ) : hasSubtitle ? (
            <TextField
              label={def.subtitleLabel ?? "Subtítulo"}
              value={subtitle}
              placeholder={def.defaultSubtitle}
              maxLength={200}
              mask={def.subtitleMask}
              onChange={(event) => setSubtitle(event.target.value)}
            />
          ) : null}
          {hasFootnote ? (
            <TextField
              label={def.footnoteLabel ?? "Legenda"}
              value={footnote}
              placeholder={def.defaultFootnote}
              maxLength={200}
              onChange={(event) => setFootnote(event.target.value)}
            />
          ) : null}
          {def.hasBody && def.rich?.includes("body") ? (
            <RichTextField
              label={def.bodyLabel ?? "Texto"}
              value={body}
              placeholder={def.defaultBody}
              maxLength={4000}
              multiline
              onChange={setBody}
            />
          ) : def.hasBody ? (
            <TextAreaField
              label={def.bodyLabel ?? "Texto"}
              value={body}
              placeholder={def.defaultBody}
              rows={4}
              maxLength={4000}
              onChange={(event) => setBody(event.target.value)}
            />
          ) : null}
          {def.extraFields?.map((field) => (
            <div key={field.name}>
              <TextField
                label={field.label}
                value={extras[field.name] ?? ""}
                placeholder={field.defaultValue}
                maxLength={field.maxLength}
                onChange={(event) =>
                  setExtras((current) => ({ ...current, [field.name]: event.target.value }))
                }
              />
              {field.hint ? (
                <p className="mt-[6px] font-poppins text-[12px] text-brand-fg-subtle">{field.hint}</p>
              ) : null}
            </div>
          ))}
          {def.hasImage ? (
            <div>
              <p className="mb-[8px] font-helvetica text-[16px] font-bold text-white">Imagem</p>
              <div className="flex items-center gap-[12px]">
                <span className="relative size-[64px] shrink-0 overflow-hidden rounded-[12px] border border-brand-border bg-black/40">
                  {content?.imageUrl ? (
                    <Image src={content.imageUrl} alt="" fill sizes="64px" className="object-contain" />
                  ) : null}
                </span>
                <label className="cursor-pointer rounded-full border border-white/20 px-[14px] py-[8px] font-poppins text-[12px] font-bold text-white focus-within:ring-2 focus-within:ring-brand-orange hover:bg-white/5">
                  {imageName ?? (content?.imageUrl ? "Trocar imagem" : "Escolher imagem")}
                  <input
                    ref={imageInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(event) => setImageName(event.target.files?.[0]?.name ?? null)}
                  />
                </label>
              </div>
              {def.imageHint ? (
                <p className="mt-[6px] font-poppins text-[12px] text-brand-fg-subtle">{def.imageHint}</p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-[10px]">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="h-[40px] rounded-full bg-[image:var(--brand-orange-gradient)] px-[24px] font-poppins text-[13px] font-bold text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:opacity-50"
            >
              {pending ? "Salvando…" : "Salvar"}
            </button>
            {content ? (
              <button
                type="button"
                onClick={reset}
                disabled={pending}
                className="h-[40px] rounded-full px-[14px] font-poppins text-[12px] text-white/70 hover:bg-white/5 disabled:opacity-50"
              >
                Voltar ao padrão
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {def.list ? (
        // O editor de itens tem margem/borda de topo próprias do formulário de
        // sessões; aqui ele vive dentro de um card ou painel estreito.
        <div className="[&>section]:mt-0 [&>section]:border-t-0 [&>section]:pt-0">
          <SectionItemsEditor
            key={fullKey}
            sectionKey={fullKey}
            def={def.list}
            games={games}
            onChanged={() => onSaved(content ?? null)}
          />
        </div>
      ) : null}
    </div>
  );
}

