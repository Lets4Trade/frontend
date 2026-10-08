"use client";

import { slugify, slugifyDraft } from "@/lib/slugify";
import Image from "next/image";
import { useRef, useTransition } from "react";
import { TextField } from "@/components/ui/TextField";
import { toastError } from "@/components/ui/Toasts";
import { ACTION_FAILED_MESSAGE, ACTION_FAILED_UPLOAD_MESSAGE, runAction } from "@/lib/safeAction";
import {
  removeBannerAction,
  reorderBannersAction,
  uploadBannerAction,
  uploadLogoAction,
} from "./actions";
import { DESCRIPTION_LIMITS } from "@/features/game/description";
import { MarkdownTextArea } from "@/features/admin/MarkdownTextArea";
import type {
  BuilderCategory,
  BuilderListItem,
  DescriptionDraftGroup,
  DescriptionDraftItem,
  Draft,
} from "./types";
import { MAX_BANNERS } from "./types";

/**
 * Os painéis de edição do builder — um por etapa da lateral.
 *
 * Ficam num arquivo só porque são formulários curtos que compartilham a mesma
 * moldura e o mesmo jeito de mexer no rascunho. Nove arquivos de trinta linhas
 * espalhariam uma coisa que se lê melhor junta; se algum crescer a ponto de
 * pedir arquivo próprio, ele sai daqui sozinho.
 *
 * NENHUM deles chama a API de salvar. Todos mexem no rascunho em memória, e
 * quem publica é o botão "SALVAR E PUBLICAR PAGE" — que é o que o arquivo do
 * Figma desenha. As IMAGENS são a exceção declarada: sobem na hora, porque
 * binário não cabe no corpo do salvamento (ver `actions.ts`).
 */

/** Moldura comum: título, explicação e os campos. */
export function PanelShell({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby="painel-etapa"
      className="rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)] p-[40px]"
    >
      <h2
        id="painel-etapa"
        className="font-helvetica text-[24px] leading-none font-bold tracking-[0.24px] text-white"
      >
        {title}
      </h2>
      <p className="mt-[12px] font-poppins text-[14px] text-brand-fg-subtle">{hint}</p>
      <div className="mt-[30px] flex flex-col gap-[25px]">{children}</div>
    </section>
  );
}

/** Etapa 1 — Títulos. */
export function TitlesPanel({
  draft,
  patch,
  derivedHeading,
}: {
  draft: Draft;
  patch: (next: Partial<Draft>) => void;
  derivedHeading: string;
}) {
  return (
    <>
      <TextField
        label="Título principal da página"
        value={draft.heading}
        maxLength={160}
        // O placeholder é o título que a loja usa quando este campo fica vazio.
        // Mostrá-lo aqui é o que deixa claro que vazio NÃO é uma página sem
        // título — é a página no automático.
        placeholder={derivedHeading}
        onChange={(event) => patch({ heading: event.target.value })}
      />
      <p className="-mt-[15px] font-poppins text-[13px] text-brand-fg-subtle">
        Deixe em branco para a loja montar sozinha: “{derivedHeading}”.
      </p>

      <TextField
        label="Rótulo da seção de servidores"
        value={draft.serversLabel}
        maxLength={80}
        placeholder="Selecionar servidor"
        onChange={(event) => patch({ serversLabel: event.target.value })}
      />

      <TextField
        label="Rótulo da seção de categorias"
        value={draft.categoriesLabel}
        maxLength={80}
        placeholder="Selecionar categoria"
        onChange={(event) => patch({ categoriesLabel: event.target.value })}
      />
    </>
  );
}

