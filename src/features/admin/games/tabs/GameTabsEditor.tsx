"use client";

import * as Popover from "@radix-ui/react-popover";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { TextField } from "@/components/ui/TextField";
import { toastError, toastOk } from "@/components/ui/Toasts";
import { ACTION_FAILED_MESSAGE, ACTION_FAILED_UPLOAD_MESSAGE, runAction } from "@/lib/safeAction";
import { slugify, slugifyDraft } from "@/lib/slugify";
import { centralHref } from "../central";
import { tabWarnings } from "../centralView";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "../options";
import {
  createTabAction,
  deleteTabAction,
  updateTabAction,
  uploadTabIconAction,
  type TabsResult,
} from "./actions";
import {
  ServiceSectionsEditor,
  fromSectionDrafts,
  toSectionDrafts,
  type SectionDraft,
} from "./ServiceSectionsEditor";
import {
  TAB_LAYOUTS,
  hasTabContent,
  isProductTab,
  layoutLabel,
  defaultTabIcon,
  tabIconSrc,
  type GameTab,
  type TabLayout,
} from "./types";
import { cn } from "@/lib/cn";

/**
 * Peças do editor das ABAS de um jogo (contrato `game-tabs.md`, 2026-09-28),
 * montadas na Central do jogo (`/admin/jogos/[id]?secao=abas`, Etapa 2 de
 * admin-games-ux.md) — a lista à esquerda é `TabsMasterList`; aqui ficam o
 * detalhe da aba escolhida (`TabDetailPanel`), a nova aba e a lixeira.
 *
 * ── Grava a cada gesto, não num SALVAR geral ───────────────────────────────
 * Cada aba é um recurso próprio no backend (POST/PATCH/DELETE por aba, ícone
 * por upload, ordem num PUT). Criar, ativar, trocar ícone e apagar valem na
 * hora. Depois de cada gravação a página é revalidada (`router.refresh()`): a
 * lista da esquerda, as contagens e os produtos vêm de novo do servidor.
 */
