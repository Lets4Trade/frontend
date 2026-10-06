"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FileField } from "@/components/ui/FileField";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { toastOk } from "@/components/ui/Toasts";
import { AdminFieldGrid, AdminFormActions } from "@/features/admin/AdminFormCard";
import { Markdown } from "@/features/pages/blocks/markdown";
import { ACTION_FAILED_UPLOAD_MESSAGE, runAction } from "@/lib/safeAction";
import { slugify, slugifyDraft } from "@/lib/slugify";
import { createBlogPostAction, updateBlogPostAction, type BlogActionResult } from "./actions";
import {
  ACCEPTED_COVER_TYPES,
  BODY_MAX,
  EXCERPT_MAX,
  isoToLocalInput,
  localInputToIso,
  MAX_COVER_BYTES,
  NO_GAME,
  TITLE_MAX,
  blogPostSchema,
  readBlogForm,
  type BlogPostField,
} from "./schema";

type FieldErrors = Partial<Record<BlogPostField | "cover", string>>;

export type BlogFormPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  cover: string | null;
  gameId: string;
  isPublished: boolean;
  publishedAt: string;
};

/**
 * Formulário de notícia — criar (`/admin/noticias/nova`) e editar
 * (`/admin/noticias/[id]/editar`). Fora do Figma; usa o kit do painel (moldura
 * `AdminFormCard`, grade de 315px, pílulas dos campos).
 *
 * - Link (slug) acompanha o TÍTULO até ser editado, como no `GameForm`.
 * - Corpo em Markdown RESTRITO com prévia AO VIVO pelo MESMO renderer da loja
 *   (`pages/blocks/markdown.tsx`): o que se vê aqui é o que sai na matéria.
 * - A validação daqui é de UX; a action revalida e o backend decide.
 */