/** Etapa 4 — Nome do game e link na loja. */
export function NamePanel({
  draft,
  patch,
  publishedSlug,
}: {
  draft: Draft;
  patch: (next: Partial<Draft>) => void;
  /** O link que está NO AR — para avisar quando o rascunho for trocá-lo. */
  publishedSlug: string;
}) {
  const nextSlug = slugify(draft.slug);
  const changing = nextSlug !== "" && nextSlug !== publishedSlug;

  return (
    <>
      <TextField
        label="Nome do game"
        value={draft.name}
        maxLength={120}
        onChange={(event) => patch({ name: event.target.value })}
      />
      {/* Renomear NÃO muda o link sozinho (2026-09-25: o link passou a ser
          editável, mas continua sendo decisão explícita — ele pode estar
          compartilhado e indexado). */}
      <TextField
        label="Link na loja"
        value={draft.slug}
        maxLength={80}
        placeholder="link-do-jogo"
        onChange={(event) => patch({ slug: slugifyDraft(event.target.value) })}
      />
      <p className="-mt-[15px] font-poppins text-[13px] text-brand-fg-subtle">
        Endereço: <span className="text-white">/games/{nextSlug || publishedSlug}</span>
        {changing ? (
          <>
            {" "}
            Ao publicar, <span className="text-white">/games/{publishedSlug}</span> deixa de
            funcionar. Os slides da home que usam este game acompanham sozinhos; links
            digitados à mão em outros lugares (rodapé, guias) precisam ser trocados.
          </>
        ) : null}
      </p>
    </>
  );
}

/**
 * Etapa 9 — Descrição (2026-10-08): quantos blocos quiser, cada um com título e
 * pares subtítulo/texto, no formato das Dúvidas. Na loja eles tomam o lugar do
 * grupo "Dúvidas frequentes" padrão: o título vai na barrinha laranja, o
 * subtítulo no lugar da pergunta e o texto no da resposta. Controles ↑ ↓ ✕
 * iguais aos das outras listas do builder, nos dois níveis.
 */
