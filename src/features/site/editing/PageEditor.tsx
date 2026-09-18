"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { toastError, toastOk } from "@/components/ui/Toasts";
import { cn } from "@/lib/cn";
import {
  addSectionItemAction,
  deleteSectionItemAction,
  publishPageAction,
  removeVideoAction,
  reorderSectionItemsAction,
  saveVideoLinkAction,
  uploadItemImageAction,
  uploadSectionImageAction,
  videoUploadedAction,
} from "../actions";
import { ItemToolbar, type ItemSelection } from "./ItemToolbar";
import { uploadSectionVideo, VIDEO_ACCEPT } from "./videoUpload";
import { VideoToolbar, type VideoSelection } from "./VideoToolbar";
import { SectionOrderList } from "./SectionOrderList";
import { useScaledPreview } from "./useScaledPreview";

/**
 * Edição da página no PRÓPRIO desenho dela (2026-09-15) — substitui o
 * formulário de "Edição de sessões".
 *
 * ── Como funciona ──────────────────────────────────────────────────────────
 * O SERVIDOR entrega a página montada, bloco a bloco, como a loja a desenha.
 * Aqui ela é reduzida por `transform: scale` e ganha um modo de edição: clicar
 * num texto edita ali mesmo, clicar numa arte abre o seletor de arquivo, e a
 * lista lateral arrasta as sessões.
 *
 * ── Por que atributo no HTML, e não um componente `<Editable>` ────────────
 * Cada pedaço editável carrega `data-edit-field` (texto da sessão),
 * `data-edit-image` (arte da sessão) ou `data-edit-item` (campo de um item de
 * lista). O editor acha pelo atributo. Envolver cada texto num componente que
 * sabe editar levaria o código de edição para as páginas PÚBLICAS, que são a
 * maior parte do tráfego e não têm nada a ver com isso.
 *
 * ── Rascunho e publicação ──────────────────────────────────────────────────
 * Texto e ordem ficam em RASCUNHO até "PUBLICAR" (escolha do usuário). A ARTE é
 * exceção e sobe na hora: binário não cabe num rascunho de memória — a mesma
 * regra do Builder de Páginas.
 */

export type EditorBlock = {
  key: string;
  label: string;
  gap: number;
  node: ReactNode;
  /**
   * Como a seção chama UM item da lista ("review", "membro"). Ausente = a seção
   * não tem lista, e o item não ganha barrinha de ações.
   */
  itemLabel?: string;
  /**
   * Listas EXTRAS que este bloco desenha, por chave cheia. O hero tem duas: os
   * cards do carrossel (`home:hero`) e as artes do banner
   * (`home:hero-banner`), que não é uma sessão do catálogo.
   */
  itemLabels?: Record<string, string>;
};

/** Largura real do desenho da loja — a mesma de `app/page.tsx`. */
const PAGE_WIDTH = 1820;

/** Chave de rascunho de item: `item|<sessao>|<id>|<campo>`. */
const ITEM_PREFIX = "item|";

type Draft = Record<string, string>;
type PendingImage =
  /** `slot` "secondary" = a segunda arte da sessão (foto do CEO no vídeo). */
  | { kind: "section"; key: string; slot?: "secondary" }
  | { kind: "item"; sectionKey: string; id: string; field: string }
  /**
   * Item que ainda NÃO existe: nasce no banco só quando o arquivo chega.
   *
   * Criar antes e preencher depois deixava lixo — quem abre o seletor e
   * desiste (fechar a janela do sistema não avisa a página) ficava com um item
   * sem arte, invisível na loja e somando um a cada clique.
   */
  | { kind: "new-item"; sectionKey: string; itemLabel: string; field: string };

