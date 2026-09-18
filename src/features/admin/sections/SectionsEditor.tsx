"use client";

import Image from "next/image";
import { useMemo, useRef, useState, useTransition } from "react";
import { SelectField } from "@/components/ui/SelectField";
import { toastError, toastOk } from "@/components/ui/Toasts";
import { TextField } from "@/components/ui/TextField";
import {
  resolveLinkTabs,
  resolveProductTabs,
  tabLabel,
  type NavTabOverride,
} from "@/features/game/tabs";
import {
  resetSectionAction,
  saveSectionAction,
  saveTabAction,
} from "@/features/site/actions";
import type { SectionContent } from "@/features/site/list";
import { SectionItemsEditor } from "./SectionItemsEditor";
import {
  SITE_PAGES,
  sectionKey,
  sitePage,
  type SiteSectionDef,
} from "@/features/site/sections";

/**
 * "EDIÇÃO DE SESSÃO" (Figma 3806:7081).
 *
 * Um card de 1510×606 com quatro controles na primeira fileira — página,
 * sessão, arte e título —, a fileira de abas com uma lixeira embaixo de cada, e
 * "SALVAR" no pé.
 *
 * ⚠️ Desvio declarado (2026-09-14): a fileira de abas NÃO fica mais fixa na
 * tela. Ela virou a sessão "Página de jogo (todos) → Abas da loja"
 * (`navTabs` no catálogo) e só aparece com ela escolhida — sem título, banner
 * nem SALVAR. Fixa, ela parecia fazer parte de qualquer sessão selecionada.
 *
 * ── O que esta tela edita, e o que ela NÃO edita ───────────────────────────
 * As páginas FIXAS do site (home, venda, fidelidade) e a fileira de abas da
 * loja. As páginas de JOGO têm o Builder de Páginas — decidido com o usuário
 * que os escopos são separados, para as duas telas não gravarem no mesmo lugar
 * e discordarem na primeira divergência.
 *
 * ── Dois salvamentos independentes ─────────────────────────────────────────
 * O "SALVAR" do arquivo grava a SESSÃO escolhida. As abas gravam sozinhas, no
 * clique — cada uma é uma linha própria no banco, e um botão só para dez
 * controles independentes tornaria "esconder uma aba" um gesto de dois passos
 * sem ganho nenhum.
 */
