"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionContentForm } from "@/features/admin/sections/SectionContentForm";
import type { SectionContent } from "@/features/site/list";
import { sectionKey, sitePage } from "@/features/site/sections";
import { cn } from "@/lib/cn";
import { SETTINGS_GROUPS, SETTINGS_PAGE, settingsNotices, type SettingsNotice } from "./catalog";

/**
 * Os cartões de "Configurações da loja" — todos à vista, um índice lateral
 * no desktop e aviso do que está faltando em cada um.
 *
 * Abrir com `#atendimento` (vindo da busca Ctrl+K ou de um clique na prévia)
 * rola até o cartão e o acende por um instante.
 */
export function SettingsBoard({ initialSections }: { initialSections: SectionContent[] }) {
  const [sections, setSections] = useState(initialSections);
  const [highlight, setHighlight] = useState<string | null>(null);
  const notices = useMemo(() => settingsNotices(sections), [sections]);
  const layout = sitePage(SETTINGS_PAGE);

  useEffect(() => {
    const focusHash = () => {
      const id = window.location.hash.slice(1);
      if (!SETTINGS_GROUPS.some((group) => group.id === id)) return;
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  function replace(key: string, content: SectionContent | null) {
    setSections((list) => [...list.filter((item) => item.key !== key), ...(content ? [content] : [])]);
  }

  return (
    <div className="grid gap-[24px] lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Grupos de configuração" className="hidden lg:block">
        <ul className="sticky top-[24px] flex flex-col gap-[4px]">
          {SETTINGS_GROUPS.map((group) => {
            const warn = notices[group.id]?.some((notice) => notice.level === "warn");
            return (
              <li key={group.id}>
                <a
                  href={`#${group.id}`}
                  className="flex items-center justify-between gap-[8px] rounded-[12px] px-[12px] py-[9px] font-poppins text-[14px] font-semibold text-white/80 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {group.title}
                  {warn ? <span aria-label="tem pendência" className="size-[8px] rounded-full bg-brand-orange" /> : null}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex min-w-0 flex-col gap-[20px]">
        {SETTINGS_GROUPS.map((group) => (
          <section
            key={group.id}
            id={group.id}
            aria-labelledby={`${group.id}-titulo`}
            className={cn(
              "scroll-mt-[24px] rounded-[20px] border bg-[image:var(--brand-surface-fill)] p-[18px] transition-[border-color,box-shadow] duration-500 sm:p-[24px]",
              highlight === group.id
                ? "border-brand-orange shadow-[0_0_0_3px_rgba(255,122,0,.25)]"
                : "border-brand-border",
            )}
          >
            <header>
              <h2 id={`${group.id}-titulo`} className="font-poppins text-[20px] font-semibold text-white">
                {group.title}
              </h2>
              <p className="mt-[4px] font-helvetica text-[14px] text-brand-fg-muted">{group.description}</p>
            </header>

            <Notices items={notices[group.id] ?? []} />

            <div
              className={cn(
                "mt-[18px] grid gap-[28px]",
                group.sections.length > 1 && "xl:grid-cols-2",
              )}
            >
              {group.sections.map((suffix) => {
                const def = layout?.sections.find((section) => section.key === suffix);
                if (!def) return null;
                const fullKey = sectionKey(SETTINGS_PAGE, suffix);
                return (
                  <div key={suffix} className="min-w-0 max-w-[720px]">
                    {group.sections.length > 1 ? (
                      <h3 className="mb-[12px] font-helvetica text-[16px] font-bold text-white">{def.label}</h3>
                    ) : null}
                    <SectionContentForm
                      fullKey={fullKey}
                      def={def}
                      content={sections.find((item) => item.key === fullKey)}
                      games={[]}
                      onSaved={(content) => replace(fullKey, content)}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
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
