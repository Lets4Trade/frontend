"use client";

import { slugify } from "@/lib/slugify";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition, type ReactNode } from "react";
import { toastError, toastOk } from "@/components/ui/Toasts";
import { ACTION_FAILED_MESSAGE, runAction } from "@/lib/safeAction";
import { centralHref } from "@/features/admin/games/central";
import { ADMIN_SHELL } from "@/features/admin/layout";
import { resolveSectionOrder } from "@/features/game/sections";
import { toCategoryTree } from "@/features/game/categoryTree";
import { savePageAction } from "./actions";
import { draftCategoriesToPayload } from "./payload";
import {
  BannerPanel,
  CategoryTreePanel,
  DescriptionPanel,
  LogoPanel,
  NamePanel,
  PanelShell,
  TitlesPanel,
} from "./BuilderPanels";
import { BuilderPreview } from "./BuilderPreview";
import { BuilderSidebar } from "./BuilderSidebar";
import type { GameTab } from "@/features/admin/games/tabs/types";
import { SectionOrderPanel } from "./SectionOrderPanel";
import { stepById, type BuilderStepId } from "./steps";
import { isGlobalCategory } from "./types";
import type {
  BuilderCategory,
  BuilderGame,
  BuilderListItem,
  BuilderShared,
  Draft,
} from "./types";

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
  tabs,
  canManage,
  nav,
  initialStep = null,
}: {
  game: BuilderGame;
  /**
   * Etapa aberta ao chegar (`?etapa=`, vinda do mapa da página na Central).
   * Já validada pela página: só etapa que edita aqui (sem `href`).
   */
  initialStep?: BuilderStepId | null;
  /**
   * Cargo ADMIN. O EDITOR abre o Builder, mas não a Central do jogo nem
   * Produtos (404 para ele): os atalhos para lá não aparecem.
   */
  canManage: boolean;
  /** A navegação da Central (`GameAdminNav` na forma `bar`), montada na página. */
  nav?: ReactNode;
  /**
   * As abas do jogo (Jogos → Abas). `null` = leitura falhou ou o backend ainda
   * não as tem: a maquete volta a desenhar as abas pelos tipos antigos.
   */
  tabs: GameTab[] | null;
  /** `null` quando a página publicada não pôde ser lida — a maquete segue sem
      os blocos compartilhados em vez de a tela inteira falhar. */
  shared: BuilderShared | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<BuilderStepId | null>(initialStep);
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
    // A primeira aba ATIVA de produto do jogo — a que a loja abre por padrão.
    const first = tabs
      ?.filter((tab) => tab.isActive && tab.layout !== "LINK")
      .sort((a, b) => a.position - b.position)[0];
    if (!first) return `Compre em ${draft.name}`;
    const what = first.label.charAt(0) + first.label.slice(1).toLocaleLowerCase("pt-BR");
    return `Compre ${what} De ${draft.name}`;
  }, [draft.name, tabs]);

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
            servers: draft.servers.map((item) => ({ id: item.id, label: item.label })),
            categories: draftCategoriesToPayload(draft.categories),
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
      {nav ? <div className="mb-[30px]">{nav}</div> : null}
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
          canManage={canManage}
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
                  canManage,
                })}
              </PanelShell>
            </>
          ) : (
            <BuilderPreview draft={draft} gameName={draft.name} shared={shared} tabs={tabs} />
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
    canManage: boolean;
  },
) {
  const { game, draft, patch, derivedHeading, canManage } = ctx;

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
    case "servidores":
      // Só leitura desde a Etapa 2 (admin-games-ux.md): os servidores moram
      // na Visão geral da Central. O `PUT` do Builder ainda EXIGE a lista
      // (`servers` é obrigatório no DTO e é troca completa), então o rascunho
      // continua levando a lista como veio — intocada aqui, nunca apaga nada.
      return <ServersReadOnly servers={draft.servers} gameId={game.id} canManage={canManage} />;
    case "categorias":
      return (
        <>
          <p className="font-poppins text-[13px] text-brand-fg-subtle">
            Estas são as categorias GLOBAIS do jogo: aparecem em todos os servidores e em todas as
            abas. As de um servidor ou de uma aba específica ficam na Central do jogo
            {canManage ? (
              <>
                {" "}
                (
                <Link
                  href={centralHref(game.id, { section: "abas" })}
                  className="font-bold text-brand-orange underline"
                >
                  Abas e produtos
                </Link>
                )
              </>
            ) : null}
            .
          </p>
          <CategoryTreePanel
            items={draft.categories}
            onChange={(categories) => patch({ categories })}
          />
        </>
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
    // As etapas 5 e 8 são `<Link>` na lateral e nunca abrem painel — ver `steps.ts`.
    case "categorias-principais":
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
    servers: game.servers.map(toItem),
    // Árvore de dois níveis, venha ela montada (`children`) ou plana (`parentId`).
    categories: toCategoryTree(game.categories.filter(isGlobalCategory)).map(
      (row): BuilderCategory => ({ ...toItem(row), children: row.children.map(toItem) }),
    ),
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
  if (!sameItems(draft.servers, saved.servers)) dirty.add("servidores");
  if (!sameCategories(draft.categories, saved.categories)) dirty.add("categorias");
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

/** Mesma regra de `sameItems`, nos dois níveis. */
function sameCategories(a: BuilderCategory[], b: BuilderCategory[]) {
  return sameItems(a, b) && a.every((item, index) => sameItems(item.children, b[index].children));
}

/** Etapa 6 só de leitura: a lista e, para o ADMIN, o atalho para editá-la. */
function ServersReadOnly({
  servers,
  gameId,
  canManage,
}: {
  servers: BuilderListItem[];
  gameId: string;
  canManage: boolean;
}) {
  return (
    <div className="flex flex-col gap-[15px]">
      {servers.length === 0 ? (
        <p className="font-poppins text-[14px] text-brand-fg-subtle">
          Sem servidores, a loja do game não mostra o filtro de servidor.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-[10px]">
          {servers.map((server) => (
            <li
              key={server.key}
              className="rounded-full border border-white/10 px-[16px] py-[8px] font-poppins text-[13px] text-white"
            >
              {server.label}
            </li>
          ))}
        </ul>
      )}
      {canManage ? (
        <Link
          href={centralHref(gameId, { section: "visao-geral" })}
          className="font-poppins text-[14px] font-bold text-brand-orange transition-opacity hover:opacity-80"
        >
          Editar servidores →
        </Link>
      ) : (
        <p className="font-poppins text-[13px] text-brand-fg-subtle">
          Os servidores são editados por um administrador, no cadastro do jogo.
        </p>
      )}
    </div>
  );
}
