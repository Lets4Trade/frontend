"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { toastError, toastOk } from "@/components/ui/Toasts";
import {
  deleteSectionItemAction,
  loadSectionItemsAction,
  reorderSectionItemsAction,
  saveSectionItemAction,
} from "@/features/site/actions";
import type { SectionItem } from "@/features/site/list";
import { SelectField } from "@/components/ui/SelectField";
import type { GameOption, SiteListDef } from "@/features/site/sections";
import { cn } from "@/lib/cn";
import {
  ACTION_FAILED_MESSAGE,
  ACTION_FAILED_UPLOAD_MESSAGE,
  runAction,
} from "@/lib/safeAction";

/**
 * O editor da LISTA de uma sessão — os reviews, os membros da equipe, os
 * guias, as dúvidas.
 *
 * ⚠️ NÃO ESTÁ NO FIGMA. O arquivo desenha "Edição de sessões" com quatro campos
 * (Página, Sessão, Imagem do Banner, Título) e a fileira de abas — nada sobre o
 * CONTEÚDO de cada bloco, que até 2026-09-10 vivia em arrays no código.
 *
 * Fica no estilo do painel e é marcado como fora do arquivo aqui, o mesmo
 * precedente de `/admin/logs`, do modal de usuário e da etapa de ordem do
 * Builder.
 *
 * ── Por que os campos mudam por sessão ─────────────────────────────────────
 * O banco guarda colunas genéricas (`title`, `body`, duas artes, um link) porque
 * as listas têm a mesma forma. Quem dá NOME a cada campo é o catálogo
 * (`SiteListDef` em `features/site/sections.ts`): "nome" e "depoimento" no
 * review, "pergunta" e "resposta" na dúvida. Campo que a sessão não declara não
 * aparece — é o que evita um "corpo" vazio no formulário da equipe.
 *
 * ── Ordem por botões, não por arrasto ──────────────────────────────────────
 * ↑/↓ e não `@dnd-kit` como no Builder: ali a ordem é de NOVE blocos numa
 * maquete que se vê inteira, e arrastar é a leitura natural. Aqui são linhas de
 * formulário, muitas vezes com texto longo — arrastar uma linha de 200px de
 * altura por cima de outra é pior que dois cliques, e o botão já é o caminho de
 * teclado que o arrasto precisaria ter de qualquer forma.
 */
