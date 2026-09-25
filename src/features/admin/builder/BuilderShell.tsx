"use client";

import { slugify } from "@/lib/slugify";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { toastError, toastOk } from "@/components/ui/Toasts";
import { ACTION_FAILED_MESSAGE, runAction } from "@/lib/safeAction";
import { ADMIN_SHELL } from "@/features/admin/layout";
import { resolveSectionOrder } from "@/features/game/sections";
import { PRODUCT_TABS } from "@/features/game/tabs";
import { savePageAction } from "./actions";
import {
  BannerPanel,
  DescriptionPanel,
  ListPanel,
  LogoPanel,
  MainCategoriesPanel,
  NamePanel,
  PanelShell,
  TitlesPanel,
} from "./BuilderPanels";
import { BuilderPreview } from "./BuilderPreview";
import { BuilderSidebar } from "./BuilderSidebar";
import { SectionOrderPanel } from "./SectionOrderPanel";
import { stepById, type BuilderStepId } from "./steps";
import type { BuilderGame, BuilderListItem, BuilderShared, Draft } from "./types";

/**
 * "Builder de Páginas" (Figma 3883:2153) — a casca da tela.
 *
 * ── O rascunho ─────────────────────────────────────────────────────────────
 * Tudo o que se edita vive AQUI, em memória, até o botão "SALVAR E PUBLICAR
 * PAGE". É o que o arquivo desenha: nove etapas na lateral e um botão só. Gravar
 * a cada tecla faria a loja mudar enquanto alguém ainda está decidindo, e
 * gravar por etapa deixaria a página publicada metade nova e metade velha se uma
 * delas falhasse.
 *
 * As IMAGENS fogem da regra e sobem na hora — binário não cabe no corpo do
 * salvamento. O painel diz isso a quem edita.
 *
 * ── Painel OU pré-visualização ─────────────────────────────────────────────
 * A área grande mostra uma coisa de cada vez: escolher uma etapa troca a
 * maquete pelo formulário, e "Ver a página" volta. O arquivo do Figma desenha
 * só o estado de pré-visualização — nenhum painel de edição — e esta foi a
 * leitura escolhida com o usuário: é o que cabe no espaço desenhado sem
 * inventar uma terceira coluna que a largura de 1920 não tem.
 */
