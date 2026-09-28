"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { toastError } from "@/components/ui/Toasts";
import { cn } from "@/lib/cn";
import { ACTION_FAILED_UPLOAD_MESSAGE, runAction } from "@/lib/safeAction";
import { backendAsset } from "@/lib/publicApi";
import { uploadPageAssetAction } from "../actions";
import { categorySelectOptions } from "@/features/admin/products/categoryOptions";
import { youtubeId } from "@/features/home/youtube";
import type { FieldSpec, SubFieldSpec } from "../catalog";
import type { Cta, PageLink } from "../types";

/** Jogo como o editor precisa dele (vem de `GET /admin/games`). */
export type EditorGame = {
  id: string;
  name: string;
  slug: string;
  /**
   * Abas CATALOG do jogo (slug + rótulo), por posição — as opções do filtro
   * do bloco "Produtos". `null` = a leitura das abas falhou.
   */
  catalogTabs: { slug: string; label: string }[] | null;
  categories: { id: string; label: string; parentId?: string | null }[];
};

/** Valor-sentinela dos selects opcionais: o Radix não aceita `""` como valor. */
const NONE = "__none";

type FieldProps = {
  spec: FieldSpec;
  value: unknown;
  /** Todas as props do bloco — campos dependentes (tipo/categoria) leem o jogo. */
  props: Record<string, unknown>;
  games: EditorGame[];
  onChange: (value: unknown) => void;
};

/**
 * Um campo do formulário do bloco, escolhido pelo `kind` declarado no catálogo.
 * Texto opcional vazio vira `undefined` — é "ausente" para o backend, e o bloco
 * esconde a parte correspondente em vez de desenhar uma caixa vazia.
 */
export function BlockField({ spec, value, props, games, onChange }: FieldProps) {
  switch (spec.kind) {
    case "text":
      return (
        <TextField
          label={spec.label + (spec.required ? " *" : "")}
          value={typeof value === "string" ? value : ""}
          maxLength={spec.max}
          placeholder={spec.placeholder}
          onChange={(event) => onChange(emptyToUndefined(event.target.value, spec.required))}
        />
      );
    case "textarea":
      return (
        <div>
          <TextAreaField
            label={spec.label + (spec.required ? " *" : "")}
            value={typeof value === "string" ? value : ""}
            maxLength={spec.max}
            rows={spec.rows ?? 4}
            onChange={(event) => onChange(emptyToUndefined(event.target.value, spec.required))}
          />
          {spec.hint ? <Hint>{spec.hint}</Hint> : null}
        </div>
      );
    case "select":
      return (
        <SelectField
          label={spec.label}
          options={spec.options}
          value={value === undefined ? undefined : String(value)}
          onValueChange={(next) => onChange(/^\d+$/.test(next) ? Number(next) : next)}
        />
      );
    case "number":
      return (
        <TextField
          label={`${spec.label} (${spec.min}–${spec.max})`}
          type="number"
          min={spec.min}
          max={spec.max}
          value={typeof value === "number" ? String(value) : ""}
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (Number.isFinite(parsed)) onChange(Math.min(spec.max, Math.max(spec.min, Math.round(parsed))));
          }}
        />
      );
    case "image":
      return <ImageInput label={spec.label} hint={spec.hint} value={value as string | undefined} onChange={onChange} />;
    case "cta":
      return <CtaInput label={spec.label} value={value as Cta | undefined} games={games} onChange={onChange} />;
    case "game":
      return (
        <SelectField
          label={spec.label + " *"}
          placeholder="Escolha o jogo"
          options={games.map((game) => ({ value: game.id, label: game.name }))}
          value={typeof value === "string" && value ? value : undefined}
          onValueChange={onChange}
        />
      );
    case "games":
      return <GamesInput label={spec.label} hint={spec.hint} value={(value as string[]) ?? []} games={games} onChange={onChange} />;
    case "tab": {
      const game = games.find((item) => item.id === props[spec.gameField]);
      const tabs = game?.catalogTabs ?? [];
      const current = typeof value === "string" && value ? value : NONE;
      const options = [
        { value: NONE, label: "Todas as abas" },
        ...tabs.map((tab) => ({ value: tab.slug, label: tab.label })),
        // Aba gravada que não está mais na lista (desativada, virou serviço,
        // leitura falhou): continua visível em vez de sumir em silêncio.
        ...(current !== NONE && !tabs.some((tab) => tab.slug === current)
          ? [{ value: current, label: `${current} (indisponível)` }]
          : []),
      ];
      return (
        <div>
          <SelectField
            key={`${spec.name}-${game?.id ?? "sem-jogo"}`}
            label={spec.label}
            options={options}
            value={current}
            onValueChange={(next) => onChange(next === NONE ? undefined : next)}
            disabled={!game}
          />
          {game && game.catalogTabs === null ? <Hint>Não foi possível carregar as abas deste jogo.</Hint> : null}
        </div>
      );
    }
    case "category": {
      const game = games.find((item) => item.id === props[spec.gameField]);
      if (!game || game.categories.length === 0) return null;
      return (
        <SelectField
          key={`${spec.name}-${game.id}`}
          label={spec.label}
          // Categoria e subcategoria ("Pai › Filha"): escolher o pai inclui os
          // produtos das filhas (regra do backend).
          options={[{ value: NONE, label: "Todas as categorias" }, ...categorySelectOptions(game.categories)]}
          value={typeof value === "string" ? value : NONE}
          onValueChange={(next) => onChange(next === NONE ? undefined : next)}
        />
      );
    }
    case "link":
      return <OptionalLinkInput label={spec.label} value={value as PageLink | undefined} games={games} onChange={onChange} />;
    case "video":
      return <VideoInput label={spec.label} value={typeof value === "string" ? value : ""} onChange={onChange} />;
    case "items":
      return (
        <ItemsInput
          spec={spec}
          value={(value as (Record<string, unknown> & { id: string })[]) ?? []}
          onChange={onChange}
        />
      );
  }
}