export function SectionItemsEditor({
  sectionKey,
  def,
  games = [],
}: {
  /** `home:reviews`. Trocar de sessão recarrega a lista. */
  sectionKey: string;
  /** Como esta sessão chama seus campos. */
  def: SiteListDef;
  /** Jogos cadastrados, para as sessões com seletor de jogo (`def.game`). */
  games?: GameOption[];
}) {
  const [items, setItems] = useState<SectionItem[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [askedKey, setAskedKey] = useState(sectionKey);
  const [pending, startTransition] = useTransition();

  /**
   * Trocar de sessão esvazia a lista JÁ, no render.
   *
   * Zerar isso dentro do efeito mostraria por um quadro os itens da sessão
   * anterior sob o nome da nova — e é o que a regra `set-state-in-effect` existe
   * para evitar. Comparar a chave durante o render é o padrão que o próprio
   * React documenta para "estado derivado de prop", e o mesmo já usado no campo
   * de título do `SectionsEditor`.
   */
  if (askedKey !== sectionKey) {
    setAskedKey(sectionKey);
    setLoadedKey(null);
    setItems([]);
  }

  /**
   * A ida à rede fica no efeito — é onde ida à rede pertence.
   */
  useEffect(() => {
    let cancelled = false;

    loadSectionItemsAction(sectionKey).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setItems(result.data);
        setLoadedKey(sectionKey);
        return;
      }
      toastError(result.message ?? "Não conseguimos carregar os itens.");
      setItems([]);
      setLoadedKey(sectionKey);
    });

    // A resposta de uma sessão anterior não pode sobrescrever a atual: quem
    // troca de sessão duas vezes rápido veria a lista errada.
    return () => {
      cancelled = true;
    };
  }, [sectionKey]);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;

    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    // Otimista: a lista salta na hora e o servidor confirma. Reordenar é a
    // única ação aqui sem formulário, e esperar a rede a cada clique tornaria
    // mover um item cinco posições uma sequência de esperas.
    setItems(next);

    startTransition(async () => {
      const result = await runAction(
        () =>
          reorderSectionItemsAction(
            sectionKey,
            next.map((item) => item.id),
          ),
        { ok: false, reason: "error", message: ACTION_FAILED_MESSAGE },
      );
      if (result.ok) {
        setItems(result.data);
        return;
      }
      // Recarrega do servidor em vez de desfazer na mão: a recusa mais provável
      // é "a lista mudou desde que a tela carregou", e aí o estado certo é o
      // dele, não o meu invertido de volta.
      toastError(result.message ?? "Não conseguimos salvar a ordem.");
      // Também protegido: sem isto, a recarga falhando depois de uma recusa
      // viraria promise rejeitada sem dono.
      void runAction(() => loadSectionItemsAction(sectionKey), {
        ok: false,
        reason: "error",
      }).then((again) => {
        if (again.ok) setItems(again.data);
      });
    });
  }

  function remove(item: SectionItem) {
    startTransition(async () => {
      const result = await runAction(
        () => deleteSectionItemAction(sectionKey, item.id),
        {
          ok: false,
          reason: "error",
          message: ACTION_FAILED_MESSAGE,
        },
      );
      if (result.ok) {
        setItems((list) => list.filter((row) => row.id !== item.id));
        toastOk(`${capitalize(def.itemLabel)} removido.`);
        return;
      }
      toastError(result.message ?? "Não conseguimos remover o item.");
    });
  }

  function save(form: FormData, id: string | null) {
    // Slide sem jogo não tem nome nem link na loja — o seletor substituiu os dois
    // campos, então ele é obrigatório aqui (o backend aceita vazio para outras
    // listas e para desligar um item, mas esta tela não oferece isso).
    if (def.game && !form.get("gameId")) {
      toastError(`Escolha o jogo do ${def.itemLabel}.`);
      return;
    }
    form.set("sectionKey", sectionKey);
    if (id) form.set("id", id);

    startTransition(async () => {
      const result = await runAction(() => saveSectionItemAction(form), {
        ok: false,
        reason: "error",
        message: ACTION_FAILED_UPLOAD_MESSAGE,
      });
      if (!result.ok) {
        toastError(result.message ?? "Não conseguimos salvar o item.");
        return;
      }

      setItems((list) => {
        const found = list.some((row) => row.id === result.data.id);
        return found
          ? list.map((row) => (row.id === result.data.id ? result.data : row))
          : [...list, result.data];
      });
      toastOk(
        id
          ? "Item salvo. A loja já mostra."
          : `${capitalize(def.itemLabel)} adicionado.`,
      );
    });
  }

  const loading = loadedKey !== sectionKey;

  return (
    <section className="mt-[40px] border-t border-white/10 pt-[40px]">
      <h2 className="font-helvetica text-[16px] font-bold tracking-[0.16px] text-white">
        Conteúdo da sessão{" "}
        <span className="font-normal text-brand-fg-subtle">
          (adicione, edite, reordene ou remova cada {def.itemLabel})
        </span>
      </h2>

      {loading ? (
        <p className="mt-[25px] font-poppins text-[14px] text-brand-fg-subtle">
          Carregando…
        </p>
      ) : (
        <>
          <ul className="mt-[25px] flex flex-col gap-[20px]">
            {items.map((item, index) => (
              <ItemRow
                key={item.id}
                item={item}
                index={index}
                total={items.length}
                def={def}
                games={games}
                pending={pending}
                onMove={move}
                onRemove={remove}
                onSave={save}
              />
            ))}
          </ul>

          {items.length === 0 ? (
            <p className="mt-[10px] font-poppins text-[14px] text-brand-fg-subtle">
              Nenhum {def.itemLabel} nesta sessão. A loja mostra o bloco vazio
              até você adicionar o primeiro.
            </p>
          ) : null}

          <ItemRow
            // `key` pelo tamanho da lista: depois de adicionar, o formulário em
            // branco é remontado e volta vazio sozinho, sem `reset()` manual.
            key={`novo-${items.length}`}
            item={null}
            index={-1}
            total={items.length}
            def={def}
            games={games}
            pending={pending}
            onMove={move}
            onRemove={remove}
            onSave={save}
          />
        </>
      )}
    </section>
  );
}