export function BuilderShell({
  game,
  shared,
}: {
  game: BuilderGame;
  /** `null` quando a página publicada não pôde ser lida — a maquete segue sem
      os blocos compartilhados em vez de a tela inteira falhar. */
  shared: BuilderShared | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<BuilderStepId | null>(null);
  const [draft, setDraft] = useState<Draft>(() => toDraft(game));
  const [saved, setSaved] = useState<Draft>(() => toDraft(game));
  const [pending, startTransition] = useTransition();

  const patch = useCallback((next: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...next }));
  }, []);

  /**
   * Quais etapas mudaram desde a última publicação.
   *
   * Comparação por VALOR e não uma bandeira ligada no primeiro `onChange`:
   * digitar e apagar de volta deixa a etapa igual ao que está publicado, e
   * marcá-la como pendente nesse caso ensinaria a ignorar o marcador.
   */
  const dirtySteps = useMemo(() => diffSteps(draft, saved), [draft, saved]);
  const isDirty = dirtySteps.size > 0;

  const derivedHeading = useMemo(() => {
    const first = PRODUCT_TABS.find((tab) => draft.productTypes.includes(tab.productType));
    if (!first) return `Compre em ${draft.name}`;
    const what = first.label.charAt(0) + first.label.slice(1).toLocaleLowerCase("pt-BR");
    return `Compre ${what} De ${draft.name}`;
  }, [draft.name, draft.productTypes]);

  function publish() {
    startTransition(async () => {
      const result = await runAction(
        () =>
          savePageAction(game.id, {
            name: draft.name,
            // Forma FINAL do link: o campo guarda o rascunho (com hífen no fim
            // enquanto se digita), e o servidor normaliza de novo de qualquer jeito.
            slug: slugify(draft.slug),
            heading: draft.heading,
            serversLabel: draft.serversLabel,
            categoriesLabel: draft.categoriesLabel,
            description: draft.description,
            productTypes: draft.productTypes,
            servers: draft.servers.map((item) => ({ id: item.id, label: item.label })),
            categories: draft.categories.map((item) => ({ id: item.id, label: item.label })),
            sectionOrder: draft.sectionOrder,
          }),
        { ok: false, reason: "error", message: ACTION_FAILED_MESSAGE },
      );

      if (result.ok) {
        // O rascunho é RECARREGADO da resposta, não mantido como estava: o
        // servidor devolve os ids das linhas recém-criadas, e sem eles o
        // salvamento seguinte tentaria criá-las de novo.
        const fresh = toDraft(result.data);
        setDraft(fresh);
        setSaved(fresh);
        toastOk("Página publicada. A loja já mostra as alterações.");
        router.refresh();
        return;
      }

      if (result.reason === "unauthenticated") {
        router.push("/login?redirect=/admin/builder");
        return;
      }
      toastError(result.message ?? "Não foi possível publicar a página.");
    });
  }

  const current = step ? stepById(step) : null;

  return (
    <div className={`${ADMIN_SHELL} pb-[100px]`}>
      <header className="flex flex-wrap items-start justify-between gap-[25px]">
        <div>
          <h1 className="font-helvetica text-[30px] leading-none font-bold tracking-[0.3px] text-white">
            Builder de Páginas
          </h1>
          <p className="mt-[15px] font-poppins text-[16px] text-brand-fg-muted">
            Crie a página personalizada — {game.name}
          </p>
        </div>

        <div className="flex items-center gap-[15px]">
          <Link
            href={`/games/${game.slug}`}
            target="_blank"
            className="inline-flex h-[50px] items-center rounded-full border border-brand-border bg-[image:var(--brand-surface-fill)] px-[25px] font-poppins text-[14px] font-bold text-white transition-opacity hover:opacity-90"
          >
            Abrir a loja
          </Link>

          <button
            type="button"
            onClick={publish}
            // Sem alteração o botão fica inerte: publicar de novo o que já está
            // publicado não faz nada e ainda geraria uma linha na auditoria.
            disabled={pending || !isDirty}
            className="inline-flex h-[50px] w-[315px] items-center justify-center rounded-full bg-[image:var(--brand-orange-gradient)] font-poppins text-[14px] font-bold tracking-[0.14px] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "PUBLICANDO..." : "SALVAR E PUBLICAR PAGE"}
          </button>
        </div>
      </header>

      <div className="mt-[50px] flex items-start gap-[29px]">
        <BuilderSidebar
          gameId={game.id}
          gameSlug={game.slug}
          active={step}
          onSelect={(id) => setStep((atual) => (atual === id ? null : id))}
          dirtySteps={dirtySteps}
        />

        <div className="min-w-0 flex-1">
          {current ? (
            <>
              <button
                type="button"
                onClick={() => setStep(null)}
                className="mb-[20px] font-poppins text-[14px] font-bold text-brand-orange transition-opacity hover:opacity-90"
              >
                ← Ver a página
              </button>

              <PanelShell title={current.title} hint={current.hint}>
                {renderPanel(current.id, {
                  game,
                  draft,
                  patch,
                  derivedHeading,
                })}
              </PanelShell>
            </>
          ) : (
            <BuilderPreview draft={draft} gameName={draft.name} shared={shared} />
          )}
        </div>
      </div>
    </div>
  );
}

