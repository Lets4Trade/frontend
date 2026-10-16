"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { SectionContentForm } from "@/features/admin/sections/SectionContentForm";
import type { SectionContent } from "@/features/site/list";
import { sectionKey, sitePage } from "@/features/site/sections";
import { cn } from "@/lib/cn";
import { SECTION_INFO, SETTINGS_GROUPS, SETTINGS_PAGE, settingsNotices, type SettingsNotice } from "./catalog";

/**
 * "Configurações da loja" — reorganizada em 2026-10-16 (pedido do usuário:
 * "tá ficando tudo desorganizado").
 *
 * Antes: os quatro grupos empilhados numa página só, e dentro de cada grupo as
 * sessões numa grade de 2 colunas — com sessões de alturas muito diferentes
 * (WhatsApp curto ao lado do Botão do chat comprido), sobravam buracos e cada
 * "Salvar" caía num lugar diferente.
 *
 * Agora:
 *  - ABAS: um grupo por vez (Atendimento, Marca, Empresa, Redes). O menu
 *    lateral diz o que tem em cada um e marca pendência. `#atendimento` na
 *    URL (busca Ctrl+K, clique na prévia) abre a aba certa.
 *  - Cada SESSÃO é um cartão próprio, com título e uma linha de onde aquilo
 *    aparece na loja (`SECTION_INFO`), campos curtos em duas colunas e o
 *    rodapé com Salvar sempre no mesmo lugar (`SectionContentForm` grade).
 *  - Os grupos continuam MONTADOS (só escondidos): trocar de aba não perde o
 *    que foi digitado e ainda não salvo.
 */
