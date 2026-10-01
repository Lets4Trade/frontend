"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { toastOk } from "@/components/ui/Toasts";
import { FileField } from "@/components/ui/FileField";
import { TextField } from "@/components/ui/TextField";
import { uploadLogoAction } from "@/features/admin/builder/actions";
import { ListPanel } from "@/features/admin/builder/BuilderPanels";
import type { BuilderGame, BuilderListItem } from "@/features/admin/builder/types";
import { ACTION_FAILED_UPLOAD_MESSAGE, runAction } from "@/lib/safeAction";
import { slugify, slugifyDraft } from "@/lib/slugify";
import { isGameFormDirty } from "./central";
import { updateGameAction } from "./editActions";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "./options";

const ERROR_MESSAGES = {
  unauthenticated: "Sua sessão expirou. Entre de novo para continuar.",
  forbidden: "Sua conta não tem permissão para editar games.",
  invalid: "Confira os campos e tente de novo.",
  error: "Não conseguimos salvar agora. Tente novamente em instantes.",
} as const;

/**
 * "Visão geral" da Central do jogo (`/admin/jogos/[id]?secao=visao-geral`,
 * admin-games-ux.md, Etapa 2; nasceu como "EDITAR JOGO" em 2026-09-28).
 *
 * Os campos do CADASTRO — nome, link, arte e servidores. As ABAS gravam a cada
 * gesto e moram na seção "Abas e produtos"; este formulário só no SALVAR. A
 * página do jogo (banners, textos, categorias globais, ordem dos blocos)
 * continua no Builder — a seção "Página da loja" leva até ele.
 *
 * O SALVAR fica preso ao pé da tela (`sticky`) e só habilita com mudança
 * (`isGameFormDirty`). Salvo, a tela FICA aqui e revalida: a página remonta o
 * formulário com o que o servidor devolveu (ver a `key` na página).
 *
 * O painel de servidores é o do Builder, para as duas telas
 * ensinarem o mesmo gesto. Servidor renomeado mantém o `id`, então os produtos
 * ligados a ele seguem ligados; remover um servidor com produtos é recusado
 * pelo backend, com a mensagem dele.
 *
 * A plataforma não aparece: o backend só a aceita no cadastro.
 */
export function GameEditForm({ game }: { game: BuilderGame }) {
  const router = useRouter();
  const [isSaving, startSave] = useTransition();
  const [name, setName] = useState(game.name);
  const [slug, setSlug] = useState(game.slug);
  const [servers, setServers] = useState<BuilderListItem[]>(() =>
    [...game.servers]
      .sort((a, b) => a.position - b.position)
      .map((server) => ({ id: server.id, label: server.label, key: server.id })),
  );
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const savedServers = [...game.servers].sort((a, b) => a.position - b.position);
  const dirty = isGameFormDirty(
    { name: game.name, slug: game.slug, servers: savedServers },
    { name, slug: slugify(slug), servers, hasNewImage: image !== null },
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError("O nome do jogo precisa ter ao menos 2 caracteres.");
      return;
    }

    startSave(async () => {
      // A arte primeiro: se ela falhar, nada foi gravado e a pessoa tenta de
      // novo com o formulário intacto.
      if (image) {
        const form = new FormData();
        form.set("image", image, image.name);
        const uploaded = await runAction(() => uploadLogoAction(game.id, form), {
          ok: false,
          reason: "error",
          message: ACTION_FAILED_UPLOAD_MESSAGE,
        });
        if (!uploaded.ok) {
          setError(uploaded.message ?? ERROR_MESSAGES[uploaded.reason]);
          return;
        }
      }

      const result = await runAction(
        () =>
          updateGameAction(game.id, {
            name,
            slug: slugify(slug),
            servers: servers.map((server) => ({ id: server.id, label: server.label })),
          }),
        { ok: false, reason: "error", message: ERROR_MESSAGES.error },
      );

      if (!result.ok) {
        setError(result.message ?? ERROR_MESSAGES[result.reason]);
        return;
      }
      toastOk("Jogo salvo.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby="visao-geral-titulo">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(0,315px))] gap-x-[50px] gap-y-[49px]">
        <TextField
          label="Nome"
          name="name"
          autoComplete="off"
          maxLength={120}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <div>
          <TextField
            label="Link na loja:"
            name="slug"
            autoComplete="off"
            maxLength={80}
            value={slug}
            onChange={(event) => setSlug(slugifyDraft(event.target.value))}
          />
          <p className="mt-[6px] pl-[25px] font-helvetica text-[12px] text-brand-fg-subtle">
            /games/{slugify(slug) || "…"}
            {slugify(slug) !== game.slug ? " (o link antigo deixa de funcionar)" : ""}
          </p>
        </div>

        <div className="flex items-end gap-[15px]">
          {game.imageUrl ? (
            <Image
              src={game.imageUrl}
              alt=""
              width={60}
              height={60}
              className="size-[60px] shrink-0 rounded-[12px] object-contain"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <FileField
              label="Imagem do jogo"
              placeholder="Trocar imagem"
              name="image"
              accept={ACCEPTED_IMAGE_TYPES}
              maxBytes={MAX_IMAGE_BYTES}
              onFileChange={setImage}
            />
          </div>
        </div>
      </div>

      <fieldset className="mt-[49px] flex max-w-[680px] flex-col gap-[15px]">
        <legend className="mb-[15px] font-poppins text-[16px] font-bold text-white">
          Servidores
        </legend>
        <ListPanel
          items={servers}
          onChange={setServers}
          addLabel="+ Adicionar servidor"
          itemLabel="Servidor"
          emptyHint="Nenhum servidor cadastrado."
        />
      </fieldset>

      <div className="sticky bottom-0 z-10 -mx-[20px] mt-[60px] flex flex-wrap items-center gap-[20px] rounded-b-[20px] border-t border-white/10 bg-brand-bg/95 px-[20px] py-[15px] sm:-mx-[30px] sm:px-[30px]">
        <div className="w-[315px] max-w-full">
          <Button type="submit" variant="primary" fullWidth disabled={isSaving || !dirty}>
            {isSaving ? "SALVANDO…" : "SALVAR ALTERAÇÕES"}
          </Button>
        </div>
        <p role="status" className="font-poppins text-[13px] text-brand-fg-subtle">
          {dirty ? <span className="text-brand-orange">Alterações ainda não salvas.</span> : "Nada a salvar."}
        </p>
        {error ? (
          <p role="alert" className="w-full font-helvetica text-[14px] text-red-9">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