export function SectionsEditor({
  sections,
  tabs,
}: {
  sections: SectionContent[];
  tabs: NavTabOverride[];
}) {
  const [pageKey, setPageKey] = useState(SITE_PAGES[0].key);
  const [sectionSuffix, setSectionSuffix] = useState(
    SITE_PAGES[0].sections[0].key,
  );

  const [saved, setSaved] = useState(sections);
  const [tabState, setTabState] = useState(tabs);
  const [pending, startTransition] = useTransition();

  const page = sitePage(pageKey) ?? SITE_PAGES[0];
  const section: SiteSectionDef =
    page.sections.find((item) => item.key === sectionSuffix) ??
    page.sections[0];
  const fullKey = sectionKey(page.key, section.key);

  // Um texto extra EXISTE na sessão quando o catálogo o declara — por valor
  // padrão OU por rótulo. Só o valor padrão não basta: o WhatsApp dos contatos e
  // o link do vídeo não têm padrão nenhum (inventar um número seria pior) e
  // mesmo assim precisam do campo.
  const hasSubtitle =
    section.defaultSubtitle !== undefined || Boolean(section.subtitleLabel);
  const hasFootnote =
    section.defaultFootnote !== undefined || Boolean(section.footnoteLabel);

  const current = saved.find((item) => item.key === fullKey);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [footnote, setFootnote] = useState("");
  const [body, setBody] = useState("");
  const [titleKey, setTitleKey] = useState(fullKey);

  // Trocar de sessão recarrega o campo. Um `useEffect` faria o mesmo com um
  // render a mais e um pisca no valor antigo; comparar a chave durante o render
  // é o padrão que o próprio React documenta para "estado derivado de prop".
  if (titleKey !== fullKey) {
    setTitleKey(fullKey);
    setTitle(current?.title ?? "");
    setSubtitle(current?.subtitle ?? "");
    setFootnote(current?.footnote ?? "");
    setBody(current?.body ?? "");
  }

  const imageInput = useRef<HTMLInputElement>(null);
  const [imageName, setImageName] = useState<string | null>(null);

  const productTabs = useMemo(() => resolveProductTabs(tabState), [tabState]);
  const linkTabs = useMemo(() => resolveLinkTabs(tabState), [tabState]);
  const hiddenTabs = useMemo(
    () => tabState.filter((tab) => !tab.isActive),
    [tabState],
  );

  function saveSection(form: FormData) {
    form.set("key", fullKey);
    form.set("title", title);
    form.set("subtitle", subtitle);
    form.set("footnote", footnote);
    form.set("body", body);

    const file = imageInput.current?.files?.[0];
    if (file) form.set("image", file, file.name);

    startTransition(async () => {
      const result = await saveSectionAction(form);

      if (result.ok) {
        setSaved((list) => [
          ...list.filter((item) => item.key !== result.data.key),
          result.data,
        ]);
        setImageName(null);
        if (imageInput.current) imageInput.current.value = "";
        toastOk("Sessão salva. A loja já mostra.");
        return;
      }

      toastError(result.message ?? "Não conseguimos salvar a sessão.");
    });
  }

  function resetSection() {
    startTransition(async () => {
      const result = await resetSectionAction(fullKey);
      if (result.ok) {
        setSaved((list) => list.filter((item) => item.key !== fullKey));
        setTitle("");
        setSubtitle("");
        setFootnote("");
        setBody("");
        toastOk("Sessão devolvida ao padrão.");
        return;
      }
      toastError(result.message ?? "Não conseguimos restaurar a sessão.");
    });
  }

  function patchTab(key: string, fields: Record<string, string>, icon?: File) {
    const form = new FormData();
    form.set("key", key);
    for (const [name, value] of Object.entries(fields)) form.set(name, value);
    if (icon) form.set("icon", icon, icon.name);

    startTransition(async () => {
      const result = await saveTabAction(form);

      if (result.ok) {
        setTabState((list) => [
          ...list.filter((item) => item.key !== result.data.key),
          result.data,
        ]);
        return;
      }

      toastError(result.message ?? "Não conseguimos salvar a aba.");
    });
  }

  return (
    <>
      <form action={saveSection} className="flex flex-col gap-[30px]">
        {/*
        Primeira fileira: quatro campos nos x = 50, 415, 780 e 1145 do arquivo —
        315px cada, com 50 de vão. Dentro do card de 1510 com 50 de recuo de cada
        lado, os quatro somam exatamente os 1410 disponíveis.

        Colunas EXPLÍCITAS por faixa, e não `auto-fit`: com `minmax(0,315px)` a
        conta dá 1410,000… e qualquer arredondamento do navegador derruba a
        quarta para a linha de baixo — foi o que aconteceu na primeira versão. Em
        telas menores a grade cai para duas colunas e depois uma, que é o que o
        `auto-fit` daria de graça se coubesse.
      */}
        <div className="grid grid-cols-1 gap-[50px] md:grid-cols-2 xl:grid-cols-4">
          <SelectField
            label="Selecione Página"
            value={page.key}
            onValueChange={(value) => {
              const next = sitePage(value) ?? SITE_PAGES[0];
              setPageKey(next.key);
              // Trocar de página zera a sessão: as sessões são de cada página, e
              // manter a anterior escolhida deixaria um select apontando para algo
              // que não está mais na lista.
              setSectionSuffix(next.sections[0].key);
            }}
            options={SITE_PAGES.map((item) => ({
              value: item.key,
              label: item.label,
            }))}
          />

          <SelectField
            label="Selecione a Sessão"
            // A `key` força o Radix a remontar quando a página muda — sem isso ele
            // guarda o valor antigo, que não existe mais nas opções novas.
            key={`sessao-${page.key}`}
            value={section.key}
            onValueChange={(value) => setSectionSuffix(value)}
            options={page.sections.map((item) => ({
              value: item.key,
              label: `${page.label} - ${item.label}`,
            }))}
          />

          {/* Na sessão de ABAS a fileira é tudo: título e banner não existem
              ali, e dois avisos de "não tem" só empurrariam as abas para baixo. */}
          {section.navTabs ? null : (
            <>
              <div className="flex flex-col gap-[10px]">
                <span className="font-helvetica text-[18px] leading-none font-bold text-white">
                  Imagem do Banner
                </span>

                {section.hasImage ? (
                  <>
                    {/* O `<input type="file">` continua no DOM, escondido dentro do
                  `<label>`: é o que mantém clique, Tab, Enter e leitor de tela
                  funcionando. Mesma decisão do `FileField`. */}
                    <label className="flex h-[50px] cursor-pointer items-center justify-center rounded-full border border-brand-border bg-[image:var(--brand-surface-fill)] px-[25px] font-poppins text-[16px] text-white transition-opacity hover:opacity-90">
                      {imageName ?? "Anexar nova imagem"}
                      <input
                        ref={imageInput}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/avif"
                        className="sr-only"
                        onChange={(event) =>
                          setImageName(event.target.files?.[0]?.name ?? null)
                        }
                      />
                    </label>

                    {/* A dica é por SESSÃO: o rótulo do arquivo diz só "Imagem do
                  Banner", e cada uma tem proporção própria. Sem o tamanho, a
                  arte sobe e aparece recortada sem ninguém entender por quê. */}
                    {section.imageHint ? (
                      <span className="font-poppins text-[13px] text-brand-fg-subtle">
                        {section.imageHint}
                      </span>
                    ) : null}

                    {current?.imageUrl ? (
                      <div className="flex items-center gap-[12px]">
                        {/* A miniatura é a prova de que a arte SALVA é aquela — sem
                      ela, "já existe uma arte" é uma afirmação que a pessoa
                      teria que ir conferir na loja. */}
                        <span className="relative block h-[54px] w-[96px] shrink-0 overflow-hidden rounded-[8px] border border-white/10">
                          <Image
                            src={current.imageUrl}
                            alt=""
                            fill
                            sizes="96px"
                            className="object-cover"
                          />
                        </span>
                        <span className="font-poppins text-[13px] text-brand-fg-subtle">
                          Anexar outra substitui; salvar sem anexar mantém esta.
                        </span>
                      </div>
                    ) : null}
                  </>
                ) : (
                  // Sessão sem arte não ganha o campo. Oferecer "anexar imagem" onde
                  // nada renderiza a imagem é prometer um efeito que não acontece.
                  <span className="flex h-[50px] items-center rounded-full border border-dashed border-white/15 px-[25px] font-poppins text-[14px] text-brand-fg-subtle">
                    Esta sessão não tem banner.
                  </span>
                )}
              </div>

              {section.hasTitle === false ? (
                // Mesma regra da arte: seção sem título não ganha o campo. As que
                // são só uma lista (os contadores da home, as redes do rodapé) o
                // exibiam e gravavam um valor que nenhum componente lia.
                <div className="flex flex-col gap-[10px]">
                  <span className="font-helvetica text-[18px] leading-none font-bold text-white">
                    Título
                  </span>
                  <span className="flex h-[50px] items-center rounded-full border border-dashed border-white/15 px-[25px] font-poppins text-[14px] text-brand-fg-subtle">
                    Esta sessão não tem título.
                  </span>
                </div>
              ) : (
                <TextField
                  // O rótulo vem do catálogo quando a sessão tem um nome próprio
                  // para o campo — nos botões do cabeçalho, "título" não diria a
                  // ninguém que se trata do botão da esquerda.
                  label={section.titleLabel ?? "Alterar título da sessão"}
                  value={title}
                  maxLength={160}
                  mask={section.titleMask}
                  placeholder={
                    section.defaultTitle ?? `${page.label} - ${section.label}`
                  }
                  onChange={(event) => setTitle(event.target.value)}
                />
              )}
            </>
          )}
        </div>

        {/*
        Os textos EXTRAS da sessão.
        Cada um só aparece se o catálogo declarar que a seção o tem
        (`defaultSubtitle`, `defaultFootnote`, `hasBody`). Campo que promete um
        efeito que não acontece é pior que campo ausente — foi exatamente esse o
        defeito de "Home - Hero", que salvava um título que nada desenhava.
      */}
        {hasSubtitle ||
        hasFootnote ||
        section.hasBody ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[25px]">
            {hasSubtitle ? (
              <TextField
                label={section.subtitleLabel ?? "Subtítulo"}
                value={subtitle}
                maxLength={200}
                mask={section.subtitleMask}
                placeholder={section.defaultSubtitle || undefined}
                onChange={(event) => setSubtitle(event.target.value)}
              />
            ) : null}

            {hasFootnote ? (
              <TextField
                label={section.footnoteLabel ?? "Legenda"}
                value={footnote}
                maxLength={200}
                placeholder={section.defaultFootnote || undefined}
                onChange={(event) => setFootnote(event.target.value)}
              />
            ) : null}
          </div>
        ) : null}

        {section.hasBody ? (
          <label className="flex flex-col gap-[8px]">
            <span className="font-helvetica text-[16px] font-bold tracking-[0.16px] text-white">
              {section.bodyLabel ?? "Texto da sessão"}
            </span>
            <textarea
              value={body}
              maxLength={4000}
              rows={6}
              placeholder="Deixe em branco para usar o texto padrão da página."
              onChange={(event) => setBody(event.target.value)}
              className="w-full resize-y rounded-[15px] border border-brand-border bg-black p-[16px] font-poppins text-[14px] leading-[22px] text-white outline-none focus:border-brand-orange"
            />
          </label>
        ) : null}

        {/*
        A fileira de ABAS da loja — só na sessão "Página de jogo → Abas da loja".
        Até 2026-09-14 ela era desenhada SEMPRE, como no Figma 3806:7081, e com
        qualquer sessão escolhida parecia fazer parte dela e ser gravada pelo
        SALVAR logo abaixo. Não era nenhuma das duas: cada aba grava no clique,
        numa tabela própria, e vale para TODAS as páginas de jogo. Desvio
        declarado do arquivo.
      */}
        {section.navTabs ? (
          <div>
            <p className="font-helvetica text-[18px] leading-none font-bold text-white">
              Edite os ícones e títulos{" "}
              <span className="text-[16px] font-normal text-brand-fg-muted">
                (clique no ícone para trocar a arte, ou no título para renomear)
              </span>
            </p>

            <div className="mt-[25px] flex flex-wrap gap-[15px]">
              {[...productTabs, ...linkTabs].map((tab) => (
                <TabCard
                  key={tab.id}
                  label={tab.label}
                  icon={tab.icon}
                  disabled={pending}
                  onRename={(label) => patchTab(tab.id, { label })}
                  onIcon={(file) => patchTab(tab.id, {}, file)}
                  onHide={() => patchTab(tab.id, { isActive: "false" })}
                />
              ))}
            </div>

            {hiddenTabs.length > 0 ? (
              <div className="mt-[25px]">
                <p className="font-poppins text-[13px] font-bold text-brand-fg-subtle">
                  Abas escondidas da loja
                </p>
                <div className="mt-[10px] flex flex-wrap gap-[10px]">
                  {hiddenTabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      disabled={pending}
                      onClick={() => patchTab(tab.key, { isActive: "true" })}
                      className="h-[40px] rounded-full border border-dashed border-white/20 px-[20px] font-poppins text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                      {tabLabel(tab.key, tab.label)} — mostrar
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Diz em voz alta o que antes era implícito: aqui não há SALVAR. */}
            <p className="mt-[25px] font-poppins text-[13px] text-brand-fg-subtle">
              Cada mudança nas abas vale na hora, para todas as páginas de jogo.
            </p>
          </div>
        ) : null}

        {/* Sem SALVAR na sessão de abas: nada ali passa por este formulário. */}
        {section.navTabs ? null : (
          <>
            <hr className="border-0 border-t border-white/10" />

            <div className="flex flex-wrap items-center gap-[20px]">
              <button
                type="submit"
                disabled={pending}
                className="h-[50px] w-[315px] rounded-full bg-[image:var(--brand-orange-gradient)] font-poppins text-[16px] font-bold tracking-[0.16px] text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pending ? "SALVANDO..." : "SALVAR"}
              </button>

              {/* Só aparece quando há o que desfazer — um botão de restaurar sempre
            visível convida a clicar numa sessão que nunca foi personalizada. */}
              {current ? (
                <button
                  type="button"
                  onClick={resetSection}
                  disabled={pending}
                  className="h-[50px] rounded-full border border-brand-border bg-[image:var(--brand-surface-fill)] px-[30px] font-poppins text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  Voltar ao padrão
                </button>
              ) : null}
            </div>
          </>
        )}
      </form>

      {/*
        A LISTA da sessão — FORA do formulário acima, e não por gosto: cada item
        tem o próprio `<form>`, e `<form>` dentro de `<form>` é inválido em HTML.
        O navegador desfaz o aninhamento ao analisar a página, o que faz a marcação
        do cliente divergir da do servidor e quebra a hidratação.

        Cada item tem formulário próprio porque cada um salva sozinho: um botão
        "salvar tudo" mandaria trinta e dois itens a cada vírgula corrigida.

        Fora do Figma — ver o cabeçalho de `SectionItemsEditor`.
      */}
      {section.list ? (
        <SectionItemsEditor
          // `key` pela chave da sessão: trocar de sessão remonta o editor, e o
          // estado da lista anterior não vaza para a nova.
          key={fullKey}
          sectionKey={fullKey}
          def={section.list}
        />
      ) : null}
    </>
  );
}

/**
 * O card de uma aba — 130×99 no arquivo, com o ícone de 50px e o rótulo
 * embaixo, mais a lixeira de 50×50 logo abaixo.
 *
 * O rótulo vira campo de texto ao ser clicado, e grava ao sair do campo ou no
 * Enter. É o que o arquivo pede ("clique no título para editar") sem abrir um
 * modal para trocar uma palavra.
 */
function TabCard({
  label,
  icon,
  disabled,
  onRename,
  onIcon,
  onHide,
}: {
  label: string;
  icon: string;
  disabled: boolean;
  onRename: (label: string) => void;
  onIcon: (file: File) => void;
  onHide: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);

  function commit() {
    setEditing(false);
    const next = draft.trim();
    if (next !== "" && next !== label) onRename(next);
    else setDraft(label);
  }

  return (
    <div className="flex flex-col items-center gap-[10px]">
      <div className="flex h-[99px] w-[143px] flex-col items-center rounded-[8px] border-2 border-white/10 bg-[image:var(--brand-surface-fill)] pt-[11px]">
        <label className="cursor-pointer" title={`Trocar o ícone de ${label}`}>
          <Image
            src={icon}
            alt=""
            width={50}
            height={50}
            className="size-[50px]"
          />
          <span className="sr-only">Trocar o ícone de {label}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
            disabled={disabled}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              // Limpa o valor para escolher O MESMO arquivo de novo disparar o
              // evento — sem isso, reenviar depois de um erro não faz nada.
              event.target.value = "";
              if (file) onIcon(file);
            }}
          />
        </label>

        {editing ? (
          <input
            autoFocus
            value={draft}
            maxLength={60}
            disabled={disabled}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit();
              }
              if (event.key === "Escape") {
                setDraft(label);
                setEditing(false);
              }
            }}
            aria-label={`Nome da aba ${label}`}
            className="mt-[5px] w-[125px] rounded-[4px] border border-brand-orange/60 bg-black/60 px-[4px] text-center font-poppins text-[14px] font-bold text-white outline-none"
          />
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setDraft(label);
              setEditing(true);
            }}
            className="mt-[5px] w-full truncate px-[6px] font-poppins text-[14px] leading-none font-bold text-white/80 transition-opacity hover:opacity-80"
          >
            {label}
          </button>
        )}
      </div>

      {/*
        A LIXEIRA esconde a aba, não apaga nada — a mesma regra do card de
        produto. `title` e texto acessível dizem isso, porque um ícone de lixo
        que na verdade oculta é a diferença entre um clique tranquilo e um susto.
      */}
      <button
        type="button"
        disabled={disabled}
        onClick={onHide}
        title={`Esconder ${label} da loja`}
        className="flex size-[50px] items-center justify-center rounded-[8px] border border-white/10 bg-[image:var(--brand-surface-fill)] text-brand-orange transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        <span aria-hidden>🗑</span>
        <span className="sr-only">Esconder a aba {label} da loja</span>
      </button>
    </div>
  );
}
