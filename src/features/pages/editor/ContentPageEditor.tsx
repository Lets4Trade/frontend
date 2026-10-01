"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SectionContentForm } from "@/features/admin/sections/SectionContentForm";
import type { SectionContent } from "@/features/site/list";
import { richToPlain } from "@/features/site/richText";
import { sectionKey, sitePage, type GameOption, type SiteSectionDef } from "@/features/site/sections";
import { cn } from "@/lib/cn";
import type { ContentPageDef } from "../registry";
import { EditorHeader } from "./EditorHeader";
import { editorBack } from "./editorNav";
import { installPreviewPicker, resolvePick } from "./previewPick";

/**
 * Páginas só de CONTEÚDO no construtor: Cabeçalho, Rodapé, Termos e
 * privacidade, conteúdo compartilhado das páginas de jogo.
 *
 * Não têm blocos nem ordem — são peças fixas de TODAS as páginas ou textos
 * legais. Grava direto na loja, como sempre gravou.
 *
 * Desde 2026-10-01: a lista mostra o texto atual de cada sessão (dá para achar
 * sem abrir uma por uma), a prévia é CLICÁVEL (clicar num pedaço abre o campo
 * dele) e `?secao=` abre direto numa sessão — é o destino da busca Ctrl+K.
 */
export function ContentPageEditor({
  page,
  sections: initialSections,
  games,
  initialSection,
}: {
  page: ContentPageDef;
  sections: SectionContent[];
  games: GameOption[];
  /** Sufixo da sessão que abre selecionada (`?secao=`). */
  initialSection?: string;
}) {
  const router = useRouter();
  const catalog = sitePage(page.catalogPage);
  const editable: SiteSectionDef[] = page.sectionKeys
    ? page.sectionKeys
        .map((key) => catalog?.sections.find((section) => section.key === key))
        .filter((section): section is SiteSectionDef => Boolean(section))
    : (catalog?.sections ?? []);

  const [selected, setSelected] = useState(
    editable.find((section) => section.key === initialSection)?.key ?? editable[0]?.key ?? null,
  );
  const [sections, setSections] = useState(initialSections);
  const [nonce, setNonce] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);

  const def = editable.find((section) => section.key === selected);
  const fullKey = def ? sectionKey(page.catalogPage, def.key) : null;

  const select = useCallback(
    (suffix: string) => {
      setSelected(suffix);
      // A URL guarda a sessão: recarregar ou mandar o link abre no mesmo lugar.
      const search = new URLSearchParams({ pagina: page.slug, secao: suffix });
      window.history.replaceState(null, "", `/admin/paginas?${search.toString()}`);
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    },
    [page.slug],
  );

  const onPick = useCallback(
    (key: string) => {
      const target = resolvePick(key, page);
      if (target?.kind === "select") select(target.suffix);
      else if (target?.kind === "go") router.push(target.href);
    },
    [page, router, select],
  );

  function saved(content: SectionContent | null) {
    if (!fullKey) return;
    setSections((list) => [...list.filter((item) => item.key !== fullKey), ...(content ? [content] : [])]);
    setNonce((n) => n + 1);
  }

  const form =
    def && fullKey ? (
      <>
        <h2 className="font-helvetica text-[18px] font-bold text-white">{def.label}</h2>
        <p className="mt-[4px] mb-[16px] font-poppins text-[12px] text-brand-fg-subtle">
          Ao salvar, a loja muda na hora.
        </p>
        <SectionContentForm
          key={fullKey}
          fullKey={fullKey}
          def={def}
          content={sections.find((item) => item.key === fullKey)}
          games={games}
          onSaved={saved}
        />
      </>
    ) : null;

  return (
    <div className="flex flex-col gap-[16px] px-[16px] pt-[24px] pb-[24px] sm:px-[24px]">
      <EditorHeader title={page.label} back={editorBack(page.slug)} storeHref={page.href} />
      <p className="-mt-[6px] font-poppins text-[14px] text-brand-fg-muted">
        {page.previewPath ? "Clique numa parte da prévia para editar." : "Escolha na lista o que editar."}
      </p>

      <div
        className={cn(
          "grid gap-[16px]",
          page.previewPath
            ? "lg:h-[calc(100dvh-230px)] lg:min-h-[560px] lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_400px]"
            : "lg:grid-cols-[300px_minmax(0,1fr)]",
        )}
      >
        <aside className="scrollbar-orange min-h-0 overflow-y-auto rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)] p-[14px]">
          <h2 className="px-[4px] font-helvetica text-[15px] font-bold text-white">O que editar</h2>
          <ul className="mt-[10px] flex flex-col gap-[6px]">
            {editable.map((section) => {
              const summary = sectionSummary(section, sections.find((item) => item.key === sectionKey(page.catalogPage, section.key)));
              return (
                <li key={section.key}>
                  <button
                    type="button"
                    onClick={() => select(section.key)}
                    aria-current={section.key === selected ? "true" : undefined}
                    className={cn(
                      "w-full rounded-[14px] border px-[12px] py-[10px] text-left transition-colors focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none",
                      section.key === selected
                        ? "border-brand-orange bg-brand-orange/5"
                        : "border-brand-border bg-black/30 hover:border-white/25",
                    )}
                  >
                    <span className="block font-poppins text-[14px] font-semibold text-white">{section.label}</span>
                    {summary ? (
                      <span className="mt-[2px] block truncate font-helvetica text-[12px] text-brand-fg-subtle">{summary}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          {page.catalogPage === "layout" ? (
            <Link
              href="/admin/configuracoes"
              className="mt-[14px] block rounded-[14px] border border-dashed border-white/20 px-[12px] py-[10px] font-poppins text-[12px] leading-[18px] text-brand-fg-muted transition-colors hover:border-brand-orange/60 hover:text-white"
            >
              Logo, ícone, WhatsApp, dados da empresa e redes sociais ficam em{" "}
              <span className="font-bold text-brand-orange">Configurações da loja →</span>
            </Link>
          ) : null}
        </aside>

        {/* Sem prévia (ou abaixo de xl) o formulário vem logo depois da lista. */}
        <div
          ref={formRef}
          className={cn(
            "rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)] p-[18px]",
            page.previewPath ? "xl:hidden" : "",
          )}
        >
          {form}
        </div>

        {page.previewPath ? (
          <section aria-label="Prévia" className="hidden min-h-0 lg:block">
            <PickablePreview
              src={page.previewPath}
              nonce={nonce}
              anchor={page.previewAnchor ?? "top"}
              selected={fullKey}
              onPick={onPick}
            />
          </section>
        ) : null}

        {page.previewPath ? (
          <aside className="scrollbar-orange hidden min-h-0 overflow-y-auto rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)] p-[18px] xl:block">
            {form}
          </aside>
        ) : null}
      </div>
    </div>
  );
}

/** Uma linha com o que a sessão diz hoje — para achar sem abrir uma por uma. */
function sectionSummary(def: SiteSectionDef, content: SectionContent | undefined): string {
  const texts = [content?.title, content?.subtitle, content?.footnote, content?.body]
    .map((value) => richToPlain(value).trim())
    .filter(Boolean);
  if (texts.length > 0) return texts.join(" · ");
  const defaults = [def.defaultTitle, def.defaultSubtitle, def.defaultFootnote]
    .map((value) => (value ?? "").trim())
    .filter(Boolean);
  if (defaults.length > 0) return `${defaults.join(" · ")} (padrão)`;
  return def.list ? `Lista de ${def.list.itemLabel}s` : "";
}

/** A página real, escalada para caber, com "clique para editar". */
function PickablePreview({
  src,
  nonce,
  anchor,
  selected,
  onPick,
}: {
  src: string;
  nonce: number;
  anchor: "top" | "bottom";
  selected: string | null;
  onPick: (fullKey: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [loaded, setLoaded] = useState(0);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Reinstala a cada carga do iframe (salvar recarrega a prévia) e a cada troca
  // de seleção (o contorno fixo acompanha a sessão aberta).
  useEffect(() => {
    const doc = frame.current?.contentDocument;
    if (!loaded || !doc?.body) return;
    return installPreviewPicker(doc, { onPick, selected });
  }, [loaded, onPick, selected]);

  const width = 1920;
  const scale = size.width > 0 ? Math.min(1, size.width / width) : 1;
  return (
    <div ref={box} className="relative h-full min-h-[480px] overflow-hidden rounded-[20px] border border-brand-border bg-black">
      {size.width > 0 ? (
        <iframe
          ref={frame}
          key={nonce}
          src={src}
          title="Prévia: clique numa parte para editar"
          onLoad={(event) => {
            const win = event.currentTarget.contentWindow;
            if (anchor === "bottom" && win) win.scrollTo(0, win.document.documentElement.scrollHeight);
            setLoaded((n) => n + 1);
          }}
          className="absolute top-0 left-1/2 origin-top border-0 bg-brand-bg"
          style={{ width, height: size.height / scale, transform: `translateX(-50%) scale(${scale})` }}
        />
      ) : null}
    </div>
  );
}