function emptyToUndefined(text: string, required?: boolean) {
  return !required && text.trim() === "" ? undefined : text;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-[6px] pl-[4px] font-poppins text-[12px] leading-[17px] text-brand-fg-subtle">{children}</p>;
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-[8px] font-helvetica text-[16px] font-bold text-white">{children}</p>;
}

/** Imagem: sobe NA HORA (binário não cabe no rascunho JSON) e guarda o caminho. */
function ImageInput({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string | undefined;
  onChange: (value: unknown) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const src = backendAsset(value ?? null);

  async function upload(file: File) {
    setBusy(true);
    const form = new FormData();
    form.set("image", file, file.name);
    const result = await runAction(() => uploadPageAssetAction(form), {
      ok: false as const,
      reason: "error" as const,
      message: ACTION_FAILED_UPLOAD_MESSAGE,
    });
    setBusy(false);
    if (!result.ok) {
      toastError(result.message ?? "Não foi possível enviar a imagem.");
      return;
    }
    onChange(result.data.url);
  }

  return (
    <div>
      <GroupLabel>{label}</GroupLabel>
      <div className="flex items-center gap-[12px]">
        <div className="relative size-[72px] shrink-0 overflow-hidden rounded-[12px] border border-brand-border bg-black/40">
          {src ? <Image src={src} alt="" fill sizes="72px" className="object-cover" /> : null}
        </div>
        <div className="flex flex-wrap gap-[8px]">
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="h-[36px] rounded-full border border-white/20 px-[14px] font-poppins text-[12px] font-bold text-white hover:bg-white/5 disabled:opacity-50"
          >
            {busy ? "Enviando…" : src ? "Trocar imagem" : "Enviar imagem"}
          </button>
          {src ? (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="h-[36px] rounded-full px-[10px] font-poppins text-[12px] text-red-9 hover:bg-red-9/10"
            >
              Remover
            </button>
          ) : null}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
      </div>
      {hint ? <Hint>{hint}</Hint> : null}
    </div>
  );
}

const LINK_KINDS = [
  { value: "game", label: "Página de um jogo" },
  { value: "path", label: "Página do site" },
  { value: "url", label: "Link externo (https)" },
] as const;

const SITE_PATHS = [
  { value: "/venda", label: "Venda pra nós" },
  { value: "/fidelidade", label: "Fidelidade" },
  { value: "/conta/pedidos", label: "Meus pedidos" },
  { value: "/termos", label: "Termos de uso" },
  { value: "/politica-de-privacidade", label: "Política de privacidade" },
];

/**
 * Botão: rótulo + destino. O destino é ESCOLHIDO (jogo cadastrado, página do
 * site) sempre que possível — link digitado à mão é o que quebra quando um
 * endereço muda. Link externo só com https.
 */
function CtaInput({
  label,
  value,
  games,
  onChange,
}: {
  label: string;
  value: Cta | undefined;
  games: EditorGame[];
  onChange: (value: unknown) => void;
}) {
  if (!value) {
    return (
      <div>
        <GroupLabel>{label}</GroupLabel>
        <button
          type="button"
          onClick={() => onChange({ label: "Ver jogos", link: { kind: "path", path: "/venda" } } satisfies Cta)}
          className="h-[36px] rounded-full border border-dashed border-white/25 px-[14px] font-poppins text-[12px] font-bold text-white hover:border-brand-orange"
        >
          + Adicionar botão
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[14px] rounded-[16px] border border-brand-border p-[14px]">
      <div className="flex items-center justify-between">
        <GroupLabel>{label}</GroupLabel>
        <button type="button" onClick={() => onChange(undefined)} className="font-poppins text-[12px] text-red-9 hover:underline">
          Remover botão
        </button>
      </div>
      <TextField
        label="Texto do botão *"
        value={value.label}
        maxLength={40}
        onChange={(event) => onChange({ ...value, label: event.target.value })}
      />
      <LinkPicker value={value.link} games={games} onChange={(link) => onChange({ ...value, link })} />
    </div>
  );
}

/** Escolha do destino: jogo cadastrado, página do site ou https. */
function LinkPicker({
  value,
  games,
  onChange,
}: {
  value: PageLink;
  games: EditorGame[];
  onChange: (link: PageLink) => void;
}) {
  return (
    <>
      <SelectField
        label="Leva para"
        options={LINK_KINDS}
        value={value.kind}
        onValueChange={(kind) =>
          onChange(
            kind === "game"
              ? { kind: "game", gameId: games[0]?.id ?? "" }
              : kind === "url"
                ? { kind: "url", url: "https://" }
                : { kind: "path", path: "/venda" },
          )
        }
      />
      {value.kind === "game" ? (
        <SelectField
          key="link-game"
          label="Jogo"
          placeholder="Escolha o jogo"
          options={games.map((game) => ({ value: game.id, label: game.name }))}
          value={value.gameId || undefined}
          onValueChange={(gameId) => onChange({ kind: "game", gameId })}
        />
      ) : value.kind === "path" ? (
        <SelectField
          key="link-path"
          label="Página"
          options={SITE_PATHS}
          value={value.path}
          onValueChange={(path) => onChange({ kind: "path", path })}
        />
      ) : (
        <TextField
          key="link-url"
          label="Endereço (https://…)"
          value={value.url}
          maxLength={500}
          onChange={(event) => onChange({ kind: "url", url: event.target.value.trim() })}
        />
      )}
    </>
  );
}

/** Link OPCIONAL (banner): sem link a imagem é só vitrine. */
function OptionalLinkInput({
  label,
  value,
  games,
  onChange,
}: {
  label: string;
  value: PageLink | undefined;
  games: EditorGame[];
  onChange: (value: unknown) => void;
}) {
  if (!value) {
    return (
      <div>
        <GroupLabel>{label}</GroupLabel>
        <button
          type="button"
          onClick={() => onChange({ kind: "path", path: "/venda" } satisfies PageLink)}
          className="h-[36px] rounded-full border border-dashed border-white/25 px-[14px] font-poppins text-[12px] font-bold text-white hover:border-brand-orange"
        >
          + Adicionar link
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-[14px] rounded-[16px] border border-brand-border p-[14px]">
      <div className="flex items-center justify-between">
        <GroupLabel>{label}</GroupLabel>
        <button type="button" onClick={() => onChange(undefined)} className="font-poppins text-[12px] text-red-9 hover:underline">
          Remover link
        </button>
      </div>
      <LinkPicker value={value} games={games} onChange={onChange} />
    </div>
  );
}

/**
 * Vídeo: o admin COLA a URL (qualquer formato do YouTube) e guardamos só o
 * ID — é o único dado que vai ao iframe, sempre em host fixo. URL que não é
 * do YouTube fica marcada como inválida, sem gravar nada.
 */
function VideoInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: unknown) => void;
}) {
  const [draft, setDraft] = useState(value ? `https://youtu.be/${value}` : "");
  const id = youtubeId(draft);
  return (
    <div>
      <TextField
        label={label + " *"}
        value={draft}
        placeholder="https://www.youtube.com/watch?v=…"
        maxLength={300}
        error={draft.trim() !== "" && !id ? "Esse link não é de um vídeo do YouTube." : undefined}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          const parsed = youtubeId(next);
          if (parsed) onChange(parsed);
          else if (next.trim() === "") onChange("");
        }}
      />
      {id ? <Hint>Vídeo reconhecido: {id}</Hint> : null}
    </div>
  );
}