export function BlogPostForm({
  post,
  games,
}: {
  post?: BlogFormPost;
  games: readonly { value: string; label: string }[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  // Na edição o link já é "dele": mudar o título não pode trocar o endereço
  // de uma matéria publicada (quebraria links compartilhados).
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const shownSlug = slugTouched ? slug : slugify(title);

  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [isPublished, setIsPublished] = useState(post?.isPublished ?? false);
  const [publishedAt, setPublishedAt] = useState(post?.publishedAt ? isoToLocalInput(post.publishedAt) : "");

  // Capa: arquivo novo (prévia local) › capa atual › nenhuma.
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  // Remonta o `FileField` para esvaziar o input de arquivo (que o React não
  // controla) depois de salvar ou de "remover capa".
  const [fileKey, setFileKey] = useState(0);

  // A prévia local é criada no gesto (e não num efeito) e a anterior é
  // revogada na troca — sem o revoke, cada arquivo escolhido ficaria preso na
  // memória da aba. A última é revogada ao sair da tela.
  const previewRef = useRef<string | null>(null);
  function choosePreview(file: File | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = file ? URL.createObjectURL(file) : null;
    setPreviewUrl(previewRef.current);
    setCoverFile(file);
  }
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  const shownCover = previewUrl ?? (removeCover ? null : (post?.cover ?? null));

  function togglePublished(next: boolean) {
    setIsPublished(next);
    // Publicar sem data: "agora" (em Brasília), já visível para ajustar.
    if (next && publishedAt === "") setPublishedAt(isoToLocalInput(new Date().toISOString()));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    // Os campos controlados viajam normalizados — não o que o DOM tiver.
    // Link já no formato fica como está (pode ter até 120; o `slugify` corta
    // em 80 e mudaria o endereço de uma matéria antiga).
    data.set("slug", /^[a-z0-9]+(-[a-z0-9]+)*$/.test(shownSlug) ? shownSlug : slugify(shownSlug));
    data.set("isPublished", String(isPublished));
    data.set("publishedAt", isPublished ? localInputToIso(publishedAt) : "");
    if (removeCover && !coverFile) data.set("removeCover", "true");

    const parsed = blogPostSchema.safeParse(readBlogForm(data));
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as BlogPostField | undefined;
        if (field && !next[field]) next[field] = issue.message;
      }
      setErrors(next);
      setFormError("Confira os campos destacados.");
      return;
    }
    setErrors({});
    setFormError(null);

    startSubmit(async () => {
      const fallback: BlogActionResult = { ok: false, reason: "error", message: ACTION_FAILED_UPLOAD_MESSAGE };
      const result = await runAction(
        () => (post ? updateBlogPostAction(post.id, data) : createBlogPostAction(data)),
        fallback,
      );

      if (!result.ok) {
        setFormError(result.message);
        if (result.field) setErrors({ [result.field]: result.message });
        return;
      }

      if (!post) {
        toastOk("Notícia criada.");
        router.push(`/admin/noticias/${encodeURIComponent(result.id)}/editar`);
        return;
      }

      toastOk(isPublished ? "Notícia salva e publicada." : "Rascunho salvo.");
      if (result.slug) setSlug(result.slug);
      choosePreview(null);
      setRemoveCover(false);
      setFileKey((key) => key + 1);
      // Traz a capa nova (e o que o backend normalizou) do servidor.
      router.refresh();
    });
  }

  const excerptLeft = EXCERPT_MAX - excerpt.length;

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="px-[20px] pt-[33px] sm:px-[50px]">
      <AdminFieldGrid>
        <TextField
          label="Título"
          name="title"
          placeholder="Título da notícia"
          autoComplete="off"
          maxLength={TITLE_MAX}
          error={errors.title}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />

        <div>
          <TextField
            label="Link:"
            name="slug"
            placeholder="link-da-noticia"
            autoComplete="off"
            maxLength={120}
            error={errors.slug}
            value={shownSlug}
            onChange={(event) => {
              setSlug(slugifyDraft(event.target.value));
              setSlugTouched(event.target.value !== "");
            }}
          />
          <p className="mt-[6px] truncate pl-[25px] font-helvetica text-[12px] text-brand-fg-subtle">
            /noticias/{slugify(shownSlug) || "…"}
          </p>
        </div>

        <SelectField
          label="Jogo:"
          name="gameId"
          defaultValue={post?.gameId || NO_GAME}
          options={[{ value: NO_GAME, label: "Sem jogo" }, ...games]}
          error={errors.gameId}
        />

        <div>
          <FileField
            key={fileKey}
            label="Capa (1280×720, até 5 MB)"
            placeholder={shownCover ? "Trocar capa" : "Anexar capa"}
            name="cover"
            accept={ACCEPTED_COVER_TYPES}
            maxBytes={MAX_COVER_BYTES}
            error={errors.cover}
            onFileChange={(file) => {
              choosePreview(file);
              if (file) setRemoveCover(false);
            }}
          />
          {shownCover ? (
            <div className="mt-[12px]">
              <div className="relative aspect-video w-full overflow-hidden rounded-[16px] border border-white/10 bg-[#2f2f2f]">
                <Image
                  src={shownCover}
                  alt="Prévia da capa"
                  fill
                  sizes="315px"
                  // Prévia local (`blob:`) não passa pelo otimizador.
                  unoptimized={shownCover.startsWith("blob:")}
                  className="object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  choosePreview(null);
                  setFileKey((key) => key + 1);
                  // Só a capa SALVA precisa de "remover" no backend; um arquivo
                  // recém-escolhido só sai da tela.
                  setRemoveCover(Boolean(post?.cover));
                }}
                className="mt-[8px] pl-[10px] font-poppins text-[13px] font-bold text-brand-orange transition-opacity hover:opacity-80"
              >
                Remover capa
              </button>
            </div>
          ) : removeCover ? (
            <p className="mt-[8px] pl-[10px] font-helvetica text-[12px] text-brand-fg-subtle">
              A capa será removida ao salvar.{" "}
              <button
                type="button"
                onClick={() => setRemoveCover(false)}
                className="font-bold text-brand-orange hover:opacity-80"
              >
                Desfazer
              </button>
            </p>
          ) : null}
        </div>
      </AdminFieldGrid>

      <div className="mt-[49px] max-w-[1410px]">
        <TextAreaField
          label="Resumo (aparece no card e no Google)"
          name="excerpt"
          placeholder="Uma ou duas frases sobre a notícia"
          maxLength={EXCERPT_MAX}
          error={errors.excerpt}
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value)}
          className="h-[110px]"
        />
        <p
          aria-live="polite"
          className={`mt-[6px] text-right font-helvetica text-[12px] ${excerptLeft < 20 ? "text-brand-orange" : "text-brand-fg-subtle"}`}
        >
          {excerpt.length}/{EXCERPT_MAX}
        </p>
      </div>

      <div className="mt-[30px] grid max-w-[1410px] grid-cols-1 gap-[30px] xl:grid-cols-2">
        <div>
          <TextAreaField
            label="Texto (Markdown restrito)"
            name="body"
            placeholder={"## Subtítulo\n\nTexto com **negrito**, *itálico* e [link](https://…).\n\n- item de lista"}
            maxLength={BODY_MAX}
            error={errors.body}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="h-[460px] resize-y font-mono text-[14px]"
          />
          <p className="mt-[6px] pl-[10px] font-helvetica text-[12px] leading-[18px] text-brand-fg-subtle">
            Aceita: ## título · ### subtítulo · **negrito** · *itálico* · - lista · 1. lista · [texto](https://…
            ou /caminho). Qualquer outra coisa sai como texto.
          </p>
        </div>

        <div>
          <p className="pl-[25px] font-poppins text-[16px] font-medium tracking-[0.16px] text-white">Prévia</p>
          <div className="scrollbar-orange mt-[12px] flex h-[460px] flex-col gap-[16px] overflow-y-auto rounded-[16px] border-2 border-white/10 bg-black/40 p-[20px]">
            {body.trim() ? (
              <Markdown source={body} />
            ) : (
              <p className="font-helvetica text-[14px] text-brand-fg-subtle">A prévia aparece aqui enquanto você escreve.</p>
            )}
          </div>
        </div>
      </div>

      <fieldset className="mt-[40px] flex flex-wrap items-end gap-[30px]">
        <legend className="sr-only">Publicação</legend>
        <label className="flex cursor-pointer items-center gap-[12px] font-poppins text-[16px] text-white">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(event) => togglePublished(event.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="relative h-[28px] w-[50px] rounded-full border border-white/15 bg-white/10 transition-colors peer-checked:bg-brand-orange peer-focus-visible:ring-2 peer-focus-visible:ring-brand-orange peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-brand-bg after:absolute after:top-[3px] after:left-[3px] after:size-[20px] after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-[22px]"
          />
          {isPublished ? "Publicada" : "Rascunho"}
        </label>

        {isPublished ? (
          <div className="w-[315px]">
            <TextField
              label="Publicar em (horário de Brasília)"
              type="datetime-local"
              value={publishedAt}
              onChange={(event) => setPublishedAt(event.target.value)}
              error={errors.publishedAt}
            />
          </div>
        ) : null}
      </fieldset>

      <AdminFormActions className="mt-[50px]">
        <Button type="submit" variant="primary" fullWidth disabled={isSubmitting}>
          {isSubmitting ? "SALVANDO…" : post ? "SALVAR" : "CRIAR NOTÍCIA"}
        </Button>

        {formError ? (
          <p role="alert" className="font-helvetica text-[14px] text-red-9">
            {formError}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-x-[20px] gap-y-[6px]">
          <Link href="/admin/noticias" className="font-poppins text-[13px] text-brand-fg-muted hover:text-white">
            ← Voltar à lista
          </Link>
          {post?.isPublished && post.slug ? (
            <Link
              href={`/noticias/${post.slug}`}
              target="_blank"
              className="font-poppins text-[13px] text-brand-fg-muted hover:text-brand-orange"
            >
              Ver na loja ↗
            </Link>
          ) : null}
        </div>
      </AdminFormActions>
    </form>
  );
}