export function SettingsBoard({ initialSections }: { initialSections: SectionContent[] }) {
  const [sections, setSections] = useState(initialSections);
  const [active, setActive] = useState<string>(SETTINGS_GROUPS[0].id);
  const [highlight, setHighlight] = useState<string | null>(null);
  const notices = useMemo(() => settingsNotices(sections), [sections]);
  const layout = sitePage(SETTINGS_PAGE);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const focusHash = () => {
      const id = window.location.hash.slice(1);
      if (!SETTINGS_GROUPS.some((group) => group.id === id)) return;
      setActive(id);
      setHighlight(id);
    };
    focusHash();
    window.addEventListener("hashchange", focusHash);
    return () => window.removeEventListener("hashchange", focusHash);
  }, []);

  useEffect(() => {
    if (!highlight) return;
    const timer = window.setTimeout(() => setHighlight(null), 1800);
    return () => window.clearTimeout(timer);
  }, [highlight]);

  function open(id: string) {
    setActive(id);
    // Na URL, para recarregar/compartilhar abrindo a mesma aba — sem pular a página.
    history.replaceState(null, "", `#${id}`);
    // Trocar para uma aba mais curta com a página rolada deixaria a pessoa
    // olhando o rodapé: volta ao topo das abas (só se ele saiu da tela).
    const top = rootRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) window.scrollTo({ top: window.scrollY + top - 24 });
  }

  /** Setas e Home/End no menu, como o padrão de abas do WAI-ARIA. */
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = SETTINGS_GROUPS.findIndex((group) => group.id === active);
    const last = SETTINGS_GROUPS.length - 1;
    const next =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? (index + 1) % SETTINGS_GROUPS.length
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? (index - 1 + SETTINGS_GROUPS.length) % SETTINGS_GROUPS.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    const id = SETTINGS_GROUPS[next].id;
    open(id);
    tabRefs.current[id]?.focus();
  }

  function replace(key: string, content: SectionContent | null) {
    setSections((list) => [...list.filter((item) => item.key !== key), ...(content ? [content] : [])]);
  }

  return (
    <div ref={rootRef} className="grid gap-[24px] lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-[32px]">
      <div
        role="tablist"
        aria-label="Grupos de configuração"
        aria-orientation="vertical"
        onKeyDown={onKeyDown}
        className="-mx-[16px] flex gap-[8px] overflow-x-auto px-[16px] pb-[4px] lg:sticky lg:top-[24px] lg:mx-0 lg:flex-col lg:self-start lg:overflow-visible lg:px-0"
      >
        {SETTINGS_GROUPS.map((group) => {
          const selected = active === group.id;
          const warn = notices[group.id]?.some((notice) => notice.level === "warn");
          return (
            <button
              key={group.id}
              ref={(node) => {
                tabRefs.current[group.id] = node;
              }}
              type="button"
              role="tab"
              id={`aba-${group.id}`}
              aria-selected={selected}
              aria-controls={`painel-${group.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => open(group.id)}
              className={cn(
                "flex shrink-0 flex-col rounded-[14px] border px-[14px] py-[10px] text-left transition-colors focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none lg:py-[12px]",
                selected
                  ? "border-brand-orange/70 bg-brand-orange/10"
                  : "border-transparent hover:border-white/10 hover:bg-white/[0.04]",
              )}
            >
              <span className="flex items-center gap-[8px] font-poppins text-[14px] font-semibold text-white">
                {group.title}
                {warn ? (
                  <span
                    aria-label="tem pendência"
                    title="Tem algo faltando que esconde parte da loja"
                    className="size-[8px] rounded-full bg-brand-orange"
                  />
                ) : null}
              </span>
              <span className="mt-[2px] hidden font-helvetica text-[12px] leading-[16px] text-brand-fg-subtle lg:block">
                {group.description}
              </span>
            </button>
          );
        })}
      </div>

      <div className="min-w-0">
        {SETTINGS_GROUPS.map((group) => {
          // Duas sessões curtas (logo + ícone) ficam lado a lado; o resto empilha.
          const sideBySide = group.id === "marca";
          // Grupo de UMA sessão (Empresa, Redes): o cartão não repete o título
          // do grupo; a linha "onde aparece" sobe para o cabeçalho do grupo.
          const single = group.sections.length === 1;
          const singleInfo = single ? SECTION_INFO[group.sections[0]] : undefined;
          return (
            <section
              key={group.id}
              id={`painel-${group.id}`}
              role="tabpanel"
              aria-labelledby={`aba-${group.id}`}
              hidden={active !== group.id}
              className={cn(
                "rounded-[22px] transition-[box-shadow] duration-500",
                highlight === group.id && "shadow-[0_0_0_3px_rgba(255,122,0,.25)]",
              )}
            >
              {/* Âncora do grupo (`#atendimento`) — os links antigos apontam para cá. */}
              <span id={group.id} className="block scroll-mt-[24px]" aria-hidden />
              <header>
                <h2 className="font-poppins text-[22px] font-semibold text-white">{group.title}</h2>
                <p className="mt-[4px] font-helvetica text-[14px] text-brand-fg-muted">
                  {singleInfo?.description ?? group.description}
                </p>
              </header>

              <Notices items={notices[group.id] ?? []} />

              <div className={cn("mt-[20px] grid gap-[20px]", sideBySide && "xl:grid-cols-2")}>
                {group.sections.map((suffix) => {
                  const def = layout?.sections.find((section) => section.key === suffix);
                  if (!def) return null;
                  const fullKey = sectionKey(SETTINGS_PAGE, suffix);
                  const info = SECTION_INFO[suffix];
                  return (
                    <article
                      key={suffix}
                      aria-labelledby={`sessao-${suffix}`}
                      className="min-w-0 rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)] p-[18px] sm:p-[24px]"
                    >
                      <header className={single ? "sr-only" : "mb-[18px] border-b border-white/10 pb-[14px]"}>
                        <h3 id={`sessao-${suffix}`} className="font-poppins text-[17px] font-semibold text-white">
                          {info?.title ?? def.label}
                        </h3>
                        {info ? (
                          <p className="mt-[4px] font-helvetica text-[13px] leading-[18px] text-brand-fg-subtle">
                            {info.description}
                          </p>
                        ) : null}
                      </header>
                      <SectionContentForm
                        fullKey={fullKey}
                        def={def}
                        content={sections.find((item) => item.key === fullKey)}
                        games={[]}
                        onSaved={(content) => replace(fullKey, content)}
                        layout="grid"
                        compactList
                      />
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Notices({ items }: { items: SettingsNotice[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-[14px] flex flex-col gap-[8px]">
      {items.map((notice) => (
        <li
          key={notice.text}
          className={cn(
            "rounded-[12px] border px-[12px] py-[9px] font-helvetica text-[13px] leading-[19px]",
            notice.level === "warn"
              ? "border-brand-orange/50 bg-brand-orange/10 text-white"
              : "border-white/10 bg-white/[0.03] text-brand-fg-muted",
          )}
        >
          {notice.level === "warn" ? <span aria-hidden>⚠ </span> : null}
          {notice.text}
        </li>
      ))}
    </ul>
  );
}