/**
 * Uma linha do editor — um item existente, ou o formulário em branco do fim.
 *
 * `item === null` é o formulário de criação. É o MESMO componente porque os
 * campos são os mesmos: dois formulários diferentes divergiriam no primeiro
 * campo novo que alguém acrescentasse a só um deles.
 */
function ItemRow({
  item,
  index,
  total,
  def,
  games,
  pending,
  onMove,
  onRemove,
  onSave,
}: {
  item: SectionItem | null;
  index: number;
  total: number;
  def: SiteListDef;
  games: GameOption[];
  pending: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (item: SectionItem) => void;
  onSave: (form: FormData, id: string | null) => void;
}) {
  const isNew = item === null;
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <li
      className={cn(
        "rounded-[20px] border p-[25px]",
        isNew
          ? "mt-[20px] border-dashed border-white/20"
          : "border-brand-border bg-[image:var(--brand-surface-fill)]",
        item && !item.isActive && "opacity-60",
      )}
    >
      <form
        ref={formRef}
        action={(form) => onSave(form, item?.id ?? null)}
        className="flex flex-col gap-[15px]"
      >
        <div className="flex items-center justify-between gap-[15px]">
          <span className="font-poppins text-[13px] font-bold tracking-[0.13px] text-brand-fg-subtle uppercase">
            {isNew
              ? `Adicionar ${def.itemLabel}`
              : `${def.itemLabel} ${index + 1}${item && !item.isActive ? " — escondido" : ""}`}
          </span>

          {!isNew && item ? (
            <span className="flex items-center gap-[8px]">
              <MoveButton
                label={`Subir ${def.itemLabel} ${index + 1}`}
                disabled={pending || index === 0}
                onClick={() => onMove(index, -1)}
              >
                ↑
              </MoveButton>
              <MoveButton
                label={`Descer ${def.itemLabel} ${index + 1}`}
                disabled={pending || index === total - 1}
                onClick={() => onMove(index, 1)}
              >
                ↓
              </MoveButton>

              {/* Esconder é diferente de remover: escondido some da loja e volta
                  com um clique; removido não volta. Ver `SectionItemsService`. */}
              <label className="ml-[10px] flex cursor-pointer items-center gap-[6px] font-poppins text-[12px] text-brand-fg-muted">
                <input
                  type="checkbox"
                  name="isActive"
                  value="true"
                  defaultChecked={item.isActive}
                  className="size-[14px] accent-[var(--brand-orange)]"
                />
                visível
              </label>

              <button
                type="button"
                disabled={pending}
                onClick={() => onRemove(item)}
                className="ml-[10px] font-poppins text-[12px] text-[#ff5b5b] transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                Remover
              </button>
            </span>
          ) : null}
        </div>

        {def.game ? (
          <div className="max-w-[420px]">
            <SelectField
              // `key` pelo jogo SALVO: o React 19 reseta o `<form action>` depois
              // de salvar, e o select do Radix (não controlado) voltava ao valor
              // com que foi MONTADO — a tela mostrava o jogo antigo e um segundo
              // "Salvar" desfazia a troca. Remontar com o valor novo resolve.
              key={item?.game?.id ?? "sem-jogo"}
              label={def.game}
              name="gameId"
              defaultValue={item?.game?.id}
              placeholder="Escolha o jogo"
              options={games.map((game) => ({
                value: game.id,
                label: game.name,
              }))}
            />
            {/* Nome e link DERIVADOS, à vista: é o que responde "e o link?" sem
                o admin precisar procurar — ele mora no cadastro do jogo. */}
            <p className="mt-[6px] font-poppins text-[12px] text-brand-fg-subtle">
              {item?.game
                ? `Link: /games/${item.game.slug} — para mudar, edite o jogo no Builder.`
                : item?.gameRemoved
                  ? `O jogo deste ${def.itemLabel} foi excluído — ele está FORA da loja. Escolha outro jogo.`
                  : item?.title
                    ? `Sem jogo ligado — hoje mostra "${item.title}"${item.href ? ` → ${item.href}` : ""}.`
                    : "Nome e link vêm do jogo escolhido."}
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[15px]">
          {def.title ? (
            <Field label={def.title}>
              <input
                name="title"
                defaultValue={item?.title ?? ""}
                maxLength={200}
                className={INPUT}
              />
            </Field>
          ) : null}

          {def.href ? (
            <Field label={def.href}>
              <input
                name="href"
                defaultValue={item?.href ?? ""}
                maxLength={500}
                placeholder="/games/diablo"
                className={INPUT}
              />
            </Field>
          ) : null}
        </div>

        {def.body ? (
          <Field label={def.body}>
            <textarea
              name="body"
              defaultValue={item?.body ?? ""}
              maxLength={2000}
              rows={4}
              className={cn(INPUT, "resize-y leading-[22px]")}
            />
          </Field>
        ) : null}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[15px]">
          {def.image ? (
            <ImageField
              label={def.image}
              name="image"
              current={item?.imageUrl}
            />
          ) : null}
          {def.secondaryImage ? (
            <ImageField
              label={def.secondaryImage}
              name="secondaryImage"
              current={item?.secondaryImageUrl}
            />
          ) : null}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-[5px] h-[40px] w-fit rounded-full bg-[image:var(--brand-orange-gradient)] px-[30px] font-poppins text-[13px] font-bold tracking-[0.13px] text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isNew ? `Adicionar ${def.itemLabel}` : "Salvar"}
        </button>
      </form>
    </li>
  );
}