export function PageEditor({
  page,
  pageLabel,
  blocks,
  initialOrder,
  initialHidden,
}: {
  page: string;
  pageLabel: string;
  blocks: EditorBlock[];
  initialOrder: string[];
  initialHidden: string[];
}) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [hidden, setHidden] = useState(initialHidden);
  const [draft, setDraft] = useState<Draft>({});
  const [publishing, setPublishing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  /**
   * A escolha de recolher a lista fica GRAVADA no navegador de quem edita.
   * Começa aberta no servidor e no primeiro quadro (senão o HTML do servidor e
   * o do cliente discordariam), e o efeito aplica a preferência logo depois.
   */
  useEffect(() => {
    try {
      if (localStorage.getItem("l4t-editor-sidebar") === "fechada") setSidebarOpen(false);
    } catch {
      // Navegador com armazenamento bloqueado: segue com a lista aberta.
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((open) => {
      try {
        localStorage.setItem("l4t-editor-sidebar", open ? "fechada" : "aberta");
      } catch {
        // Idem: a preferência não persiste, a tela funciona igual.
      }
      return !open;
    });
  }, []);
  /** `fit` cabe na largura; `100` mostra a página no tamanho real, com rolagem. */
  const [zoom, setZoom] = useState<"fit" | "100">("fit");
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingImage = useRef<PendingImage | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<ItemSelection | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [itemBusy, setItemBusy] = useState(false);
  const [video, setVideo] = useState<VideoSelection | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const { outerRef, innerRef, scale, height } = useScaledPreview(
    PAGE_WIDTH,
    zoom === "100" ? 1 : undefined,
  );

  // O servidor mandou uma página nova (depois de publicar): o rascunho morre.
  useEffect(() => {
    setOrder(initialOrder);
    setHidden(initialHidden);
    setDraft({});
  }, [initialOrder, initialHidden, blocks]);

  const dirty =
    Object.keys(draft).length > 0 || orderChanged(order, hidden, initialOrder, initialHidden);

  // Sair com rascunho pendente avisa — foi a pendência que ficou no Builder.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /**
   * `mousedown`, e NÃO `click` — conserto de um defeito real: no `click` o
   * navegador já processou o foco do gesto, e o `blur` encerrava a edição no
   * mesmo instante em que ela começava.
   */
  const onStageMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const commit = (key: string, value: string) =>
      setDraft((current) => ({ ...current, [key]: value }));

    // TEXTO antes de IMAGEM: o texto do hero fica DENTRO da área da arte, e
    // perguntar pela imagem primeiro abria o seletor de arquivo no lugar da
    // edição.
    const field = target.closest<HTMLElement>("[data-edit-field]");
    if (field) {
      if (field.isContentEditable) return;
      event.preventDefault();
      startEditing(field, field.dataset.editField ?? "", commit, {
        x: event.clientX,
        y: event.clientY,
      });
      return;
    }

    const item = target.closest<HTMLElement>("[data-edit-item]");
    if (item) {
      const [sectionKey, id, itemField] = (item.dataset.editItem ?? "").split("|");
      if (!sectionKey || !id || !itemField) return;

      // Selecionar ANTES de qualquer coisa, inclusive quando o clique é numa
      // arte: em card que é quase só imagem (guia, foto da equipe, card do
      // hero) não havia onde clicar para pegar a barrinha de ações.
      const isImage = itemField === "image" || itemField === "secondaryImage";
      selectItem(sectionKey, id, item, isImage ? (itemField as "image" | "secondaryImage") : undefined);

      if (isImage) {
        // NÃO abre o seletor de arquivo aqui: quem clica numa arte quase sempre
        // quer mexer no card (mover, remover). Trocar a imagem é o botão
        // "trocar imagem" da barrinha.
        event.preventDefault();
        return;
      }
      if (item.isContentEditable) return;
      event.preventDefault();
      startEditing(item, `${ITEM_PREFIX}${sectionKey}|${id}|${itemField}`, commit, {
        x: event.clientX,
        y: event.clientY,
      });
      return;
    }

    // Lista ainda VAZIA: o clique cria o primeiro item e já pede a arte.
    const adder = target.closest<HTMLElement>("[data-edit-add]");
    if (adder) {
      const [sectionKey, itemLabel] = (adder.dataset.editAdd ?? "").split("|");
      if (sectionKey && itemLabel) {
        event.preventDefault();
        void addToList(sectionKey, itemLabel, "image");
        return;
      }
    }

    // Clicou fora de qualquer item: a barrinha de ações some.
    setSelection(null);
    setConfirmingRemove(false);

    // VÍDEO: abre o painel (capa, arquivo ou link) em vez do seletor de
    // arquivo — um clique não diria qual das três coisas trocar.
    const videoBlock = target.closest<HTMLElement>("[data-edit-video]");
    if (videoBlock) {
      event.preventDefault();
      const rect = videoBlock.getBoundingClientRect();
      const current = videoBlock.dataset.videoCurrent;
      setVideo({
        key: videoBlock.dataset.editVideo ?? "",
        rect: { top: rect.top, left: rect.left, width: rect.width },
        current: current === "file" || current === "link" ? current : "none",
        link: videoBlock.dataset.videoLink ?? "",
      });
      return;
    }
    setVideo(null);

    const image = target.closest<HTMLElement>("[data-edit-image]");
    if (!image) return;
    event.preventDefault();
    pendingImage.current = {
      kind: "section",
      key: image.dataset.editImage ?? "",
      slot: image.dataset.editSlot === "secondary" ? "secondary" : undefined,
    };
    fileRef.current?.click();
  }, []);

  /**
   * Os ids da lista, NA ORDEM EM QUE A PÁGINA OS DESENHA.
   *
   * Lidos do DOM em vez de recebidos do servidor: o que está na tela é a
   * verdade do que o admin vê, inclusive depois de um item novo entrar. É
   * também o que permite mover sem carregar a lista inteira de novo.
   */
  const itemIdsOf = useCallback((sectionKey: string): string[] => {
    const stage = stageRef.current;
    if (!stage) return [];
    const ids: string[] = [];
    for (const el of stage.querySelectorAll<HTMLElement>("[data-edit-item]")) {
      const [section, id] = (el.dataset.editItem ?? "").split("|");
      if (section === sectionKey && id && !ids.includes(id)) ids.push(id);
    }
    return ids;
  }, []);

  const selectItem = useCallback(
    (
      sectionKey: string,
      id: string,
      element: HTMLElement,
      imageField?: "image" | "secondaryImage",
    ) => {
      const ids = itemIdsOf(sectionKey);
      const own = blocks.find((item) => `${page}:${item.key}` === sectionKey);
      const label =
        own?.itemLabel ??
        blocks.map((item) => item.itemLabels?.[sectionKey]).find(Boolean);
      if (!label) return;

      const rect = element.getBoundingClientRect();
      setConfirmingRemove(false);
      setSelection({
        sectionKey,
        id,
        itemLabel: label,
        index: Math.max(0, ids.indexOf(id)),
        total: ids.length,
        rect: { top: rect.top, left: rect.left, width: rect.width },
        imageField,
      });
    },
    [blocks, itemIdsOf, page],
  );

  // A barrinha é posicionada em coordenadas de TELA: rolar a página a deixaria
  // para trás. Sai de cena na rolagem — voltar é um clique no item.
  useEffect(() => {
    if (!selection) return;
    const hide = () => {
      setSelection(null);
      setConfirmingRemove(false);
    };
    window.addEventListener("scroll", hide, { passive: true });
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide);
      window.removeEventListener("resize", hide);
    };
  }, [selection]);

  /**
   * Mover, acrescentar e remover item gravam NA HORA, fora do rascunho.
   *
   * São mudanças de ESTRUTURA, como a troca de arte: o item novo precisa
   * existir no banco para receber texto, e guardar "removi o terceiro" num
   * rascunho que ainda não foi publicado é como a tela e o banco começam a
   * discordar sobre o que existe.
   */
  async function runItemAction(action: () => Promise<{ ok: boolean; message?: string }>, done: string) {
    setItemBusy(true);
    const result = await action();
    setItemBusy(false);
    setSelection(null);
    setConfirmingRemove(false);

    if (!result.ok) {
      toastError(result.message ?? "Não foi possível alterar a lista.");
      return;
    }
    toastOk(done);
    router.refresh();
  }

  function moveItem(direction: -1 | 1) {
    if (!selection) return;
    const ids = itemIdsOf(selection.sectionKey);
    const from = ids.indexOf(selection.id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= ids.length) return;
    const next = [...ids];
    [next[from], next[to]] = [next[to], next[from]];

    void runItemAction(
      () => reorderSectionItemsAction(selection.sectionKey, next),
      `${selection.itemLabel} movido.`,
    );
  }

  /**
   * Acrescenta um item ao fim da lista.
   *
   * Em lista de ARTES, NÃO grava nada agora: só marca o que será criado e abre
   * o seletor de arquivo. O item nasce junto com a arte, em `handleImage` —
   * item de imagem sem arquivo não desenha nada na loja, e desistir do seletor
   * não pode deixar esse fantasma para trás.
   */
  async function addToList(sectionKey: string, itemLabel: string, imageField?: string) {
    setSelection(null);
    setConfirmingRemove(false);

    if (imageField) {
      pendingImage.current = { kind: "new-item", sectionKey, itemLabel, field: imageField };
      fileRef.current?.click();
      return;
    }

    setItemBusy(true);
    const created = await addSectionItemAction(sectionKey, itemLabel);
    setItemBusy(false);

    if (!created.ok) {
      toastError(created.message ?? "Não foi possível adicionar.");
      return;
    }

    toastOk(`${itemLabel} adicionado no fim da lista.`);
    router.refresh();
  }

  function addItem() {
    if (!selection) return;
    void addToList(selection.sectionKey, selection.itemLabel, selection.imageField);
  }

  function removeItem() {
    if (!selection) return;
    void runItemAction(
      () => deleteSectionItemAction(selection.sectionKey, selection.id),
      `${selection.itemLabel} removido.`,
    );
  }

  async function handleImage(file: File) {
    const pending = pendingImage.current;
    pendingImage.current = null;
    if (!pending) return;

    // O item de lista nasce AQUI, com o arquivo em mãos (ver `PendingImage`).
    let target = pending;
    if (pending.kind === "new-item") {
      setItemBusy(true);
      const created = await addSectionItemAction(pending.sectionKey, pending.itemLabel);
      setItemBusy(false);
      if (!created.ok) {
        toastError(created.message ?? "Não foi possível adicionar.");
        return;
      }
      target = {
        kind: "item",
        sectionKey: pending.sectionKey,
        id: created.data.id,
        field: pending.field,
      };
    }
    const pendingUpload = target as Exclude<PendingImage, { kind: "new-item" }>;

    const form = new FormData();
    form.set("image", file, file.name);
    if (pendingUpload.kind === "section") {
      form.set("key", pendingUpload.key);
      if (pendingUpload.slot) form.set("slot", pendingUpload.slot);
    } else {
      form.set("sectionKey", pendingUpload.sectionKey);
      form.set("id", pendingUpload.id);
      form.set("field", pendingUpload.field);
    }

    const result =
      pendingUpload.kind === "section"
        ? await uploadSectionImageAction(form)
        : await uploadItemImageAction(form);

    if (!result.ok) {
      toastError(result.message ?? "Não foi possível enviar a imagem.");
      return;
    }
    toastOk("Imagem publicada.");
    router.refresh();
  }

  async function runVideo(action: () => Promise<{ ok: boolean; message?: string }>, done: string) {
    setVideoBusy(true);
    const result = await action();
    setVideoBusy(false);
    setVideoProgress(null);
    if (!result.ok) {
      toastError(result.message ?? "Não foi possível salvar o vídeo.");
      return;
    }
    toastOk(done);
    setVideo(null);
    router.refresh();
  }

  function handleVideoFile(file: File) {
    if (!video) return;
    const key = video.key;
    setVideoProgress(0);
    void runVideo(async () => {
      const sent = await uploadSectionVideo(key, file, setVideoProgress);
      if (!sent.ok) return sent;
      return videoUploadedAction();
    }, "Vídeo publicado.");
  }

  async function publish() {
    if (!dirty || publishing) return;
    setPublishing(true);

    const texts: Record<string, Record<string, string>> = {};
    const items: Record<string, { sectionKey: string; id: string; fields: Record<string, string> }> = {};

    for (const [key, value] of Object.entries(draft)) {
      if (key.startsWith(ITEM_PREFIX)) {
        const [sectionKey, id, field] = key.slice(ITEM_PREFIX.length).split("|");
        if (!sectionKey || !id || !field) continue;
        const bucket = (items[`${sectionKey}|${id}`] ??= { sectionKey, id, fields: {} });
        bucket.fields[field] = value;
        continue;
      }
      const [pageKey, section, field] = key.split(":");
      if (!pageKey || !section || !field) continue;
      (texts[`${pageKey}:${section}`] ??= {})[field] = value;
    }

    const result = await publishPageAction({
      page,
      texts,
      items: Object.values(items),
      order: [
        ...order.map((key) => ({ key: `${page}:${key}`, hidden: false })),
        ...hidden.map((key) => ({ key: `${page}:${key}`, hidden: true })),
      ],
    });

    setPublishing(false);
    if (!result.ok) {
      toastError(result.message ?? "Não foi possível publicar.");
      return;
    }
    toastOk("Página publicada.");
    router.refresh();
  }

  function discard() {
    // Recarrega do servidor: o texto editado vive no DOM, e desfazer campo a
    // campo seria reconstruir o que o servidor já sabe desenhar.
    setDraft({});
    setOrder(initialOrder);
    setHidden(initialHidden);
    router.refresh();
  }

  const visibleBlocks = order
    .map((key) => blocks.find((block) => block.key === key))
    .filter((block): block is EditorBlock => Boolean(block));

  const changes = Object.keys(draft).length;

  return (
    <div className="flex flex-col gap-[16px]">
      {/* Barra de ações: fica ACIMA e atravessa a largura toda, então a área da
          página não perde espaço para ela — era o que mais apertava a maquete. */}
      <div className="sticky top-[12px] z-20 flex flex-wrap items-center gap-[12px] rounded-[16px] border border-brand-border bg-brand-surface/95 px-[16px] py-[12px] backdrop-blur-[10px]">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-expanded={sidebarOpen}
          className="flex h-[38px] items-center gap-[8px] rounded-full border border-white/15 px-[14px] font-poppins text-[13px] text-white transition-colors hover:bg-white/5"
        >
          <span aria-hidden>{sidebarOpen ? "◀" : "▶"}</span>
          Sessões
        </button>

        <span className="font-poppins text-[14px] text-white/70">{pageLabel}</span>

        <div className="flex items-center gap-[6px] rounded-full border border-white/15 p-[3px]">
          {(["fit", "100"] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setZoom(level)}
              aria-pressed={zoom === level}
              className={cn(
                "h-[30px] rounded-full px-[12px] font-poppins text-[12px] transition-colors",
                zoom === level ? "bg-brand-orange text-black" : "text-white/70 hover:text-white",
              )}
            >
              {level === "fit" ? "Ajustar" : "100%"}
            </button>
          ))}
        </div>

        <p role="status" className="font-helvetica text-[12px] text-brand-fg-subtle">
          {dirty
            ? `Alterações não publicadas${changes > 0 ? ` (${changes} ${changes === 1 ? "texto" : "textos"})` : ""}`
            : "Tudo publicado"}
        </p>

        <div className="ml-auto flex items-center gap-[10px]">
          <button
            type="button"
            onClick={discard}
            disabled={!dirty || publishing}
            className="h-[38px] rounded-full border border-white/20 px-[18px] font-poppins text-[13px] font-semibold text-white transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            DESCARTAR
          </button>
          <button
            type="button"
            onClick={publish}
            disabled={!dirty || publishing}
            className="h-[38px] rounded-full bg-brand-orange px-[22px] font-poppins text-[13px] font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {publishing ? "PUBLICANDO..." : "PUBLICAR"}
          </button>
        </div>
      </div>

      <div className="flex items-start gap-[16px]">
        {sidebarOpen ? (
          // `sticky`: a lista acompanha a rolagem da página em vez de exigir uma
          // rolagem própria — foi o que tirou a segunda barra de rolagem.
          <aside className="sticky top-[84px] w-[290px] shrink-0">
            <div className="scrollbar-orange max-h-[calc(100dvh-140px)] overflow-y-auto rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)] p-[16px]">
              <h2 className="font-helvetica text-[15px] font-bold text-white">Sessões</h2>
              <p className="mt-[6px] font-helvetica text-[12px] leading-[17px] text-brand-fg-subtle">
                Arraste para reordenar; o olho esconde da loja. Na página, clique no texto para editar
                e na imagem para trocar.
              </p>

              <SectionOrderList
                blocks={blocks}
                order={order}
                hidden={hidden}
                onChange={(nextOrder, nextHidden) => {
                  setOrder(nextOrder);
                  setHidden(nextHidden);
                }}
              />

              <p className="mt-[14px] font-helvetica text-[11px] leading-[15px] text-brand-fg-subtle">
                Imagens são publicadas na hora, ao escolher o arquivo.
              </p>
            </div>
          </aside>
        ) : null}

        {/* SEM rolagem própria: quem rola é a página do painel. Com uma área
            rolável aqui dentro havia duas barras (e uma horizontal) para
            percorrer a mesma página. A barra de ações e a lista ficam fixas, o
            que era o motivo de ter criado a rolagem interna.
            No "100%" a maquete é maior que a área: aí sim ela rola na
            horizontal, porque é o que "tamanho real" significa. */}
        <div
          ref={outerRef}
          className={cn(
            "min-w-0 flex-1 rounded-[20px] border border-brand-border bg-brand-bg",
            zoom === "100" ? "scrollbar-orange overflow-x-auto" : "overflow-hidden",
          )}
        >
          {/* Espaçador com a altura JÁ REDUZIDA: `transform` não ocupa espaço no
              fluxo, então sem ele a área rolaria o tamanho da página inteira em
              escala 1 e sobraria um vazio enorme embaixo. */}
          <div style={{ height: height || undefined, width: PAGE_WIDTH * scale }}>
            <div
              ref={(node) => {
                innerRef.current = node;
                stageRef.current = node;
              }}
              onMouseDown={onStageMouseDown}
              className="site-edit-stage origin-top-left"
              style={{ width: PAGE_WIDTH, transform: `scale(${scale})` }}
            >
              {/* `overflow-x-clip` como a moldura da loja faz no frame: o que
                  sangra para fora dos 1820px (o hero aberto, os brilhos) é
                  cortado em vez de virar rolagem horizontal. `clip` e não
                  `hidden` — `hidden` criaria um container de rolagem e quebraria
                  as animações presas à rolagem. */}
              <div className="mx-auto w-[1820px] overflow-x-clip pt-[37px] pb-[100px]">
                {visibleBlocks.map((block, index) => (
                  <div key={block.key} style={index === 0 ? undefined : { marginTop: block.gap }}>
                    {block.node}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selection ? (
        <ItemToolbar
          selection={selection}
          busy={itemBusy}
          confirmingRemove={confirmingRemove}
          onMove={moveItem}
          onChangeImage={() => {
            if (!selection?.imageField) return;
            pendingImage.current = {
              kind: "item",
              sectionKey: selection.sectionKey,
              id: selection.id,
              field: selection.imageField,
            };
            fileRef.current?.click();
          }}
          onAdd={addItem}
          onAskRemove={() => setConfirmingRemove(true)}
          onConfirmRemove={removeItem}
          onCancel={() => setConfirmingRemove(false)}
        />
      ) : null}

      {video ? (
        <VideoToolbar
          key={video.key + video.current + video.link}
          selection={video}
          busy={videoBusy}
          progress={videoProgress}
          onClose={() => setVideo(null)}
          onChangeCover={() => {
            pendingImage.current = { kind: "section", key: video.key };
            setVideo(null);
            fileRef.current?.click();
          }}
          onPickVideo={() => videoFileRef.current?.click()}
          onSaveLink={(url) =>
            void runVideo(() => saveVideoLinkAction(video.key, url), "Link do vídeo salvo.")
          }
          onRemove={() => void runVideo(() => removeVideoAction(video.key), "Vídeo removido.")}
        />
      ) : null}

      <input
        ref={videoFileRef}
        type="file"
        accept={VIDEO_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) handleVideoFile(file);
        }}
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void handleImage(file);
        }}
      />
    </div>
  );
}

