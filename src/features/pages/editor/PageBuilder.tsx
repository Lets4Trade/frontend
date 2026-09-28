"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toastError, toastOk } from "@/components/ui/Toasts";
import { cn } from "@/lib/cn";
import { ACTION_FAILED_MESSAGE, runAction } from "@/lib/safeAction";
import { publishAction, resolveRefsAction, restoreRevisionAction, saveDraftAction } from "../actions";
import type { SectionContent } from "@/features/site/list";
import { EMPTY_REFS, type AdminPage, type Block, type PageRefs } from "../types";
import { BlockInspector } from "./BlockInspector";
import { BlockLibrary } from "./BlockLibrary";
import { BlockList } from "./BlockList";
import type { EditorGame } from "./fields";
import { PreviewFrame } from "./PreviewFrame";
import { PagePicker, type PageOption } from "./PagePicker";
import { RevisionsPanel } from "./RevisionsPanel";
import type { BlocksPageDef } from "../registry";

type SaveStatus = "saved" | "pending" | "saving" | "error" | "conflict";

/** Pausa depois da última alteração antes de gravar o rascunho. */
const AUTOSAVE_MS = 1200;
/** Pausa antes de pedir ao backend os jogos/produtos da prévia. */
const RESOLVE_MS = 450;

/**
 * O construtor de páginas (fase 1, 2026-09-25): lista de blocos à esquerda,
 * a página real no centro, o formulário do bloco à direita.
 *
 * ── Rascunho e publicação ──────────────────────────────────────────────────
 * Toda alteração grava o RASCUNHO sozinha, depois de uma pausa. A loja só muda
 * em "Publicar". As gravações são em FILA (nunca duas ao mesmo tempo) e levam
 * o número da revisão lida: se outra aba salvou no meio, o backend recusa
 * (409) e esta tela para de gravar em vez de apagar o trabalho da outra.
 */
