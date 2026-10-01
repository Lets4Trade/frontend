"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { RichTextField } from "@/features/site/editing/RichTextField";
import { toastError, toastOk } from "@/components/ui/Toasts";
import { SectionItemsEditor } from "@/features/admin/sections/SectionItemsEditor";
import { resetSectionAction, saveSectionAction } from "@/features/site/actions";
import type { SectionContent } from "@/features/site/list";
import type { GameOption, SiteSectionDef } from "@/features/site/sections";
import { ACTION_FAILED_MESSAGE, ACTION_FAILED_UPLOAD_MESSAGE, runAction } from "@/lib/safeAction";

/**
 * Conteúdo de uma SEÇÃO DO DESENHO (bloco `secao`) editado dentro do
 * construtor (fase 3, 2026-09-25) — antes o painel só mandava para outra tela.
 *
 * Reaproveita o que já existia: a mesma action do formulário de sessões e o
 * mesmo editor de itens de lista. O que muda é o LUGAR.
 *
 * ⚠️ Diferente dos blocos novos, isto NÃO passa pelo rascunho: as seções do
 * desenho sempre gravaram direto (é o modelo `SiteSectionContent`). A tela
 * avisa, e a prévia recarrega depois de cada gravação para mostrar o efeito.
 */
export function LegacySectionPanel({
  fullKey,
  def,
  content,
  games,
  onSaved,
}: {
  /** `home:reviews`. */
  fullKey: string;
  def: SiteSectionDef;
  content: SectionContent | undefined;
  games: GameOption[];
  /** Depois de gravar: atualiza o estado do editor e recarrega a prévia. */
  onSaved: (content: SectionContent | null) => void;
}) {
  const [title, setTitle] = useState(content?.title ?? "");
  const [subtitle, setSubtitle] = useState(content?.subtitle ?? "");
  const [footnote, setFootnote] = useState(content?.footnote ?? "");
  const [body, setBody] = useState(content?.body ?? "");
  const [pending, startTransition] = useTransition();
  const imageInput = useRef<HTMLInputElement>(null);
  const [imageName, setImageName] = useState<string | null>(null);

  const hasTitle = def.hasTitle !== false;
  const hasSubtitle = def.defaultSubtitle !== undefined || Boolean(def.subtitleLabel);
  const hasFootnote = def.defaultFootnote !== undefined || Boolean(def.footnoteLabel);
  const hasFields = hasTitle || hasSubtitle || hasFootnote || def.hasBody || def.hasImage;

  function save() {
    const form = new FormData();
    form.set("key", fullKey);
    form.set("title", title);
    form.set("subtitle", subtitle);
    form.set("footnote", footnote);
    form.set("body", body);
    const file = imageInput.current?.files?.[0];
    if (file) form.set("image", file, file.name);

    startTransition(async () => {
      const result = await runAction(() => saveSectionAction(form), {
        ok: false,
        reason: "error",
        message: ACTION_FAILED_UPLOAD_MESSAGE,
      });
      if (!result.ok) {
        toastError(result.message ?? "Não conseguimos salvar a seção.");
        return;
      }
      setImageName(null);
      if (imageInput.current) imageInput.current.value = "";
      onSaved(result.data);
      toastOk("Seção salva. A loja já mostra.");
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
        toastError(result.message ?? "Não conseguimos restaurar a seção.");
        return;
      }
      setTitle("");
      setSubtitle("");
      setFootnote("");
      setBody("");
      onSaved(null);
      toastOk("Seção devolvida ao texto padrão.");
    });
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <p className="rounded-[12px] border border-brand-orange/40 bg-brand-orange/5 px-[12px] py-[10px] font-poppins text-[12px] leading-[18px] text-brand-fg-muted">
        Seção do desenho original. As mudanças daqui vão <strong className="text-white">direto para a loja</strong> — não
        passam pelo rascunho. Mover, esconder e remover a seção, sim, entram no rascunho.
      </p>

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
              onChange={(event) => setTitle(event.target.value)}
            />
          ) : null}
          {/* 200, não 300: é o limite do backend (`sections.dto.ts`) — com 300 o
              campo aceitava texto que o servidor recusava ao salvar. */}
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
              label={def.bodyLabel ?? "Texto da seção"}
              value={body}
              placeholder={def.defaultBody}
              maxLength={4000}
              multiline
              onChange={setBody}
            />
          ) : def.hasBody ? (
            <TextAreaField
              label={def.bodyLabel ?? "Texto da seção"}
              value={body}
              placeholder={def.defaultBody}
              rows={5}
              maxLength={4000}
              onChange={(event) => setBody(event.target.value)}
            />
          ) : null}
          {def.hasImage ? (
            <div>
              <p className="mb-[8px] font-helvetica text-[16px] font-bold text-white">Imagem</p>
              <div className="flex items-center gap-[12px]">
                <span className="relative size-[64px] shrink-0 overflow-hidden rounded-[12px] border border-brand-border bg-black/40">
                  {content?.imageUrl ? (
                    <Image src={content.imageUrl} alt="" fill sizes="64px" className="object-cover" />
                  ) : null}
                </span>
                <label className="cursor-pointer rounded-full border border-white/20 px-[14px] py-[8px] font-poppins text-[12px] font-bold text-white hover:bg-white/5">
                  {imageName ?? "Escolher nova imagem"}
                  <input
                    ref={imageInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
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
              className="h-[40px] rounded-full bg-[image:var(--brand-orange-gradient)] px-[24px] font-poppins text-[13px] font-bold text-white disabled:opacity-50"
            >
              {pending ? "Salvando…" : "Salvar seção"}
            </button>
            {content ? (
              <button
                type="button"
                onClick={reset}
                disabled={pending}
                className="h-[40px] rounded-full px-[14px] font-poppins text-[12px] text-white/70 hover:bg-white/5 disabled:opacity-50"
              >
                Voltar ao texto padrão
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {def.list ? (
        // O editor de itens tem margem/borda de topo próprias do formulário de
        // sessões; aqui ele vive dentro do painel estreito do construtor.
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

      <p className="font-poppins text-[12px] text-brand-fg-subtle">
        Vídeo, foto do CEO e recortes finos continuam no{" "}
        <Link href="/admin/paginas/desenho" className="text-brand-orange hover:underline">
          editor no desenho
        </Link>
        .
      </p>
    </div>
  );
}