const INPUT =
  "h-[42px] w-full rounded-[12px] border border-brand-border bg-black px-[14px] font-poppins text-[14px] text-white outline-none focus:border-brand-orange";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-[6px]">
      <span className="font-poppins text-[12px] tracking-[0.12px] text-brand-fg-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

/**
 * Campo de arte com pré-visualização do que já está lá.
 *
 * Anexar substitui; salvar sem anexar MANTÉM — é a mesma regra do formulário da
 * sessão, e o motivo é o mesmo: quem edita só o texto não espera perder a foto.
 * A miniatura existe para essa regra ficar óbvia sem ler nada.
 */
function ImageField({
  label,
  name,
  current,
}: {
  label: string;
  name: string;
  current?: string | null;
}) {
  const [chosen, setChosen] = useState<string | null>(null);

  return (
    <Field label={label}>
      <span className="flex items-center gap-[12px]">
        {current ? (
          <span className="relative block size-[42px] shrink-0 overflow-hidden rounded-[8px] border border-white/10">
            <Image
              src={current}
              alt=""
              fill
              sizes="42px"
              className="object-cover"
            />
          </span>
        ) : (
          <span
            aria-hidden
            className="block size-[42px] shrink-0 rounded-[8px] border border-dashed border-white/15"
          />
        )}

        <input
          type="file"
          name={name}
          accept="image/*"
          onChange={(event) => setChosen(event.target.files?.[0]?.name ?? null)}
          className="min-w-0 flex-1 font-poppins text-[12px] text-brand-fg-subtle file:mr-[10px] file:cursor-pointer file:rounded-full file:border file:border-brand-border file:bg-transparent file:px-[14px] file:py-[7px] file:font-poppins file:text-[12px] file:text-white"
        />
      </span>

      <span className="font-poppins text-[11px] text-brand-fg-subtle">
        {chosen
          ? `Vai substituir por: ${chosen}`
          : current
            ? "Salvar sem anexar mantém esta arte."
            : "Sem arte."}
      </span>
    </Field>
  );
}

function MoveButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-[26px] items-center justify-center rounded-full border border-brand-border text-white transition-opacity hover:opacity-80 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