export function TabDetailPanel({
  gameId,
  gameSlug,
  tab,
}: {
  gameId: string;
  gameSlug: string;
  tab: GameTab;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Configuração é coisa de uma vez; produto e preço são do dia a dia. Fechada
  // por padrão, a aba mostra um resumo de uma linha e os produtos sobem.
  const [editing, setEditing] = useState(false);
  const warnings = tabWarnings(tab);
  const sectionCount = tab.content?.sections.length ?? 0;

  function toggleActive() {
    startTransition(async () => {
      const result = await runAction(
        () => updateTabAction(gameId, tab.id, { isActive: !tab.isActive }),
        FAILED,
      );
      if (!result.ok) {
        toastError(result.message ?? MESSAGES[result.reason]);
        return;
      }
      toastOk(result.data.isActive ? "Aba ativada." : "Aba oculta da loja.");
      router.refresh();
    });
  }

  return (
    <section
      aria-labelledby="aba-detalhe"
      className="rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)] px-[20px] py-[20px]"
    >
      <div className="flex flex-wrap items-center gap-x-[20px] gap-y-[12px]">
        <TabIconUpload gameId={gameId} tab={tab} onUploaded={() => router.refresh()} />

        <div className="min-w-[180px] flex-1">
          <h3
            id="aba-detalhe"
            className="flex flex-wrap items-center gap-[10px] font-poppins text-[18px] font-bold text-white"
          >
            {tab.label}
            <LayoutBadge layout={tab.layout} />
            {tab.isActive ? null : <HiddenBadge />}
          </h3>
          <p className="mt-[4px] font-poppins text-[12px] text-brand-fg-subtle">
            ?aba={tab.slug}
            {tab.layout === "LINK" ? ` → ${tab.linkHref ?? "—"}` : null}
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-[8px] font-poppins text-[13px] font-bold text-white/80">
          <input
            type="checkbox"
            checked={tab.isActive}
            disabled={pending}
            onChange={toggleActive}
            className="size-[18px] accent-[var(--brand-orange)]"
          />
          Ativa na loja
        </label>

        <Link
          href={`/games/${encodeURIComponent(gameSlug)}?aba=${encodeURIComponent(tab.slug)}`}
          target="_blank"
          rel="noopener"
          className="font-poppins text-[13px] font-bold text-brand-orange transition-opacity hover:opacity-80"
        >
          Ver na loja ↗
        </Link>

        <DeleteTabButton
          gameId={gameId}
          tab={tab}
          onDeleted={() => {
            router.push(centralHref(gameId, { section: "abas" }), { scroll: false });
            router.refresh();
          }}
        />
      </div>

      {warnings.length > 0 ? (
        <ul className="mt-[15px] flex flex-col gap-[6px]">
          {warnings.map((warning) => (
            <li
              key={warning.code}
              className="rounded-[12px] border border-brand-orange/40 bg-brand-orange/10 px-[14px] py-[8px] font-poppins text-[13px] text-white"
            >
              {warning.detail}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-[15px] flex flex-wrap items-center gap-x-[20px] gap-y-[8px] border-t border-white/10 pt-[15px]">
        <p className="min-w-0 flex-1 font-poppins text-[13px] text-brand-fg-subtle">
          <span className="font-bold text-white">{layoutLabel(tab.layout)}</span>
          {" — "}
          {TAB_LAYOUTS.find((option) => option.value === tab.layout)?.hint}
          {hasTabContent(tab.layout)
            ? ` · ${sectionCount} seç${sectionCount === 1 ? "ão" : "ões"} de texto`
            : null}
        </p>
        <button
          type="button"
          onClick={() => setEditing((open) => !open)}
          aria-expanded={editing}
          className="h-[36px] rounded-full border border-white/15 px-[16px] font-poppins text-[12px] font-bold text-white transition-colors hover:bg-white/5"
        >
          {editing ? "Fechar configurações" : hasTabContent(tab.layout) ? "Editar nome, layout e textos" : "Editar nome e layout"}
        </button>
      </div>

      {editing ? (
        <TabEditPanel
          // Remonta com o que o servidor devolveu depois de salvar (ou de outra
          // aba escolhida): o rascunho nunca fica com o valor velho.
          key={tabSignature(tab)}
          gameId={gameId}
          tab={tab}
          onSaved={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      ) : null}
    </section>
  );
}

/** Tudo o que o formulário da aba mostra — muda = remonta com o valor novo. */
export function tabSignature(tab: GameTab): string {
  return JSON.stringify([tab.id, tab.label, tab.slug, tab.layout, tab.linkHref, tab.content]);
}

export function HiddenBadge() {
  return (
    <span className="rounded-full border border-white/15 px-[10px] py-[2px] font-poppins text-[11px] font-bold text-white/50">
      OCULTA
    </span>
  );
}

export const MESSAGES = {
  unauthenticated: "Sua sessão expirou. Entre de novo para continuar.",
  forbidden: "Sua conta não tem permissão para editar as abas.",
  invalid: "Confira os campos e tente de novo.",
  error: "Não conseguimos salvar agora. Tente novamente em instantes.",
} as const;

export const FAILED = { ok: false, reason: "error", message: ACTION_FAILED_MESSAGE } as const satisfies TabsResult<never>;

export function LayoutBadge({ layout }: { layout: TabLayout }) {
  // Laranja = aba de preço cotado; branco = aba sem produto; cinza = catálogo.
  const tone = hasTabContent(layout)
    ? "border-brand-orange/50 text-brand-orange"
    : layout === "LINK" || layout === "SELL"
      ? "border-white/40 text-white"
      : "border-white/20 text-white/70";
  return (
    <span className={`rounded-full border px-[10px] py-[2px] font-poppins text-[11px] font-bold ${tone}`}>
      {layoutLabel(layout).toUpperCase()}
    </span>
  );
}

/**
 * Escolha do layout: os 6 como cartões (nome + uma linha do que a aba mostra
 * na loja), em vez de um select com texto comprido que não cabe na pílula.
 * São `<input type="radio">` de verdade dentro de `<label>`: setas, Tab e
 * leitor de tela funcionam sem código à mão.
 */
function LayoutPicker({
  value,
  onChange,
  disabled,
}: {
  value: TabLayout;
  onChange: (layout: TabLayout) => void;
  disabled?: boolean;
}) {
  const name = useId();
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-[12px] pl-[25px] font-poppins text-[15px] font-bold text-white">Layout</legend>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-[10px]">
        {TAB_LAYOUTS.map((option) => {
          const active = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer flex-col gap-[4px] rounded-[16px] border px-[16px] py-[12px] transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-orange",
                active ? "border-brand-orange bg-brand-orange/15" : "border-white/10 hover:border-white/30",
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={active}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span className={cn("font-poppins text-[14px] font-bold", active ? "text-white" : "text-white/80")}>
                {option.label}
              </span>
              <span className="font-poppins text-[12px] leading-[17px] text-brand-fg-subtle">{option.hint}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * O ícone É o botão de trocar: clicar abre o seletor e sobe na hora. O
 * `<input type="file">` fica no DOM dentro do `<label>` (foco, Tab e leitor de
 * tela), mesma decisão do `FileField`.
 */
export function TabIconUpload({
  gameId,
  tab,
  onUploaded,
}: {
  gameId: string;
  tab: GameTab;
  onUploaded: (iconUrl: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const src = tabIconSrc(tab.iconUrl ?? defaultTabIcon(tab.slug, tab.layout));

  function send(file: File) {
    if (file.size > MAX_IMAGE_BYTES) {
      toastError("A imagem precisa ter no máximo 5 MB.");
      return;
    }
    const form = new FormData();
    form.append("image", file);
    startTransition(async () => {
      const result = await runAction(() => uploadTabIconAction(gameId, tab.id, form), {
        ok: false,
        reason: "error",
        message: ACTION_FAILED_UPLOAD_MESSAGE,
      });
      if (!result.ok) {
        toastError(result.message ?? "Não foi possível enviar o ícone.");
        return;
      }
      onUploaded(result.data.iconUrl);
      toastOk("Ícone trocado.");
    });
  }

  return (
    <label
      title="Trocar ícone (PNG, JPEG, WebP ou AVIF, até 5 MB)"
      className="relative flex size-[64px] shrink-0 cursor-pointer items-center justify-center rounded-[12px] border border-white/10 bg-black/30 transition-opacity hover:opacity-80"
    >
      {src ? (
        <Image src={src} alt="" width={50} height={50} className="size-[50px] object-contain" />
      ) : (
        <span className="font-poppins text-[11px] text-white/40">Ícone</span>
      )}
      {pending ? (
        <span className="absolute inset-0 flex items-center justify-center rounded-[12px] bg-black/60 font-poppins text-[11px] text-white">
          Enviando…
        </span>
      ) : null}
      <span className="sr-only">Trocar ícone de {tab.label}</span>
      <input
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        disabled={pending}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Limpo para reescolher o MESMO arquivo depois de um erro disparar de novo.
          event.target.value = "";
          if (file) send(file);
        }}
      />
    </label>
  );
}

/**
 * Nome, endereço, layout, link (LINK) e textos (SERVICE/QUANTITY/PACKAGES) de
 * uma aba existente.
 *
 * Trocar o layout manda junto a limpeza do que o layout novo não tem (`null`
 * em `linkHref`/`content`), senão o backend recusaria a combinação. Virar
 * LINK/SELL com produto dentro é recusado pelo BACKEND — a mensagem dele
 * aparece embaixo do botão, como texto.
 */
export function TabEditPanel({
  gameId,
  tab,
  onSaved,
}: {
  gameId: string;
  tab: GameTab;
  onSaved: (tab: GameTab) => void;
}) {
  const [label, setLabel] = useState(tab.label);
  const [slug, setSlug] = useState(tab.slug);
  const [layout, setLayout] = useState<TabLayout>(tab.layout);
  const [linkHref, setLinkHref] = useState(tab.linkHref ?? "");
  const [sections, setSections] = useState<SectionDraft[]>(() => toSectionDrafts(tab.content?.sections));
  // Trocar de layout é raro e muda o que a aba É na loja: os 6 cartões só
  // aparecem a pedido, para não serem clicados de passagem.
  const [pickingLayout, setPickingLayout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    const finalSlug = slugify(slug).slice(0, 60);
    const input = {
      label,
      ...(finalSlug && finalSlug !== tab.slug ? { slug: finalSlug } : {}),
      ...(layout !== tab.layout ? { layout } : {}),
      ...(layout === "LINK"
        ? { linkHref: linkHref.trim() }
        : tab.layout === "LINK"
          ? { linkHref: null }
          : {}),
      ...(hasTabContent(layout)
        ? { content: { sections: fromSectionDrafts(sections) } }
        : tab.content
          ? { content: null }
          : {}),
    };
    startTransition(async () => {
      const result = await runAction(() => updateTabAction(gameId, tab.id, input), FAILED);
      if (!result.ok) {
        setError(result.message ?? MESSAGES[result.reason]);
        return;
      }
      toastOk("Aba salva.");
      onSaved(result.data);
    });
  }

  return (
    <div className="mt-[20px] flex flex-col gap-[25px] border-t border-white/10 pt-[20px]">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(0,315px))] gap-x-[50px] gap-y-[25px]">
        <TextField label="Nome da aba" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} />
        <div>
          <TextField
            label="Endereço (?aba=)"
            value={slug}
            maxLength={60}
            onChange={(e) => setSlug(slugifyDraft(e.target.value))}
          />
          {slugify(slug) !== tab.slug ? (
            <p className="mt-[6px] pl-[25px] font-helvetica text-[12px] text-brand-orange">
              Links antigos com ?aba={tab.slug} deixam de abrir esta aba.
            </p>
          ) : null}
        </div>
        {layout === "LINK" ? (
          <TextField
            label="Link"
            value={linkHref}
            maxLength={300}
            placeholder="/venda ou https://..."
            onChange={(e) => setLinkHref(e.target.value)}
          />
        ) : null}
      </div>

      <div className="max-w-[1100px]">
        {pickingLayout || layout !== tab.layout ? (
          <LayoutPicker value={layout} onChange={setLayout} disabled={pending} />
        ) : (
          <div className="flex flex-wrap items-center gap-[12px] pl-[25px]">
            <span className="font-poppins text-[15px] font-bold text-white">Layout:</span>
            <LayoutBadge layout={tab.layout} />
            <button
              type="button"
              onClick={() => setPickingLayout(true)}
              className="font-poppins text-[13px] font-bold text-brand-orange transition-opacity hover:opacity-80"
            >
              Trocar layout
            </button>
          </div>
        )}
        {layout !== tab.layout && !isProductTab({ layout }) && tab.productCount > 0 ? (
          <p className="mt-[10px] pl-[25px] font-helvetica text-[13px] text-brand-orange">
            Esta aba tem {tab.productCount} produto{tab.productCount === 1 ? "" : "s"}. “{layoutLabel(layout)}” não
            mostra produtos: mova-os para outra aba antes, ou o servidor vai recusar a troca.
          </p>
        ) : null}
      </div>

      {hasTabContent(layout) ? (
        <div className="max-w-[900px]">
          <p className="mb-[15px] font-poppins text-[15px] font-bold text-white">Textos da aba (coluna esquerda)</p>
          <ServiceSectionsEditor sections={sections} onChange={setSections} />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-[15px]">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="h-[50px] w-[250px] rounded-full bg-[image:var(--brand-orange-gradient)] font-poppins text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {pending ? "SALVANDO…" : "SALVAR ABA"}
        </button>
        {error ? (
          <p role="alert" className="font-helvetica text-[14px] text-red-9">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function NewTabForm({ gameId, onCreated }: { gameId: string; onCreated: (tab: GameTab) => void }) {
  const [label, setLabel] = useState("");
  const [layout, setLayout] = useState<TabLayout>("CATALOG");
  const [linkHref, setLinkHref] = useState("");
  // Textos já no cadastro (Etapa 1): antes era criar e depois "Editar".
  const [sections, setSections] = useState<SectionDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create() {
    setError(null);
    if (!label.trim()) {
      setError("Dê um nome à aba.");
      return;
    }
    // O endereço sai do nome, aqui e no backend (que resolve colisão com 409).
    // Só o que o layout ESCOLHIDO tem: textos digitados num layout e
    // abandonados ao trocar para outro ficam no rascunho, mas não viajam (o
    // schema recusaria `content` num Catálogo). Sem seção nenhuma, nem vai.
    const content = hasTabContent(layout) ? fromSectionDrafts(sections) : [];
    const input = {
      label,
      layout,
      ...(layout === "LINK" ? { linkHref: linkHref.trim() } : {}),
      ...(content.length > 0 ? { content: { sections: content } } : {}),
    };
    startTransition(async () => {
      const result = await runAction(() => createTabAction(gameId, input), FAILED);
      if (!result.ok) {
        setError(result.message ?? MESSAGES[result.reason]);
        return;
      }
      onCreated(result.data);
      setLabel("");
      setLinkHref("");
      setSections([]);
      setLayout("CATALOG");
      toastOk("Aba criada.");
    });
  }

  return (
    <section
      aria-labelledby="nova-aba"
      className="rounded-[20px] border border-dashed border-white/20 px-[20px] py-[25px]"
    >
      <h3 id="nova-aba" className="font-poppins text-[16px] font-bold text-white">
        Nova aba
      </h3>
      <div className="mt-[20px] grid grid-cols-[repeat(auto-fit,minmax(0,315px))] items-end gap-x-[50px] gap-y-[25px]">
        <TextField
          label="Nome"
          value={label}
          maxLength={60}
          placeholder="Boosting"
          onChange={(e) => setLabel(e.target.value)}
        />
        {layout === "LINK" ? (
          <TextField
            label="Link"
            value={linkHref}
            maxLength={300}
            placeholder="/venda ou https://..."
            onChange={(e) => setLinkHref(e.target.value)}
          />
        ) : null}
        <button
          type="button"
          onClick={create}
          disabled={pending}
          className="h-[50px] rounded-full bg-[image:var(--brand-orange-gradient)] font-poppins text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {pending ? "CRIANDO…" : "+ CRIAR ABA"}
        </button>
      </div>
      <div className="mt-[25px] max-w-[1100px]">
        <LayoutPicker value={layout} onChange={setLayout} disabled={pending} />
      </div>
      {hasTabContent(layout) ? (
        <div className="mt-[25px] max-w-[900px]">
          <p className="mb-[15px] font-poppins text-[15px] font-bold text-white">Textos da aba (coluna esquerda)</p>
          <ServiceSectionsEditor sections={sections} onChange={setSections} />
        </div>
      ) : null}
      <p className="mt-[12px] font-poppins text-[12px] text-brand-fg-subtle">
        O ícone é enviado depois, clicando no quadrado da aba criada.
        {hasTabContent(layout) ? " Os textos podem ficar para depois, no painel da aba." : null}
      </p>
      {error ? (
        <p role="alert" className="mt-[10px] font-helvetica text-[14px] text-red-9">
          {error}
        </p>
      ) : null}
    </section>
  );
}

/**
 * Lixeira com confirmação por popover (mesmo padrão da de jogo e de produto).
 * Com produto ativo dentro o backend recusa com 409, e a mensagem dele aparece
 * aqui dentro — é ela que diz quantos produtos mover.
 */
export function DeleteTabButton({
  gameId,
  tab,
  onDeleted,
}: {
  gameId: string;
  tab: GameTab;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await runAction(() => deleteTabAction(gameId, tab.id), FAILED);
      if (!result.ok) {
        setError(result.message ?? MESSAGES[result.reason]);
        return;
      }
      setOpen(false);
      onDeleted();
      toastOk(`Aba ${tab.label} excluída.`);
    });
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <Popover.Trigger
        aria-label={`Excluir aba ${tab.label}`}
        className="flex size-[50px] items-center justify-center rounded-[8px] border border-white/10 bg-black/40 transition-opacity hover:opacity-90"
      >
        <Image src="/icons/admin/trash.svg" alt="" width={16} height={16} aria-hidden className="size-[16px]" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={8}
          className="brand-select-panel z-50 w-[300px] rounded-[20px] border border-brand-border bg-brand-surface p-[16px] shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
        >
          <p className="font-helvetica text-[14px] leading-[20px] text-white">
            Excluir a aba <span className="font-bold">{tab.label}</span>?
          </p>
          <p className="mt-[6px] font-helvetica text-[13px] leading-[18px] text-brand-fg-subtle">
            {!isProductTab(tab)
              ? "O botão some da página do jogo."
              : "As categorias desta aba vão junto. Com produto ativo dentro, a exclusão é recusada."}
          </p>
          {error ? (
            <p role="alert" className="mt-2 font-helvetica text-[13px] text-red-9">
              {error}
            </p>
          ) : null}
          <div className="mt-[14px] flex gap-[10px]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-[36px] flex-1 rounded-full border border-white/10 bg-[image:var(--brand-surface-fill)] font-poppins text-[13px] font-bold text-white transition-opacity hover:opacity-90"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={pending}
              className="h-[36px] flex-1 rounded-full border border-white/15 bg-brand-orange font-poppins text-[13px] font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Excluindo…" : "Excluir"}
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/**
 * "+ Nova aba" da Central: criada a aba, a Central já a abre à direita (com
 * "+ Produto nesta aba" e categorias) — o passo seguinte natural.
 */
export function NewTabPanel({ gameId }: { gameId: string }) {
  const router = useRouter();
  return (
    <NewTabForm
      gameId={gameId}
      onCreated={(tab) => router.push(centralHref(gameId, { section: "abas", tabId: tab.id }), { scroll: false })}
    />
  );
}