export function PageBuilder({
  page,
  pages,
  initial,
  games,
  sections: initialSections,
}: {
  /** A página em edição (registro do construtor). */
  page: BlocksPageDef;
  /** Todas as páginas, para o seletor do topo. */
  pages: PageOption[];
  initial: AdminPage;
  games: EditorGame[];
  /** Conteúdo salvo das seções do desenho (editável no painel de `secao`). */
  sections: SectionContent[];
}) {
  const slug = page.slug;
  const pageLabel = page.label;
  const [blocks, setBlocks] = useState<Block[]>(initial.blocks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refs, setRefs] = useState<PageRefs>(EMPTY_REFS);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [message, setMessage] = useState<string | null>(null);
  const [hasUnpublished, setHasUnpublished] = useState(initial.hasUnpublishedChanges);
  const [version, setVersion] = useState(initial.version);
  const [publishing, setPublishing] = useState(false);
  const [sections, setSections] = useState(initialSections);
  // As seções do desenho são montadas NO SERVIDOR da prévia: depois de gravar
  // uma, a prévia precisa recarregar para mostrar o efeito.
  const [previewNonce, setPreviewNonce] = useState(0);

  const latest = useRef(blocks);
  const revision = useRef(initial.draftRevision);
  const dirty = useRef(false);
  const conflict = useRef(false);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const timer = useRef<number | undefined>(undefined);
  // O reagendamento chama a versão ATUAL do `flush` por aqui — ele não pode se
  // referir a si mesmo dentro da própria declaração.
  const flushRef = useRef<() => Promise<boolean>>(async () => true);

  const flush = useCallback(async (): Promise<boolean> => {
    window.clearTimeout(timer.current);
    if (inFlight.current) await inFlight.current;
    if (conflict.current) return false;
    if (!dirty.current) return true;

    dirty.current = false;
    const snapshot = latest.current;
    setStatus("saving");

    const run = (async () => {
      const result = await runAction(() => saveDraftAction(slug, snapshot, revision.current), {
        ok: false as const,
        reason: "error" as const,
        message: ACTION_FAILED_MESSAGE,
      });
      if (result.ok) {
        revision.current = result.data.draftRevision;
        setHasUnpublished(result.data.hasUnpublishedChanges);
        setMessage(null);
        setStatus(dirty.current ? "pending" : "saved");
        return true;
      }
      if (result.reason === "conflict") {
        conflict.current = true;
        setStatus("conflict");
        setMessage(result.message ?? "A página foi alterada em outra aba. Recarregue.");
        return false;
      }
      // Fica sujo: a próxima alteração (ou o botão publicar) tenta de novo.
      dirty.current = true;
      setStatus("error");
      setMessage(result.message ?? "Não foi possível salvar o rascunho.");
      return false;
    })();

    inFlight.current = run;
    const ok = await run;
    inFlight.current = null;
    // Mudou algo enquanto gravava: agenda a próxima rodada.
    if (ok && dirty.current) timer.current = window.setTimeout(() => void flushRef.current(), AUTOSAVE_MS);
    return ok;
  }, [slug]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const update = useCallback(
    (next: Block[]) => {
      setBlocks(next);
      latest.current = next;
      if (conflict.current) return;
      dirty.current = true;
      setStatus("pending");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), AUTOSAVE_MS);
    },
    [flush],
  );

  // Referências da prévia (jogos, produtos) acompanham o rascunho vivo. O
  // contador descarta resposta atrasada que chegue depois de uma mais nova.
  const resolveSeq = useRef(0);
  useEffect(() => {
    const seq = ++resolveSeq.current;
    const handle = window.setTimeout(async () => {
      const next = await runAction(() => resolveRefsAction(blocks), EMPTY_REFS);
      if (seq === resolveSeq.current) setRefs(next);
    }, RESOLVE_MS);
    return () => window.clearTimeout(handle);
  }, [blocks]);

  // Sair com alteração não gravada pergunta antes (o aviso nativo do navegador).
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (status === "pending" || status === "saving" || status === "error") event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  async function publish() {
    // Home sem nenhum bloco visível = loja em branco. O backend aceita (não é
    // dado inválido), então a trava de produto fica aqui.
    if (!latest.current.some((block) => !block.hidden)) {
      toastError("A página precisa ter ao menos um bloco visível para ser publicada.");
      return;
    }
    // Página nunca salva: o rascunho só existe na tela — grava antes.
    if (revision.current === 0) dirty.current = true;
    setPublishing(true);
    const saved = await flush();
    if (!saved) {
      setPublishing(false);
      toastError("Corrija o rascunho antes de publicar.");
      return;
    }
    const result = await runAction(() => publishAction(slug, revision.current), {
      ok: false as const,
      reason: "error" as const,
      message: ACTION_FAILED_MESSAGE,
    });
    setPublishing(false);
    if (!result.ok) {
      toastError(result.message ?? "Não foi possível publicar.");
      if (result.reason === "conflict") {
        conflict.current = true;
        setStatus("conflict");
        setMessage(result.message ?? null);
      }
      return;
    }
    setVersion(result.data.version);
    setHasUnpublished(false);
    toastOk("Página publicada. A loja já mostra.");
  }

  async function restore(target: number) {
    const saved = await flush();
    if (!saved && !conflict.current) return;
    const result = await runAction(() => restoreRevisionAction(slug, target), {
      ok: false as const,
      reason: "error" as const,
      message: ACTION_FAILED_MESSAGE,
    });
    if (!result.ok) {
      toastError(result.message ?? "Não foi possível restaurar.");
      return;
    }
    conflict.current = false;
    dirty.current = false;
    revision.current = result.data.draftRevision;
    latest.current = result.data.blocks;
    setBlocks(result.data.blocks);
    setSelectedId(null);
    setHasUnpublished(true);
    setStatus("saved");
    setMessage(null);
    toastOk(`Versão ${target} trazida para o rascunho. Publique para colocá-la no ar.`);
  }

  function addBlock(incoming: Block) {
    // "Produtos" não existe sem jogo — nascer vazio fazia o rascunho recusar na
    // hora ("jogo é inválido"). Começa com o primeiro jogo; o admin troca.
    const block: Block =
      incoming.type === "productGrid" && !incoming.props.gameId && games[0]
        ? { ...incoming, props: { ...incoming.props, gameId: games[0].id } }
        : incoming;
    const index = selectedId ? blocks.findIndex((item) => item.id === selectedId) : -1;
    const next = [...blocks];
    next.splice(index >= 0 ? index + 1 : next.length, 0, block);
    update(next);
    setSelectedId(block.id);
  }

  const selected = blocks.find((block) => block.id === selectedId) ?? null;
  const onSelect = useCallback((id: string) => setSelectedId(id), []);

  const inspector = selected ? (
    <BlockInspector
      key={selected.id}
      block={selected}
      games={games}
      page={page}
      sections={sections}
      onChange={(next) => update(blocks.map((block) => (block.id === next.id ? next : block)))}
      onClose={() => setSelectedId(null)}
      onLegacySaved={(key, content) => {
        setSections((list) => [...list.filter((item) => item.key !== key), ...(content ? [content] : [])]);
        setPreviewNonce((n) => n + 1);
      }}
    />
  ) : null;

  return (
    <div className="flex flex-col gap-[16px] px-[24px] pt-[24px] pb-[24px]">
      <header className="flex flex-wrap items-center gap-[16px]">
        <div className="min-w-0">
          <h1 className="font-helvetica text-[24px] leading-none font-bold text-white">Construtor de páginas</h1>
          <p className="mt-[8px] font-poppins text-[14px] text-brand-fg-muted">
            {pageLabel} · {version > 0 ? `versão ${version} no ar` : "ainda não publicada (a loja mostra o desenho padrão)"}
            {" · "}
            <a href={page.href} target="_blank" rel="noreferrer" className="text-brand-orange hover:underline">
              ver na loja
            </a>
          </p>
        </div>

        <PagePicker current={slug} pages={pages} beforeLeave={flush} />

        <StatusLine status={status} message={message} hasUnpublished={hasUnpublished} />

        <div className="ml-auto flex items-center gap-[10px]">
          <RevisionsPanel slug={slug} disabled={publishing} onRestore={(target) => void restore(target)} />
          <button
            type="button"
            onClick={() => void publish()}
            disabled={publishing || status === "conflict" || (!hasUnpublished && status === "saved" && version > 0)}
            className="h-[38px] rounded-full bg-[image:var(--brand-orange-gradient)] px-[22px] font-poppins text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {publishing ? "PUBLICANDO…" : "PUBLICAR"}
          </button>
        </div>
      </header>

      <div className="grid h-[calc(100dvh-210px)] min-h-[560px] grid-cols-[320px_minmax(0,1fr)] gap-[16px] xl:grid-cols-[320px_minmax(0,1fr)_380px]">
        <aside className="scrollbar-orange min-h-0 overflow-y-auto rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)] p-[14px]">
          {/* Abaixo de xl não há terceira coluna: o formulário toma o lugar da lista. */}
          {inspector ? <div className="xl:hidden">{inspector}</div> : null}
          <div className={cn("flex flex-col gap-[12px]", inspector && "hidden xl:flex")}>
            <div>
              <h2 className="font-helvetica text-[15px] font-bold text-white">Blocos da página</h2>
              <p className="mt-[4px] font-poppins text-[12px] leading-[17px] text-brand-fg-subtle">
                De cima para baixo, como na loja. Clique para editar; arraste para mudar a ordem.
              </p>
            </div>
            <BlockList
              blocks={blocks}
              selectedId={selectedId}
              legacyLabels={page.legacyLabels}
              onSelect={onSelect}
              onChange={update}
            />
            <BlockLibrary
              blocks={blocks}
              legacyKeys={page.legacyKeys}
              legacyLabels={page.legacyLabels}
              onAdd={addBlock}
            />
          </div>
        </aside>

        <section className="min-h-0">
          <PreviewFrame
            slug={slug}
            blocks={blocks}
            refs={refs}
            selectedId={selectedId}
            onSelect={onSelect}
            reloadNonce={previewNonce}
          />
        </section>

        <aside className="scrollbar-orange hidden min-h-0 overflow-y-auto rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)] p-[18px] xl:block">
          {inspector ?? (
            <div className="flex h-full flex-col items-center justify-center gap-[8px] text-center">
              <p className="font-helvetica text-[16px] font-bold text-white">Nenhum bloco selecionado</p>
              <p className="max-w-[260px] font-poppins text-[13px] leading-[19px] text-brand-fg-subtle">
                Clique num bloco na lista ou na própria página para editar.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function StatusLine({
  status,
  message,
  hasUnpublished,
}: {
  status: SaveStatus;
  message: string | null;
  hasUnpublished: boolean;
}) {
  const text =
    status === "pending"
      ? "Alterações ainda não salvas…"
      : status === "saving"
        ? "Salvando rascunho…"
        : status === "error" || status === "conflict"
          ? message
          : hasUnpublished
            ? "Rascunho salvo · alterações ainda não publicadas"
            : "Tudo publicado";

  return (
    <p
      role={status === "error" || status === "conflict" ? "alert" : "status"}
      className={cn(
        "flex items-center gap-[8px] font-poppins text-[13px]",
        status === "error" || status === "conflict" ? "text-red-9" : "text-brand-fg-subtle",
      )}
    >
      {text}
      {status === "conflict" ? (
        <button type="button" onClick={() => window.location.reload()} className="font-bold text-white underline">
          Recarregar
        </button>
      ) : null}
    </p>
  );
}