export function DescriptionPanel({
  draft,
  patch,
}: {
  draft: Draft;
  patch: (next: Partial<Draft>) => void;
}) {
  const groups = draft.descriptionGroups;
  const setGroups = (descriptionGroups: DescriptionDraftGroup[]) => patch({ descriptionGroups });
  const editGroup = (key: string, next: Partial<DescriptionDraftGroup>) =>
    setGroups(groups.map((group) => (group.key === key ? { ...group, ...next } : group)));
  // `randomUUID` só para a CHAVE do React; nunca vai ao servidor.
  const newItem = (): DescriptionDraftItem => ({ key: crypto.randomUUID(), subtitle: "", text: "" });

  return (
    <>
      {groups.length === 0 ? (
        <p className="font-poppins text-[13px] text-brand-fg-subtle">
          Sem descrição: a página mostra as Dúvidas frequentes padrão.
        </p>
      ) : null}

      <ul className="flex flex-col gap-[20px]">
        {groups.map((group, index) => {
          const name = group.title.trim() || `título ${index + 1}`;
          const fullItems = group.items.length >= DESCRIPTION_LIMITS.itemsPerGroup;
          return (
            <li
              key={group.key}
              className="flex flex-col gap-[12px] rounded-[20px] border border-white/10 bg-black/20 p-[15px]"
            >
              <div className="flex items-end gap-[10px]">
                <div className="min-w-0 flex-1">
                  <TextField
                    label={`Título ${index + 1}`}
                    value={group.title}
                    maxLength={DESCRIPTION_LIMITS.title}
                    placeholder="Dúvidas frequentes"
                    onChange={(event) => editGroup(group.key, { title: event.target.value })}
                  />
                </div>
                <RowButton
                  label={`Mover ${name} para cima`}
                  onClick={() => setGroups(moveByKey(groups, group.key, -1))}
                  disabled={index === 0}
                >
                  ↑
                </RowButton>
                <RowButton
                  label={`Mover ${name} para baixo`}
                  onClick={() => setGroups(moveByKey(groups, group.key, 1))}
                  disabled={index === groups.length - 1}
                >
                  ↓
                </RowButton>
                <RowButton
                  label={`Remover ${name} e os subtítulos dele`}
                  onClick={() => setGroups(groups.filter((current) => current.key !== group.key))}
                  danger
                >
                  ✕
                </RowButton>
              </div>

              {group.items.length > 0 ? (
                <ul className="flex flex-col gap-[15px] pl-[20px] sm:pl-[40px]">
                  {group.items.map((item, itemIndex) => (
                    <DescriptionItemRow
                      key={item.key}
                      item={item}
                      index={itemIndex}
                      isLast={itemIndex === group.items.length - 1}
                      onChange={(next) =>
                        editGroup(group.key, {
                          items: group.items.map((current) =>
                            current.key === item.key ? { ...current, ...next } : current,
                          ),
                        })
                      }
                      onMove={(direction) =>
                        editGroup(group.key, { items: moveByKey(group.items, item.key, direction) })
                      }
                      onRemove={() =>
                        editGroup(group.key, {
                          items: group.items.filter((current) => current.key !== item.key),
                        })
                      }
                    />
                  ))}
                </ul>
              ) : null}

              <button
                type="button"
                disabled={fullItems}
                onClick={() => editGroup(group.key, { items: [...group.items, newItem()] })}
                className="ml-[20px] h-[40px] rounded-full border border-dashed border-white/15 font-poppins text-[13px] font-bold text-white/70 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:ml-[40px]"
              >
                + Adicionar subtítulo{group.title.trim() ? ` em ${group.title.trim()}` : ""}
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        disabled={groups.length >= DESCRIPTION_LIMITS.groups}
        onClick={() =>
          setGroups([...groups, { key: crypto.randomUUID(), title: "", items: [newItem()] }])
        }
        className="h-[50px] w-full rounded-full border border-dashed border-white/20 font-poppins text-[14px] font-bold text-white/80 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        + Adicionar título
      </button>
      <p className="-mt-[15px] font-poppins text-[13px] text-brand-fg-subtle">
        Na loja, substitui o grupo Dúvidas frequentes: cada título leva a barrinha
        laranja, e cada subtítulo aparece como uma pergunta com o texto embaixo.
        Até {DESCRIPTION_LIMITS.groups} títulos com {DESCRIPTION_LIMITS.itemsPerGroup} subtítulos
        cada. No texto, selecione um trecho e use os botões (negrito, itálico,
        link, listas); as quebras de linha são mantidas.
      </p>
    </>
  );
}

/** Um par subtítulo + texto da descrição, com ↑ ↓ ✕. */
function DescriptionItemRow({
  item,
  index,
  isLast,
  onChange,
  onMove,
  onRemove,
}: {
  item: DescriptionDraftItem;
  index: number;
  isLast: boolean;
  onChange: (next: Partial<DescriptionDraftItem>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const name = item.subtitle.trim() || `subtítulo ${index + 1}`;
  return (
    <li className="flex flex-col gap-[10px]">
      <div className="flex items-end gap-[10px]">
        <div className="min-w-0 flex-1">
          <TextField
            label={`Subtítulo ${index + 1}`}
            value={item.subtitle}
            maxLength={DESCRIPTION_LIMITS.subtitle}
            placeholder="Como faço pra comprar?"
            onChange={(event) => onChange({ subtitle: event.target.value })}
          />
        </div>
        <RowButton label={`Mover ${name} para cima`} onClick={() => onMove(-1)} disabled={index === 0}>
          ↑
        </RowButton>
        <RowButton label={`Mover ${name} para baixo`} onClick={() => onMove(1)} disabled={isLast}>
          ↓
        </RowButton>
        <RowButton label={`Remover ${name}`} onClick={onRemove} danger>
          ✕
        </RowButton>
      </div>
      <MarkdownTextArea
        label={`Texto ${index + 1}`}
        value={item.text}
        maxLength={DESCRIPTION_LIMITS.text}
        onChange={(text) => onChange({ text })}
      />
    </li>
  );
}

// Etapa 5 ("Categorias Principais") deixou de ter painel em 2026-09-28: as
// abas são por jogo, em Jogos → Abas (`features/admin/games/tabs`).

/**
 * Etapas 6 e 7 — listas editáveis de servidores e categorias.
 *
 * O MESMO componente para as duas: a diferença entre elas é o rótulo e o
 * destino no rascunho, e nada mais. Duas cópias seria duas listas que começam
 * iguais e divergem no primeiro ajuste.
 *
 * Remover aqui só tira a linha do RASCUNHO. Quem recusa de verdade é o backend,
 * no salvamento, quando a linha ainda tem produtos ligados — e a recusa vem com
 * o número deles.
 */
export function ListPanel({
  items,
  onChange,
  addLabel,
  itemLabel,
  emptyHint,
  onDuplicate,
  duplicating = false,
}: {
  items: BuilderListItem[];
  onChange: (next: BuilderListItem[]) => void;
  addLabel: string;
  itemLabel: string;
  emptyHint: string;
  /**
   * Botão "Duplicar" em cada linha JÁ SALVA (com `id`) — servidores da Central
   * do jogo, 2026-10-08. Linha nova ainda não existe no banco para ser copiada.
   */
  onDuplicate?: (item: BuilderListItem) => void;
  duplicating?: boolean;
}) {
  function add() {
    onChange([
      ...items,
      // `crypto.randomUUID` só para a CHAVE do React — duas linhas novas não
      // têm id de banco e não podem compartilhar chave. Nunca vai ao servidor.
      { key: crypto.randomUUID(), label: "" },
    ]);
  }

  function rename(key: string, label: string) {
    onChange(items.map((item) => (item.key === key ? { ...item, label } : item)));
  }

  function remove(key: string) {
    onChange(items.filter((item) => item.key !== key));
  }

  function move(key: string, direction: -1 | 1) {
    const index = items.findIndex((item) => item.key === key);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return;

    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <>
      {items.length === 0 ? (
        <p className="font-poppins text-[13px] text-brand-fg-subtle">{emptyHint}</p>
      ) : null}

      <ul className="flex flex-col gap-[15px]">
        {items.map((item, index) => (
          <li key={item.key} className="flex items-end gap-[10px]">
            <div className="flex-1">
              <TextField
                label={`${itemLabel} ${index + 1}`}
                value={item.label}
                maxLength={120}
                onChange={(event) => rename(item.key, event.target.value)}
              />
            </div>

            <RowButton
              label={`Mover ${item.label || itemLabel} para cima`}
              onClick={() => move(item.key, -1)}
              disabled={index === 0}
            >
              ↑
            </RowButton>
            <RowButton
              label={`Mover ${item.label || itemLabel} para baixo`}
              onClick={() => move(item.key, 1)}
              disabled={index === items.length - 1}
            >
              ↓
            </RowButton>
            {onDuplicate && item.id ? (
              <button
                type="button"
                onClick={() => onDuplicate(item)}
                disabled={duplicating}
                aria-label={`Duplicar ${item.label || itemLabel}`}
                title="Duplicar com categorias e produtos"
                className="h-[50px] shrink-0 rounded-[8px] border border-white/10 bg-[image:var(--brand-surface-fill)] px-[14px] font-poppins text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Duplicar
              </button>
            ) : null}
            <RowButton
              label={`Remover ${item.label || itemLabel}`}
              onClick={() => remove(item.key)}
              danger
            >
              ✕
            </RowButton>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={add}
        className="h-[50px] w-full rounded-full border border-dashed border-white/20 font-poppins text-[14px] font-bold text-white/80 transition-opacity hover:opacity-90"
      >
        {addLabel}
      </button>
    </>
  );
}

/**
 * Etapa 7 — categorias com SUBCATEGORIAS (contrato C da FASE 4).
 *
 * Não reaproveita o `ListPanel` porque a unidade aqui é um bloco (categoria +
 * filhas), mas os controles são os mesmos — renomear, ↑ ↓ e ✕ — para as duas
 * listas não ensinarem gestos diferentes.
 *
 * Dois níveis e nenhum a mais: subcategoria não tem botão de "adicionar sub",
 * e o próprio tipo (`BuilderCategory`) não tem onde guardar um neto.
 *
 * Reordenar move DENTRO do nível: subcategoria não troca de pai por aqui. Para
 * mudar de pai, remove-se e cria-se de novo — trocar de pai com produto ligado
 * é decisão que merece ser explícita, e o backend recusa a remoção enquanto
 * houver produto.
 */
export function CategoryTreePanel({
  items,
  onChange,
  emptyText = "Nenhuma categoria global. As abas ainda podem ter categorias próprias (Central do jogo → Abas e produtos).",
}: {
  items: BuilderCategory[];
  onChange: (next: BuilderCategory[]) => void;
  /**
   * Lista vazia. NÃO pode dizer "o painel não aparece na loja": as categorias
   * são de três escopos (global, aba, servidor) e esta lista é só um deles —
   * quem sabe se o painel aparece é o quadro "Na loja mostra" da Central.
   */
  emptyText?: string;
}) {
  function patchCategory(key: string, next: Partial<BuilderCategory>) {
    onChange(items.map((item) => (item.key === key ? { ...item, ...next } : item)));
  }

  function addCategory() {
    // `randomUUID` só para a CHAVE do React; nunca vai ao servidor.
    onChange([...items, { key: crypto.randomUUID(), label: "", children: [] }]);
  }

  function addChild(parent: BuilderCategory) {
    patchCategory(parent.key, {
      children: [...parent.children, { key: crypto.randomUUID(), label: "" }],
    });
  }

  return (
    <>
      {items.length === 0 ? (
        <p className="font-poppins text-[13px] text-brand-fg-subtle">
          {emptyText}
        </p>
      ) : null}

      <ul className="flex flex-col gap-[20px]">
        {items.map((category, index) => (
          <li
            key={category.key}
            className="flex flex-col gap-[12px] rounded-[20px] border border-white/10 bg-black/20 p-[15px]"
          >
            <ItemRow
              label={`Categoria ${index + 1}`}
              fallback="categoria"
              item={category}
              isFirst={index === 0}
              isLast={index === items.length - 1}
              onRename={(label) => patchCategory(category.key, { label })}
              onMove={(direction) => onChange(moveByKey(items, category.key, direction))}
              onRemove={() => onChange(items.filter((item) => item.key !== category.key))}
            />

            {category.children.length > 0 ? (
              <ul className="flex flex-col gap-[12px] pl-[20px] sm:pl-[40px]">
                {category.children.map((child, childIndex) => (
                  <li key={child.key}>
                    <ItemRow
                      label={`Subcategoria ${childIndex + 1}`}
                      fallback="subcategoria"
                      item={child}
                      isFirst={childIndex === 0}
                      isLast={childIndex === category.children.length - 1}
                      onRename={(label) =>
                        patchCategory(category.key, {
                          children: category.children.map((current) =>
                            current.key === child.key ? { ...current, label } : current,
                          ),
                        })
                      }
                      onMove={(direction) =>
                        patchCategory(category.key, {
                          children: moveByKey(category.children, child.key, direction),
                        })
                      }
                      onRemove={() =>
                        patchCategory(category.key, {
                          children: category.children.filter((current) => current.key !== child.key),
                        })
                      }
                    />
                  </li>
                ))}
              </ul>
            ) : null}

            <button
              type="button"
              onClick={() => addChild(category)}
              className="ml-[20px] h-[40px] rounded-full border border-dashed border-white/15 font-poppins text-[13px] font-bold text-white/70 transition-opacity hover:opacity-90 sm:ml-[40px]"
            >
              + Adicionar subcategoria{category.label.trim() ? ` em ${category.label.trim()}` : ""}
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={addCategory}
        className="h-[50px] w-full rounded-full border border-dashed border-white/20 font-poppins text-[14px] font-bold text-white/80 transition-opacity hover:opacity-90"
      >
        + Adicionar categoria
      </button>
      <p className="-mt-[15px] font-poppins text-[13px] text-brand-fg-subtle">
        Remover uma categoria remove as subcategorias dela. Se alguma ainda tiver
        produtos, a publicação é recusada com a contagem.
      </p>
    </>
  );
}

/** Uma linha editável: campo + ↑ ↓ ✕. */
function ItemRow({
  label,
  fallback,
  item,
  isFirst,
  isLast,
  onRename,
  onMove,
  onRemove,
}: {
  label: string;
  fallback: string;
  item: BuilderListItem;
  isFirst: boolean;
  isLast: boolean;
  onRename: (label: string) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const name = item.label || fallback;
  return (
    <div className="flex items-end gap-[10px]">
      <div className="min-w-0 flex-1">
        <TextField
          label={label}
          value={item.label}
          maxLength={120}
          onChange={(event) => onRename(event.target.value)}
        />
      </div>
      <RowButton label={`Mover ${name} para cima`} onClick={() => onMove(-1)} disabled={isFirst}>
        ↑
      </RowButton>
      <RowButton label={`Mover ${name} para baixo`} onClick={() => onMove(1)} disabled={isLast}>
        ↓
      </RowButton>
      <RowButton label={`Remover ${name}`} onClick={onRemove} danger>
        ✕
      </RowButton>
    </div>
  );
}

/** Troca o item de `key` com o vizinho; fora dos limites devolve a lista igual. */
export function moveByKey<T extends { key: string }>(items: T[], key: string, direction: -1 | 1): T[] {
  const index = items.findIndex((item) => item.key === key);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function RowButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex size-[50px] shrink-0 items-center justify-center rounded-[8px] border font-poppins text-[16px] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30 ${
        danger
          ? "border-white/10 bg-black/40 text-brand-orange"
          : "border-white/10 bg-[image:var(--brand-surface-fill)] text-white"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Etapas 2 e 3 — as imagens.
 *
 * Sobem NA HORA em que o arquivo é escolhido, e não no botão de publicar:
 * binário não cabe no corpo JSON do salvamento, e reenviar a arte a cada
 * gravação seria mandar megabytes para trocar um título. A consequência
 * honesta, e que a tela diz: a imagem já está publicada assim que aparece aqui.
 */
export function LogoPanel({
  gameId,
  imageUrl,
  onUploaded,
}: {
  gameId: string;
  imageUrl: string | null;
  onUploaded: (url: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  function send(file: File) {
    const form = new FormData();
    form.append("image", file);

    startTransition(async () => {
      const result = await runAction(() => uploadLogoAction(gameId, form), {
        ok: false,
        reason: "error",
        message: ACTION_FAILED_UPLOAD_MESSAGE,
      });
      if (result.ok) onUploaded(result.data.imageUrl);
      else toastError(result.message ?? "Não foi possível enviar a imagem.");
    });
  }

  return (
    <>
      <div className="flex items-center gap-[25px]">
        <div className="relative h-[164px] w-[199px] shrink-0 rounded-[12px] border border-white/10 bg-black/40">
          {imageUrl ? (
            <Image src={imageUrl} alt="" fill sizes="200px" className="object-contain p-[10px]" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center font-poppins text-[13px] text-white/30">
              Sem arte
            </span>
          )}
        </div>

        <div className="flex flex-col gap-[10px]">
          <UploadButton
            inputRef={input}
            pending={pending}
            onPick={([file]) => send(file)}
            label={imageUrl ? "Trocar a logo" : "Enviar a logo"}
          />
          <p className="max-w-[420px] font-poppins text-[13px] text-brand-fg-subtle">
            PNG, JPEG ou WebP, até 5 MB. A arte entra numa caixa de 199×164 sem
            esticar, então o formato original é preservado.
          </p>
        </div>
      </div>
    </>
  );
}

export function BannerPanel({
  gameId,
  banners,
  onChange,
}: {
  gameId: string;
  banners: Draft["banners"];
  onChange: (next: Draft["banners"]) => void;
}) {
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const room = MAX_BANNERS - banners.length;

  // Várias de uma vez (2026-10-08): sobem UMA a UMA, na ordem escolhida, e a
  // lista cresce a cada uma que chega. Para no primeiro erro, para a mensagem
  // dizer qual falhou em vez de cinco toasts iguais.
  function send(files: File[]) {
    const batch = files.slice(0, Math.max(room, 0));
    if (files.length > batch.length) {
      toastError(`Cabem só mais ${Math.max(room, 0)} banner(s): o máximo é ${MAX_BANNERS}.`);
    }
    if (batch.length === 0) return;

    startTransition(async () => {
      let list = banners;
      for (const file of batch) {
        const form = new FormData();
        form.append("image", file);
        const result = await runAction(() => uploadBannerAction(gameId, form), {
          ok: false,
          reason: "error",
          message: ACTION_FAILED_UPLOAD_MESSAGE,
        });
        if (!result.ok) {
          toastError(`${file.name}: ${result.message ?? "Não foi possível enviar o banner."}`);
          return;
        }
        list = [...list, { id: result.data.id, imageUrl: result.data.imageUrl }];
        onChange(list);
      }
    });
  }

  function drop(bannerId: string) {
    startTransition(async () => {
      const result = await runAction(() => removeBannerAction(gameId, bannerId), {
        ok: false,
        reason: "error",
        message: ACTION_FAILED_MESSAGE,
      });
      if (result.ok) onChange(banners.filter((banner) => banner.id !== bannerId));
      else toastError(result.message ?? "Não foi possível remover o banner.");
    });
  }

  // A ordem grava NA HORA, como o upload: banner nunca fica "pendente de
  // publicação". A tela muda antes e volta atrás se o servidor recusar.
  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= banners.length) return;
    const previous = banners;
    const next = [...banners];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);

    startTransition(async () => {
      const result = await runAction(
        () => reorderBannersAction(gameId, next.map((banner) => banner.id)),
        { ok: false, reason: "error", message: ACTION_FAILED_MESSAGE },
      );
      if (!result.ok) {
        onChange(previous);
        toastError(result.message ?? "Não foi possível salvar a ordem dos banners.");
      }
    });
  }

  return (
    <>
      <ul className="flex flex-col gap-[15px]">
        {banners.map((banner, index) => (
          <li key={banner.id} className="flex flex-wrap items-center gap-[15px]">
            <span className="w-[22px] text-center font-poppins text-[14px] font-bold text-white/60">
              {index + 1}
            </span>
            <div className="relative h-[100px] w-[350px] max-w-full shrink-0 overflow-hidden rounded-[12px] border border-white/10">
              <Image src={banner.imageUrl} alt="" fill sizes="350px" className="object-cover" />
            </div>
            <RowButton
              label={`Mover banner ${index + 1} para cima`}
              onClick={() => move(index, -1)}
              disabled={pending || index === 0}
            >
              ↑
            </RowButton>
            <RowButton
              label={`Mover banner ${index + 1} para baixo`}
              onClick={() => move(index, 1)}
              disabled={pending || index === banners.length - 1}
            >
              ↓
            </RowButton>
            <button
              type="button"
              onClick={() => drop(banner.id)}
              disabled={pending}
              className="h-[50px] rounded-full border border-white/10 bg-black/40 px-[25px] font-poppins text-[14px] font-bold text-brand-orange transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Remover
            </button>
          </li>
        ))}
      </ul>

      {room > 0 ? (
        <UploadButton
          inputRef={input}
          pending={pending}
          onPick={send}
          multiple
          label={banners.length === 0 ? "Adicionar banners" : "Adicionar mais banners"}
        />
      ) : null}
      <p className="-mt-[15px] font-poppins text-[13px] text-brand-fg-subtle">
        Tamanho da imagem W:1715 H:490. Com mais de um, a loja mostra um slider
        na ordem acima (passa sozinho a cada 6 segundos, com setas e barrinhas).
        Dá para escolher várias imagens de uma vez; até {MAX_BANNERS} banners
        ({banners.length} de {MAX_BANNERS}). Sem nenhum, a faixa do topo não
        aparece na loja.
      </p>
    </>
  );
}

function UploadButton({
  inputRef,
  pending,
  onPick,
  label,
  multiple = false,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  pending: boolean;
  /** Um arquivo, ou vários com `multiple`, na ordem escolhida. */
  onPick: (files: File[]) => void;
  label: string;
  multiple?: boolean;
}) {
  return (
    <label className="inline-flex h-[50px] w-fit cursor-pointer items-center rounded-full bg-[image:var(--brand-orange-gradient)] px-[35px] font-poppins text-[14px] font-bold text-white transition-opacity hover:opacity-90">
      {pending ? "Enviando..." : label}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        disabled={pending}
        className="sr-only"
        multiple={multiple}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          // O valor é limpo para escolher O MESMO arquivo de novo disparar o
          // evento — sem isso, tentar reenviar depois de um erro não faz nada.
          event.target.value = "";
          if (files.length > 0) onPick(files);
        }}
      />
    </label>
  );
}
