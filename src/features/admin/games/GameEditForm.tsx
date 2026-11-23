"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { toastError, toastOk } from "@/components/ui/Toasts";
import { FileField } from "@/components/ui/FileField";
import { TextField } from "@/components/ui/TextField";
import { uploadLogoAction } from "@/features/admin/builder/actions";
import { ListPanel } from "@/features/admin/builder/BuilderPanels";
import type {
  BuilderGame,
  BuilderListItem,
} from "@/features/admin/builder/types";
import { ACTION_FAILED_UPLOAD_MESSAGE, runAction } from "@/lib/safeAction";
import { slugify, slugifyDraft } from "@/lib/slugify";
import { isGameFormDirty } from "./central";
import { duplicateServerAction, updateGameAction } from "./editActions";
import {
  ConfirmDeleteDialog,
  blockedProductCount,
} from "@/features/admin/ConfirmDeleteDialog";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "./options";
import { PlatformIcon } from "@/features/game/PlatformIcon";
import { EyeIcon } from "@/features/admin/products/ProductPriceTable";
import {
  SERVER_PLATFORMS,
  SERVER_PLATFORM_LABEL,
  isServerPlatform,
} from "@/features/game/serverPlatform";

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
  // "Apagar tudo" (2026-11-17): a recusa por produto abre a confirmação.
  const [confirm, setConfirm] = useState<{ count: number } | null>(null);
  const [isDuplicating, startDuplicate] = useTransition();
  const [name, setName] = useState(game.name);
  const [slug, setSlug] = useState(game.slug);
  const [servers, setServers] = useState<BuilderListItem[]>(() =>
    [...game.servers]
      .sort((a, b) => a.position - b.position)
      .map((server) => ({
        id: server.id,
        label: server.label,
        key: server.id,
        platform: server.platform ?? null,
        isHidden: server.isHidden === true,
      })),
  );
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const savedServers = [...game.servers].sort(
    (a, b) => a.position - b.position,
  );
  const dirty = isGameFormDirty(
    { name: game.name, slug: game.slug, servers: savedServers },
    { name, slug: slugify(slug), servers, hasNewImage: image !== null },
  );

  /**
   * Duplicar grava NA HORA (não espera o SALVAR) e a tela recarrega com a
   * cópia na lista. Com alterações pendentes, recusa: recarregar as perderia.
   */
  function handleDuplicate(server: BuilderListItem) {
    if (!server.id) return;
    if (dirty) {
      toastError(
        "Salve (ou desfaça) as alterações antes de duplicar um servidor.",
      );
      return;
    }
    const serverId = server.id;
    startDuplicate(async () => {
      const result = await runAction(
        () => duplicateServerAction(game.id, serverId),
        {
          ok: false,
          reason: "error",
          message: ERROR_MESSAGES.error,
        },
      );
      if (!result.ok) {
        toastError(result.message ?? ERROR_MESSAGES[result.reason]);
        return;
      }
      const { server: copy, products, categories } = result.data;
      toastOk(
        `"${copy.label}" criado com ${products} produto(s) e ${categories} categoria(s). Renomeie na lista e salve.`,
      );
      router.refresh();
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError("O nome do jogo precisa ter ao menos 2 caracteres.");
      return;
    }

    save(false);
  }

  /**
   * `deleteProducts` (2026-11-17): a 2ª chamada, depois do "APAGAR TUDO" do
   * modal. Ela não reenvia o logo — ele já subiu na 1ª tentativa.
   */
  function save(deleteProducts: boolean) {
    startSave(async () => {
      // A arte primeiro: se ela falhar, nada foi gravado e a pessoa tenta de
      // novo com o formulário intacto.
      if (image && !deleteProducts) {
        const form = new FormData();
        form.set("image", image, image.name);
        const uploaded = await runAction(
          () => uploadLogoAction(game.id, form),
          {
            ok: false,
            reason: "error",
            message: ACTION_FAILED_UPLOAD_MESSAGE,
          },
        );
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
            servers: servers.map((server) => ({
              id: server.id,
              label: server.label,
              platform: server.platform ?? null,
              isHidden: server.isHidden === true,
            })),
            deleteProducts,
          }),
        { ok: false, reason: "error", message: ERROR_MESSAGES.error },
      );

      if (!result.ok) {
        // Servidor removido com produto: pergunta antes de apagar tudo.
        const blocked = blockedProductCount(result.message);
        if (blocked !== null && !deleteProducts) {
          setConfirm({ count: blocked });
          return;
        }
        setConfirm(null);
        setError(result.message ?? ERROR_MESSAGES[result.reason]);
        return;
      }
      setConfirm(null);
      toastOk("Jogo salvo.");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby="visao-geral-titulo"
    >
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
            {slugify(slug) !== game.slug
              ? " (o link antigo deixa de funcionar)"
              : ""}
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
              label="Logo do jogo (400×330, PNG com fundo transparente)"
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
        {/* Servidores PRONTOS (2026-11-22, pedido do usuário): um clique cria
            "PC", "PlayStation" ou "Xbox" já com a plataforma — que dá o ícone
            na loja. Some o atalho da que já está na lista. */}
        <div className="flex flex-wrap gap-[10px]">
          {SERVER_PLATFORMS.filter(
            (platform) =>
              !servers.some((server) => server.platform === platform),
          ).map((platform) => (
            <button
              key={platform}
              type="button"
              onClick={() =>
                setServers((current) => [
                  ...current,
                  {
                    key: crypto.randomUUID(),
                    label: SERVER_PLATFORM_LABEL[platform],
                    platform,
                  },
                ])
              }
              className="inline-flex h-[40px] items-center gap-[8px] rounded-full border border-white/15 bg-[image:var(--brand-surface-fill)] px-[16px] font-poppins text-[13px] font-bold text-white transition-opacity hover:opacity-90"
            >
              <PlatformIcon platform={platform} className="size-[16px]" />+{" "}
              {SERVER_PLATFORM_LABEL[platform]}
            </button>
          ))}
        </div>
        <ListPanel
          items={servers}
          onChange={setServers}
          addLabel="+ Adicionar servidor"
          itemLabel="Servidor"
          emptyHint="Nenhum servidor cadastrado."
          onDuplicate={handleDuplicate}
          duplicating={isDuplicating || isSaving}
          renderExtra={(item, patch) => (
            <>
              <label className="flex shrink-0 flex-col gap-[6px]">
                <span className="font-poppins text-[12px] text-brand-fg-subtle">
                  Plataforma
                </span>
                <select
                  value={item.platform ?? ""}
                  onChange={(event) =>
                    patch({
                      platform: isServerPlatform(event.target.value)
                        ? event.target.value
                        : null,
                    })
                  }
                  aria-label={`Plataforma de ${item.label || "servidor"}`}
                  className="h-[50px] rounded-[8px] border border-white/10 bg-brand-surface px-[10px] font-poppins text-[13px] text-white outline-none focus-visible:border-brand-orange"
                >
                  <option value="">Nenhuma</option>
                  {SERVER_PLATFORMS.map((platform) => (
                    <option key={platform} value={platform}>
                      {SERVER_PLATFORM_LABEL[platform]}
                    </option>
                  ))}
                </select>
              </label>
              {/* Olho (2026-11-22, pedido do usuário): esconde o servidor da
                loja — some do seletor, os produtos dele saem da vitrine e o
                checkout recusa. Vale ao SALVAR, como o resto da linha. */}
              <button
                type="button"
                onClick={() => patch({ isHidden: !item.isHidden })}
                aria-pressed={item.isHidden === true}
                aria-label={
                  item.isHidden
                    ? `Mostrar ${item.label || "servidor"} no site`
                    : `Esconder ${item.label || "servidor"} do site`
                }
                title={
                  item.isHidden
                    ? "Escondido do site (clique para mostrar)"
                    : "Visível no site (clique para esconder)"
                }
                className={
                  "flex size-[50px] shrink-0 items-center justify-center rounded-[8px] border transition-colors " +
                  (item.isHidden
                    ? "border-brand-orange/60 bg-brand-orange/10 text-white/60 hover:text-white"
                    : "border-white/10 text-white hover:bg-white/5")
                }
              >
                <EyeIcon off={item.isHidden === true} className="size-[18px]" />
              </button>
            </>
          )}
        />
        <p className="font-poppins text-[13px] text-brand-fg-subtle">
          Duplicar cria uma cópia logo abaixo, com as categorias e os produtos
          ativos do servidor (preços, regras, textos e imagens). Depois é só
          trocar o nome e salvar.
        </p>
      </fieldset>

      <div className="sticky bottom-0 z-10 -mx-[20px] mt-[60px] flex flex-wrap items-center gap-[20px] rounded-b-[20px] border-t border-white/10 bg-brand-bg/95 px-[20px] py-[15px] sm:-mx-[30px] sm:px-[30px]">
        <div className="w-[315px] max-w-full">
          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={isSaving || !dirty}
          >
            {isSaving ? "SALVANDO…" : "SALVAR ALTERAÇÕES"}
          </Button>
        </div>
        <p
          role="status"
          className="font-poppins text-[13px] text-brand-fg-subtle"
        >
          {dirty ? (
            <span className="text-brand-orange">
              Alterações ainda não salvas.
            </span>
          ) : (
            "Nada a salvar."
          )}
        </p>
        {error ? (
          <p
            role="alert"
            className="w-full font-helvetica text-[14px] text-red-9"
          >
            {error}
          </p>
        ) : null}
      </div>
      <ConfirmDeleteDialog
        open={confirm !== null}
        title="Apagar servidor com os produtos dentro?"
        description={
          confirm ? (
            <>
              {confirm.count} produto{confirm.count === 1 ? " está" : "s estão"}{" "}
              em servidores que você tirou da lista. Ao confirmar, eles vão para
              a lixeira junto (dá para reativar na Central do jogo) e o servidor
              é apagado.
            </>
          ) : null
        }
        pending={isSaving}
        onConfirm={() => save(true)}
        onCancel={() => setConfirm(null)}
      />
    </form>
  );
}