/** Jogos da grade: marcar/desmarcar, na ordem em que foram marcados. */
function GamesInput({
  label,
  hint,
  value,
  games,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string[];
  games: EditorGame[];
  onChange: (value: unknown) => void;
}) {
  return (
    <div>
      <GroupLabel>{label}</GroupLabel>
      <div className="flex flex-wrap gap-[8px]">
        {games.map((game) => {
          const position = value.indexOf(game.id);
          const active = position >= 0;
          return (
            <button
              key={game.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? value.filter((id) => id !== game.id) : [...value, game.id])}
              className={cn(
                "flex h-[34px] items-center gap-[6px] rounded-full border px-[12px] font-poppins text-[12px] transition-colors",
                active ? "border-brand-orange bg-brand-orange/10 text-white" : "border-white/15 text-white/70 hover:text-white",
              )}
            >
              {active ? <span className="text-brand-gradient font-bold">{position + 1}</span> : null}
              {game.name}
            </button>
          );
        })}
      </div>
      {hint ? <Hint>{hint}</Hint> : null}
    </div>
  );
}

/**
 * Lista de itens de um bloco (perguntas, contadores, depoimentos) — um editor
 * só, montado a partir dos sub-campos do catálogo.
 */
function ItemsInput({
  spec,
  value,
  onChange,
}: {
  spec: Extract<FieldSpec, { kind: "items" }>;
  value: (Record<string, unknown> & { id: string })[];
  onChange: (value: unknown) => void;
}) {
  const update = (index: number, name: string, next: unknown) =>
    onChange(
      value.map((item, i) => {
        if (i !== index) return item;
        const copy = { ...item };
        if (next === undefined) delete copy[name];
        else copy[name] = next;
        return copy;
      }),
    );
  const move = (index: number, direction: -1 | 1) => {
    const to = index + direction;
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    [next[index], next[to]] = [next[to], next[index]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-[12px]">
      <GroupLabel>{spec.label}</GroupLabel>
      {value.map((item, index) => (
        <div key={item.id} className="flex flex-col gap-[12px] rounded-[16px] border border-brand-border p-[14px]">
          <div className="flex items-center justify-between">
            <span className="font-poppins text-[12px] font-bold text-brand-fg-subtle">
              {spec.itemLabel} {index + 1}
            </span>
            <span className="flex gap-[4px]">
              <SmallButton onClick={() => move(index, -1)} disabled={index === 0} label={`Subir ${spec.itemLabel}`}>↑</SmallButton>
              <SmallButton onClick={() => move(index, 1)} disabled={index === value.length - 1} label={`Descer ${spec.itemLabel}`}>↓</SmallButton>
              <SmallButton
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                disabled={value.length <= spec.min}
                label={`Remover ${spec.itemLabel}`}
                danger
              >
                ✕
              </SmallButton>
            </span>
          </div>
          {spec.fields.map((field) => (
            <SubField key={field.name} spec={field} value={item[field.name]} onChange={(next) => update(index, field.name, next)} />
          ))}
        </div>
      ))}
      {value.length < spec.max ? (
        <button
          type="button"
          onClick={() => onChange([...value, spec.newItem()])}
          className="h-[36px] rounded-full border border-dashed border-white/25 font-poppins text-[12px] font-bold text-white hover:border-brand-orange"
        >
          + Adicionar {spec.itemLabel.toLowerCase()}
        </button>
      ) : null}
    </div>
  );
}

function SubField({
  spec,
  value,
  onChange,
}: {
  spec: SubFieldSpec;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (spec.kind) {
    case "text":
      return (
        <TextField
          label={spec.label + (spec.required ? " *" : "")}
          value={typeof value === "string" ? value : ""}
          maxLength={spec.max}
          onChange={(event) => onChange(emptyToUndefined(event.target.value, spec.required))}
        />
      );
    case "textarea":
      return (
        <TextAreaField
          label={spec.label + (spec.required ? " *" : "")}
          value={typeof value === "string" ? value : ""}
          maxLength={spec.max}
          rows={spec.rows ?? 3}
          onChange={(event) => onChange(emptyToUndefined(event.target.value, spec.required))}
        />
      );
    case "rating":
      return <RatingInput label={spec.label} value={typeof value === "number" ? value : 5} onChange={onChange} />;
    case "image":
      return <ImageInput label={spec.label} value={value as string | undefined} onChange={onChange} />;
  }
}

/** Nota de 1 a 5 em estrelas clicáveis (com rótulo para leitor de tela). */
function RatingInput({ label, value, onChange }: { label: string; value: number; onChange: (value: unknown) => void }) {
  return (
    <div>
      <GroupLabel>{label}</GroupLabel>
      <div role="radiogroup" aria-label={label} className="flex gap-[4px]">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
            onClick={() => onChange(star)}
            className={cn("text-[22px] leading-none", star <= value ? "text-brand-orange" : "text-white/20")}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

function SmallButton({
  children,
  onClick,
  disabled,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-[24px] min-w-[24px] rounded-[6px] px-[4px] font-poppins text-[12px] disabled:opacity-30",
        danger ? "text-red-9 hover:bg-red-9/15" : "text-white/70 hover:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}
