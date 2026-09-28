"use client";

import * as Popover from "@radix-ui/react-popover";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { toastError, toastOk } from "@/components/ui/Toasts";
import { RowButton } from "@/features/admin/builder/BuilderPanels";
import { ACTION_FAILED_MESSAGE, ACTION_FAILED_UPLOAD_MESSAGE, runAction } from "@/lib/safeAction";
import { slugify, slugifyDraft } from "@/lib/slugify";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "../options";
import {
  createTabAction,
  deleteTabAction,
  reorderTabsAction,
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
import { TAB_LAYOUTS, layoutLabel, tabIconSrc, type GameTab, type TabLayout } from "./types";

/**
 * Editor das ABAS de um jogo (contrato `game-tabs.md`, 2026-09-28).
 *
 * ── Grava a cada gesto, não num SALVAR geral ───────────────────────────────
 * Cada aba é um recurso próprio no backend (POST/PATCH/DELETE por aba, ícone
 * por upload, ordem num PUT). Criar, ativar, trocar ícone e apagar valem na
 * hora — é o mesmo modelo da sessão de abas do "Edição de sessões". A única
 * coisa que junta rascunho é a ORDEM: ↑ ↓ mexem na lista local e "Salvar ordem"
 * manda tudo num PUT, para não gravar cinco ordens intermediárias.
 *
 * Por isso a tela é uma ROTA própria (`/admin/jogos/[id]/abas`) e não uma
 * seção do formulário de cadastro: lá tudo é rascunho até "SALVAR ALTERAÇÕES",
 * e dois modelos de gravação no mesmo formulário fariam a pessoa achar que o
 * botão de baixo salva as abas também.
 */
export function GameTabsEditor({
  gameId,
  gameSlug,
  initialTabs,
}: {
  gameId: string;
  gameSlug: string;
  initialTabs: GameTab[];
}) {
  const [tabs, setTabs] = useState(initialTabs);
  const [savedOrder, setSavedOrder] = useState(() => initialTabs.map((tab) => tab.id));
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const orderDirty =
    tabs.length !== savedOrder.length || tabs.some((tab, index) => tab.id !== savedOrder[index]);

  function replaceTab(next: GameTab) {
    setTabs((current) => current.map((tab) => (tab.id === next.id ? { ...tab, ...next } : tab)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= tabs.length) return;
    const next = [...tabs];
    [next[index], next[target]] = [next[target], next[index]];
    setTabs(next);
  }

  function saveOrder() {
    const ids = tabs.map((tab) => tab.id);
    startTransition(async () => {
      const result = await runAction(() => reorderTabsAction(gameId, ids), FAILED);
      if (!result.ok) {
        toastError(result.message ?? MESSAGES[result.reason]);
        return;
      }
      setSavedOrder(ids);
      toastOk("Ordem das abas salva.");
    });
  }

  function toggleActive(tab: GameTab) {
    startTransition(async () => {
      const result = await runAction(
        () => updateTabAction(gameId, tab.id, { isActive: !tab.isActive }),
        FAILED,
      );
      if (!result.ok) {
        toastError(result.message ?? MESSAGES[result.reason]);
        return;
      }
      replaceTab(result.data);
    });
  }

  return (
    <div className="flex flex-col gap-[30px]">
      <div className="flex flex-wrap items-center justify-between gap-[15px]">
        <p className="max-w-[760px] font-poppins text-[14px] text-brand-fg-subtle">
          As abas aparecem na página do jogo nesta ordem. <b className="text-white">Catálogo</b> mostra a
          grade de produtos, <b className="text-white">Serviço</b> mostra os textos e o configurador de preço,
          e <b className="text-white">Link</b> leva para outra página. Criar, ativar, trocar ícone e excluir
          valem na hora; a ordem só depois de “Salvar ordem”.
        </p>
        <Link
          href={`/games/${encodeURIComponent(gameSlug)}`}
          target="_blank"
          className="font-poppins text-[14px] font-bold text-brand-orange transition-opacity hover:opacity-80"
        >
          Ver na loja ↗
        </Link>
      </div>

      {tabs.length === 0 ? (
        <p className="font-poppins text-[14px] text-brand-fg-subtle">
          Este jogo ainda não tem abas. Sem nenhuma, a página dele abre sem catálogo.
        </p>
      ) : (
        <ul className="flex flex-col gap-[15px]">
          {tabs.map((tab, index) => (
            <li
              key={tab.id}
              className="rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)] px-[20px] py-[15px]"
            >
              <div className="flex flex-wrap items-center gap-x-[20px] gap-y-[12px]">
                <TabIconUpload
                  gameId={gameId}
                  tab={tab}
                  onUploaded={(iconUrl) => replaceTab({ ...tab, iconUrl })}
                />

                <div className="min-w-[180px] flex-1">
                  <p className="flex flex-wrap items-center gap-[10px] font-poppins text-[16px] font-bold text-white">
                    {tab.label}
                    <LayoutBadge layout={tab.layout} />
                    {tab.isActive ? null : (
                      <span className="rounded-full border border-white/15 px-[10px] py-[2px] font-poppins text-[11px] font-bold text-white/50">
                        OCULTA
                      </span>
                    )}
                  </p>
                  <p className="mt-[4px] font-poppins text-[12px] text-brand-fg-subtle">
                    ?aba={tab.slug}
                    {tab.layout === "LINK" ? ` → ${tab.linkHref ?? "—"}` : null}
                    {tab.layout === "LINK"
                      ? null
                      : ` · ${tab.productCount} produto${tab.productCount === 1 ? "" : "s"}`}
                  </p>
                </div>

                <label className="flex cursor-pointer items-center gap-[8px] font-poppins text-[13px] font-bold text-white/80">
                  <input
                    type="checkbox"
                    checked={tab.isActive}
                    disabled={pending}
                    onChange={() => toggleActive(tab)}
                    className="size-[18px] accent-[var(--brand-orange)]"
                  />
                  Ativa
                </label>

                <div className="flex items-center gap-[8px]">
                  <RowButton label={`Mover ${tab.label} para cima`} onClick={() => move(index, -1)} disabled={index === 0}>
                    ↑
                  </RowButton>
                  <RowButton
                    label={`Mover ${tab.label} para baixo`}
                    onClick={() => move(index, 1)}
                    disabled={index === tabs.length - 1}
                  >
                    ↓
                  </RowButton>
                  <button
                    type="button"
                    onClick={() => setEditing((current) => (current === tab.id ? null : tab.id))}
                    aria-expanded={editing === tab.id}
                    className="h-[50px] rounded-full border border-white/10 px-[20px] font-poppins text-[13px] font-bold text-white transition-opacity hover:opacity-80"
                  >
                    {editing === tab.id ? "Fechar" : "Editar"}
                  </button>
                  <DeleteTabButton
                    gameId={gameId}
                    tab={tab}
                    onDeleted={() => {
                      setTabs((current) => current.filter((item) => item.id !== tab.id));
                      setSavedOrder((current) => current.filter((id) => id !== tab.id));
                    }}
                  />
                </div>
              </div>

              {editing === tab.id ? (
                <TabEditPanel
                  gameId={gameId}
                  tab={tab}
                  onSaved={(next) => {
                    replaceTab(next);
                    setEditing(null);
                  }}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {orderDirty ? (
        <div className="flex flex-wrap items-center gap-[15px]">
          <button
            type="button"
            onClick={saveOrder}
            disabled={pending}
            className="h-[50px] w-[315px] rounded-full bg-[image:var(--brand-orange-gradient)] font-poppins text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {pending ? "SALVANDO…" : "SALVAR ORDEM"}
          </button>
          <p className="font-poppins text-[13px] text-brand-orange">A nova ordem ainda não foi salva.</p>
        </div>
      ) : null}

      <NewTabForm gameId={gameId} onCreated={(tab) => {
        setTabs((current) => [...current, tab]);
        setSavedOrder((current) => [...current, tab.id]);
      }} />
    </div>
  );
}

const MESSAGES = {
  unauthenticated: "Sua sessão expirou. Entre de novo para continuar.",
  forbidden: "Sua conta não tem permissão para editar as abas.",
  invalid: "Confira os campos e tente de novo.",
  error: "Não conseguimos salvar agora. Tente novamente em instantes.",
} as const;

const FAILED = { ok: false, reason: "error", message: ACTION_FAILED_MESSAGE } as const satisfies TabsResult<never>;

function LayoutBadge({ layout }: { layout: TabLayout }) {
  const tone =
    layout === "SERVICE"
      ? "border-brand-orange/50 text-brand-orange"
      : layout === "LINK"
        ? "border-white/40 text-white"
        : "border-white/20 text-white/70";
  return (
    <span className={`rounded-full border px-[10px] py-[2px] font-poppins text-[11px] font-bold ${tone}`}>
      {layoutLabel(layout).toUpperCase()}
    </span>
  );
}

/**
 * O ícone É o botão de trocar: clicar abre o seletor e sobe na hora. O
 * `<input type="file">` fica no DOM dentro do `<label>` (foco, Tab e leitor de
 * tela), mesma decisão do `FileField`.
 */
function TabIconUpload({
  gameId,
  tab,
  onUploaded,
}: {
  gameId: string;
  tab: GameTab;
  onUploaded: (iconUrl: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const src = tabIconSrc(tab.iconUrl);

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

/** Nome, endereço, link (LINK) e textos (SERVICE) de uma aba existente. */
function TabEditPanel({
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
  const [linkHref, setLinkHref] = useState(tab.linkHref ?? "");
  const [sections, setSections] = useState<SectionDraft[]>(() => toSectionDrafts(tab.content?.sections));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    const finalSlug = slugify(slug).slice(0, 60);
    const input = {
      label,
      ...(finalSlug && finalSlug !== tab.slug ? { slug: finalSlug } : {}),
      ...(tab.layout === "LINK" ? { linkHref: linkHref.trim() } : {}),
      ...(tab.layout === "SERVICE" ? { content: { sections: fromSectionDrafts(sections) } } : {}),
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
        {tab.layout === "LINK" ? (
          <TextField
            label="Link"
            value={linkHref}
            maxLength={300}
            placeholder="/venda ou https://..."
            onChange={(e) => setLinkHref(e.target.value)}
          />
        ) : null}
      </div>

      {tab.layout === "SERVICE" ? (
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

function NewTabForm({ gameId, onCreated }: { gameId: string; onCreated: (tab: GameTab) => void }) {
  const [label, setLabel] = useState("");
  const [layout, setLayout] = useState<TabLayout>("CATALOG");
  const [linkHref, setLinkHref] = useState("");
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create() {
    setError(null);
    if (!label.trim()) {
      setError("Dê um nome à aba.");
      return;
    }
    // O endereço sai do nome, aqui e no backend (que resolve colisão com 409).
    const input = {
      label,
      layout,
      ...(layout === "LINK" ? { linkHref: linkHref.trim() } : {}),
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
      setLayout("CATALOG");
      setFormKey((key) => key + 1);
      toastOk(
        result.data.layout === "SERVICE"
          ? "Aba criada. Abra “Editar” para escrever os textos dela."
          : "Aba criada.",
      );
    });
  }

  return (
    <section
      aria-labelledby="nova-aba"
      className="rounded-[20px] border border-dashed border-white/20 px-[20px] py-[25px]"
    >
      <h2 id="nova-aba" className="font-poppins text-[16px] font-bold text-white">
        Nova aba
      </h2>
      <div className="mt-[20px] grid grid-cols-[repeat(auto-fit,minmax(0,315px))] items-end gap-x-[50px] gap-y-[25px]">
        <TextField
          label="Nome"
          value={label}
          maxLength={60}
          placeholder="Boosting"
          onChange={(e) => setLabel(e.target.value)}
        />
        <SelectField
          key={formKey}
          label="Layout"
          options={TAB_LAYOUTS.map((option) => ({ value: option.value, label: `${option.label} — ${option.hint}` }))}
          defaultValue="CATALOG"
          onValueChange={(value) => setLayout(value as TabLayout)}
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
      <p className="mt-[12px] font-poppins text-[12px] text-brand-fg-subtle">
        O ícone é enviado depois, clicando no quadrado da aba criada. O layout não muda depois de criado.
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
function DeleteTabButton({
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
            {tab.layout === "LINK"
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