function renderPanel(
  id: BuilderStepId,
  ctx: {
    game: BuilderGame;
    draft: Draft;
    patch: (next: Partial<Draft>) => void;
    derivedHeading: string;
  },
) {
  const { game, draft, patch, derivedHeading } = ctx;

  switch (id) {
    case "titulos":
      return <TitlesPanel draft={draft} patch={patch} derivedHeading={derivedHeading} />;
    case "banner":
      return (
        <BannerPanel
          gameId={game.id}
          banners={draft.banners}
          onChange={(banners) => patch({ banners })}
        />
      );
    case "logo":
      return (
        <LogoPanel
          gameId={game.id}
          imageUrl={draft.imageUrl}
          onUploaded={(imageUrl) => patch({ imageUrl })}
        />
      );
    case "nome":
      return <NamePanel draft={draft} patch={patch} publishedSlug={game.slug} />;
    case "categorias-principais":
      return <MainCategoriesPanel draft={draft} patch={patch} />;
    case "servidores":
      return (
        <ListPanel
          items={draft.servers}
          onChange={(servers) => patch({ servers })}
          addLabel="+ Adicionar servidor"
          itemLabel="Servidor"
          emptyHint="Sem servidores, a loja do game não mostra o filtro de servidor."
        />
      );
    case "categorias":
      return (
        <ListPanel
          items={draft.categories}
          onChange={(categories) => patch({ categories })}
          addLabel="+ Adicionar categoria"
          itemLabel="Categoria"
          emptyHint="Sem categorias, o painel “Selecionar categoria” não aparece na loja."
        />
      );
    case "descricao":
      return <DescriptionPanel draft={draft} patch={patch} />;
    case "ordem":
      return (
        <SectionOrderPanel
          order={draft.sectionOrder}
          onChange={(sectionOrder) => patch({ sectionOrder })}
        />
      );
    // A etapa 8 é um `<Link>` na lateral e nunca abre painel — ver `steps.ts`.
    case "produtos":
      return null;
  }
}

/**
 * Resposta do backend → rascunho.
 *
 * Os nulos viram `""` porque no formulário "não personalizado" e "apagado" são a
 * mesma caixa vazia; quem traduz vazio de volta para nulo é o backend. E cada
 * item de lista ganha uma `key` estável — sem ela, duas linhas novas (as duas
 * sem id) colidiriam como chave de React e o cursor pularia entre os campos.
 */
function toDraft(game: BuilderGame): Draft {
  const toItem = (row: { id: string; label: string; slug: string }): BuilderListItem => ({
    id: row.id,
    label: row.label,
    slug: row.slug,
    key: row.id,
  });

  return {
    name: game.name,
    slug: game.slug,
    heading: game.heading ?? "",
    serversLabel: game.serversLabel ?? "",
    categoriesLabel: game.categoriesLabel ?? "",
    description: game.description ?? "",
    productTypes: [...game.productTypes],
    servers: game.servers.map(toItem),
    categories: game.categories.map(toItem),
    // Sempre concreta na tela: `resolveSectionOrder` traduz o vazio do banco
    // ("não personalizado") na ordem padrão do arquivo.
    sectionOrder: resolveSectionOrder(game.sectionOrder),
    imageUrl: game.imageUrl ?? null,
    banners: game.banners.map((banner) => ({
      id: banner.id,
      imageUrl: banner.imageUrl,
      href: banner.href,
    })),
  };
}

/** Quais etapas diferem do que está publicado. Ver `dirtySteps`. */
function diffSteps(draft: Draft, saved: Draft): ReadonlySet<BuilderStepId> {
  const dirty = new Set<BuilderStepId>();

  if (
    draft.heading !== saved.heading ||
    draft.serversLabel !== saved.serversLabel ||
    draft.categoriesLabel !== saved.categoriesLabel
  ) {
    dirty.add("titulos");
  }
  if (draft.name !== saved.name || draft.slug !== saved.slug) dirty.add("nome");
  if (draft.description !== saved.description) dirty.add("descricao");
  if (!sameList(draft.productTypes, saved.productTypes)) {
    dirty.add("categorias-principais");
  }
  if (!sameItems(draft.servers, saved.servers)) dirty.add("servidores");
  if (!sameItems(draft.categories, saved.categories)) dirty.add("categorias");
  if (!sameList(draft.sectionOrder, saved.sectionOrder)) dirty.add("ordem");

  // Banner e logo NÃO entram: eles já foram publicados no momento do upload,
  // então nunca estão "pendentes de publicação".
  return dirty;
}

function sameList(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/** Ordem importa: reordenar servidores é uma alteração como qualquer outra. */
function sameItems(a: BuilderListItem[], b: BuilderListItem[]) {
  return (
    a.length === b.length &&
    a.every((item, index) => item.id === b[index].id && item.label === b[index].label)
  );
}
