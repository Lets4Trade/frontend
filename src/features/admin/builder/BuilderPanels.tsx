"use client";

import Image from "next/image";
import { useRef, useTransition } from "react";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { toastError } from "@/components/ui/Toasts";
import { PRODUCT_TABS } from "@/features/game/tabs";
import { removeBannerAction, uploadBannerAction, uploadLogoAction } from "./actions";
import type { BuilderListItem, Draft } from "./types";

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

/** Etapa 4 — Nome do game. */
export function NamePanel({
  draft,
  patch,
  slug,
}: {
  draft: Draft;
  patch: (next: Partial<Draft>) => void;
  slug: string;
}) {
  return (
    <>
      <TextField
        label="Nome do game"
        value={draft.name}
        maxLength={120}
        onChange={(event) => patch({ name: event.target.value })}
      />
      <p className="-mt-[15px] font-poppins text-[13px] text-brand-fg-subtle">
        O endereço da loja continua <span className="text-white">/games/{slug}</span>.
        Renomear o game NÃO muda o endereço — ele já foi compartilhado e pode
        estar indexado, e trocá-lo quebraria todos esses links de uma vez.
      </p>
    </>
  );
}

/** Etapa 9 — Descrição. */
export function DescriptionPanel({
  draft,
  patch,
}: {
  draft: Draft;
  patch: (next: Partial<Draft>) => void;
}) {
  return (
    <>
      <TextAreaField
        label="Descrição da página"
        value={draft.description}
        maxLength={5000}
        rows={10}
        placeholder="Texto que aparece no pé da página do game."
        onChange={(event) => patch({ description: event.target.value })}
      />
      <p className="-mt-[15px] font-poppins text-[13px] text-brand-fg-subtle">
        {draft.description.length}/5000 caracteres. As quebras de linha são
        mantidas na loja.
      </p>
    </>
  );
}

/**
 * Etapa 5 — Categorias Principais.
 *
 * São as ABAS da loja, e a lista é FECHADA: cada uma precisa do ícone que o
 * arquivo do Figma desenha. Um tipo sem arte apareceria como aba em branco, e é
 * por isso que aqui se escolhe entre sete e não se digita um nome.
 */
export function MainCategoriesPanel({
  draft,
  patch,
}: {
  draft: Draft;
  patch: (next: Partial<Draft>) => void;
}) {
  function toggle(productType: string) {
    const next = draft.productTypes.includes(productType)
      ? draft.productTypes.filter((value) => value !== productType)
      : [...draft.productTypes, productType];
    patch({ productTypes: next });
  }

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(0,180px))] gap-[15px]">
        {PRODUCT_TABS.map((tab) => {
          const checked = draft.productTypes.includes(tab.productType);
          return (
            <button
              key={tab.id}
              type="button"
              role="checkbox"
              aria-checked={checked}
              onClick={() => toggle(tab.productType)}
              className={`flex h-[90px] flex-col items-center justify-center gap-[8px] rounded-[12px] border-2 transition-opacity hover:opacity-90 ${
                checked
                  ? "border-brand-orange/60 bg-brand-orange/10"
                  : "border-white/10 bg-[image:var(--brand-surface-fill)]"
              }`}
            >
              <Image src={tab.icon} alt="" width={36} height={36} className="size-[36px]" />
              <span className="font-poppins text-[13px] leading-none font-bold text-white">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {draft.productTypes.length === 0 ? (
        <p className="font-poppins text-[13px] text-brand-orange">
          Escolha ao menos uma: sem nenhuma aba, a loja do game abre sem catálogo.
        </p>
      ) : null}
    </>
  );
}

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
}: {
  items: BuilderListItem[];
  onChange: (next: BuilderListItem[]) => void;
  addLabel: string;
  itemLabel: string;
  emptyHint: string;
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

function RowButton({
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
      const result = await uploadLogoAction(gameId, form);
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
            onPick={send}
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

  function send(file: File) {
    const form = new FormData();
    form.append("image", file);

    startTransition(async () => {
      const result = await uploadBannerAction(gameId, form);
      if (result.ok) {
        onChange([...banners, { id: result.data.id, imageUrl: result.data.imageUrl }]);
      } else {
        toastError(result.message ?? "Não foi possível enviar o banner.");
      }
    });
  }

  function drop(bannerId: string) {
    startTransition(async () => {
      const result = await removeBannerAction(gameId, bannerId);
      if (result.ok) onChange(banners.filter((banner) => banner.id !== bannerId));
      else toastError(result.message ?? "Não foi possível remover o banner.");
    });
  }

  return (
    <>
      <ul className="flex flex-col gap-[15px]">
        {banners.map((banner) => (
          <li key={banner.id} className="flex items-center gap-[15px]">
            <div className="relative h-[100px] w-[350px] shrink-0 overflow-hidden rounded-[12px] border border-white/10">
              <Image src={banner.imageUrl} alt="" fill sizes="350px" className="object-cover" />
            </div>
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

      <UploadButton
        inputRef={input}
        pending={pending}
        onPick={send}
        label="Adicionar banner"
      />
      <p className="-mt-[15px] font-poppins text-[13px] text-brand-fg-subtle">
        Tamanho da imagem W:1715 H:490. Sem nenhum banner, a faixa do topo
        simplesmente não aparece na loja.
      </p>
    </>
  );
}

/**
 * O `<input type="file">` continua no DOM, escondido dentro do `<label>` — é o
 * que mantém clique, Tab, Enter e leitor de tela funcionando. Mesma decisão do
 * `FileField`; aqui não dá para reusá-lo porque este envia na hora, sem
 * formulário em volta.
 */
function UploadButton({
  inputRef,
  pending,
  onPick,
  label,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  pending: boolean;
  onPick: (file: File) => void;
  label: string;
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
        onChange={(event) => {
          const file = event.target.files?.[0];
          // O valor é limpo para escolher O MESMO arquivo de novo disparar o
          // evento — sem isso, tentar reenviar depois de um erro não faz nada.
          event.target.value = "";
          if (file) onPick(file);
        }}
      />
    </label>
  );
}