/**
 * Torna UM elemento editável, com teclado previsível.
 *
 * `contentEditable` puro aceitaria HTML colado de qualquer lugar; o `paste` é
 * interceptado e só o texto entra. Enter confirma (é um título, não um editor
 * de texto); Shift+Enter quebra linha, porque respostas do FAQ e o título do
 * vídeo têm mais de uma. Esc desfaz.
 */
function startEditing(
  element: HTMLElement,
  draftKey: string,
  commit: (key: string, value: string) => void,
  point?: { x: number; y: number },
) {
  if (!draftKey || element.isContentEditable) return;

  const original = element.textContent ?? "";
  element.contentEditable = "plaintext-only";
  element.spellcheck = false;
  element.dataset.editing = "true";
  element.focus({ preventScroll: true });

  // Cursor ONDE a pessoa clicou: como o gesto teve o padrão cancelado, o
  // navegador não o posiciona sozinho.
  if (point) {
    const range = document.caretRangeFromPoint?.(point.x, point.y);
    if (range) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }

  const finish = (save: boolean) => {
    element.removeEventListener("blur", onBlur);
    element.removeEventListener("keydown", onKey);
    element.removeEventListener("paste", onPaste);
    element.contentEditable = "false";
    delete element.dataset.editing;

    const value = (element.textContent ?? "").replace(/[ \t]+/g, " ").trim();
    if (!save || value === original.trim()) {
      element.textContent = original;
      return;
    }
    element.textContent = value;
    commit(draftKey, value);
  };

  const onBlur = () => finish(true);
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      finish(true);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      finish(false);
    }
  };
  const onPaste = (event: ClipboardEvent) => {
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain") ?? "";
    document.execCommand("insertText", false, text.replace(/[ \t]+/g, " "));
  };

  element.addEventListener("blur", onBlur);
  element.addEventListener("keydown", onKey);
  element.addEventListener("paste", onPaste);
}

function orderChanged(
  order: string[],
  hidden: string[],
  initialOrder: string[],
  initialHidden: string[],
): boolean {
  return order.join("|") !== initialOrder.join("|") || hidden.join("|") !== initialHidden.join("|");
}
