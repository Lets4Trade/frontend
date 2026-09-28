"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { SectionContent } from "@/features/site/list";
import { sectionKey, sitePage, type GameOption } from "@/features/site/sections";
import { cn } from "@/lib/cn";
import type { ContentPageDef } from "../registry";
import { LegacySectionPanel } from "./LegacySectionPanel";
import { PagePicker, type PageOption } from "./PagePicker";

/**
 * Páginas só de CONTEÚDO no construtor (fase 4, 2026-09-25): Cabeçalho e
 * rodapé, Termos e privacidade, conteúdo compartilhado das páginas de jogo.
 *
 * Não têm blocos nem ordem — são peças fixas de TODAS as páginas (cabeçalho,
 * rodapé) ou textos legais. O que o cliente faz aqui é editar o conteúdo de
 * cada sessão, com a mesma peça do painel de "Seção existente". Grava direto
 * na loja, como sempre gravou.
 */
export function ContentPageEditor({
  page,
  pages,
  sections: initialSections,
  games,
  previewPath,
}: {
  page: ContentPageDef;
  pages: PageOption[];
  sections: SectionContent[];
  games: GameOption[];
  /** Rota de prévia que mostra estas sessões (ex.: a home, para o rodapé). */
  previewPath: string | null;
}) {
  const catalog = sitePage(page.catalogPage);
  const editable = catalog?.sections ?? [];
  const [selected, setSelected] = useState(editable[0]?.key ?? null);
  const [sections, setSections] = useState(initialSections);
  const [nonce, setNonce] = useState(0);

  const def = editable.find((section) => section.key === selected);
  const fullKey = def ? sectionKey(page.catalogPage, def.key) : null;

  return (
    <div className="flex flex-col gap-[16px] px-[24px] pt-[24px] pb-[24px]">
      <header className="flex flex-wrap items-center gap-[16px]">
        <div className="min-w-0">
          <h1 className="font-helvetica text-[24px] leading-none font-bold text-white">Construtor de páginas</h1>
          <p className="mt-[8px] font-poppins text-[14px] text-brand-fg-muted">
            {page.label} · as mudanças vão direto para a loja ·{" "}
            <a href={page.href} target="_blank" rel="noreferrer" className="text-brand-orange hover:underline">
              ver na loja
            </a>
          </p>
        </div>
        <PagePicker current={page.slug} pages={pages} />
      </header>

      <div className="grid h-[calc(100dvh-210px)] min-h-[560px] grid-cols-[320px_minmax(0,1fr)] gap-[16px] xl:grid-cols-[320px_minmax(0,1fr)_380px]">
        <aside className="scrollbar-orange min-h-0 overflow-y-auto rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)] p-[14px]">
          <h2 className="font-helvetica text-[15px] font-bold text-white">Sessões</h2>
          <ul className="mt-[10px] flex flex-col gap-[6px]">
            {editable.map((section) => (
              <li key={section.key}>
                <button
                  type="button"
                  onClick={() => setSelected(section.key)}
                  aria-current={section.key === selected ? "true" : undefined}
                  className={cn(
                    "w-full rounded-[14px] border px-[12px] py-[10px] text-left font-poppins text-[13px] text-white",
                    section.key === selected ? "border-brand-orange bg-brand-orange/5" : "border-brand-border bg-black/30 hover:border-white/25",
                  )}
                >
                  {section.label}
                </button>
              </li>
            ))}
          </ul>
          {/* Abaixo de xl não há terceira coluna: o formulário vem aqui. */}
          {def && fullKey ? (
            <div className="mt-[18px] border-t border-white/10 pt-[18px] xl:hidden">
              <LegacySectionPanel
                key={`${fullKey}-sm`}
                fullKey={fullKey}
                def={def}
                content={sections.find((item) => item.key === fullKey)}
                games={games}
                onSaved={(content) => {
                  setSections((list) => [...list.filter((item) => item.key !== fullKey), ...(content ? [content] : [])]);
                  setNonce((n) => n + 1);
                }}
              />
            </div>
          ) : null}
        </aside>

        <section className="min-h-0">
          {previewPath ? (
            <StaticPreview src={previewPath} nonce={nonce} />
          ) : (
            <div className="flex h-full items-center justify-center rounded-[20px] border border-brand-border bg-black/30 p-[24px] text-center font-poppins text-[14px] text-brand-fg-subtle">
              Esta página não tem prévia aqui —{" "}
              <a href={page.href} target="_blank" rel="noreferrer" className="ml-[4px] text-brand-orange hover:underline">
                abra na loja
              </a>
              .
            </div>
          )}
        </section>

        <aside className="scrollbar-orange hidden min-h-0 overflow-y-auto rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)] p-[18px] xl:block">
          {def && fullKey ? (
            <>
              <h2 className="mb-[14px] font-helvetica text-[18px] font-bold text-white">{def.label}</h2>
              <LegacySectionPanel
                key={fullKey}
                fullKey={fullKey}
                def={def}
                content={sections.find((item) => item.key === fullKey)}
                games={games}
                onSaved={(content) => {
                  setSections((list) => [...list.filter((item) => item.key !== fullKey), ...(content ? [content] : [])]);
                  setNonce((n) => n + 1);
                }}
              />
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

/** Prévia só de leitura (sem blocos): a página real, escalada para caber. */
function StaticPreview({ src, nonce }: { src: string; nonce: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const width = 1920;
  const scale = size.width > 0 ? Math.min(1, size.width / width) : 1;
  return (
    <div ref={box} className="relative h-full overflow-hidden rounded-[20px] border border-brand-border bg-black">
      {size.width > 0 ? (
        <iframe
          key={nonce}
          src={src}
          title="Prévia"
          className="absolute top-0 left-1/2 origin-top border-0 bg-brand-bg"
          style={{ width, height: size.height / scale, transform: `translateX(-50%) scale(${scale})` }}
        />
      ) : null}
    </div>
  );
}
