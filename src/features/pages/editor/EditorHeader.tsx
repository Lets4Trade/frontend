"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * O cabeçalho ÚNICO dos editores de página (2026-10-01, "deixar clean"):
 * voltar, nome da página, "Ver na loja" e — só na Home, que tem os dois modos —
 * as abas "Textos e imagens" (edição no desenho) e "Organizar seções"
 * (construtor). À direita, o que for do editor (status, Publicar).
 *
 * Substituiu o select "Trocar de página" e as pílulas de página do desenho:
 * trocar de página é voltar à lista. Um caminho só.
 *
 * `beforeLeave`: grava o rascunho pendente antes de sair — navegação dentro do
 * app não dispara o aviso de "sair da página" do navegador.
 */
import type { EditorTab } from "./editorNav";

export type { EditorTab };

export function EditorHeader({
  title,
  back,
  storeHref,
  tabs,
  beforeLeave,
  children,
}: {
  title: string;
  back: { href: string; label: string };
  storeHref: string;
  tabs?: EditorTab[];
  beforeLeave?: () => Promise<boolean>;
  /** Ações do editor, à direita (status, Histórico, Publicar). */
  children?: ReactNode;
}) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function go(href: string) {
    if (leaving) return;
    setLeaving(true);
    const saved = beforeLeave ? await beforeLeave() : true;
    if (!saved && !window.confirm("Há alterações não salvas. Sair mesmo assim?")) {
      setLeaving(false);
      return;
    }
    router.push(href);
  }

  return (
    <header className="flex flex-col gap-[14px]">
      <div className="flex flex-wrap items-center gap-x-[20px] gap-y-[12px]">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => void go(back.href)}
            disabled={leaving}
            className="font-poppins text-[13px] font-bold text-brand-orange transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            ← {back.label}
          </button>
          <div className="mt-[4px] flex flex-wrap items-baseline gap-x-[14px]">
            <h1 className="font-helvetica text-[26px] leading-tight font-bold text-white">{title}</h1>
            <a
              href={storeHref}
              target="_blank"
              rel="noreferrer"
              className="font-poppins text-[13px] text-white/60 transition-colors hover:text-white"
            >
              Ver na loja ↗
            </a>
          </div>
        </div>
        {children ? <div className="ml-auto flex flex-wrap items-center gap-[10px]">{children}</div> : null}
      </div>

      {tabs && tabs.length > 1 ? (
        <nav aria-label="Modo de edição" className="flex w-fit gap-[4px] rounded-full border border-white/10 bg-black/40 p-[4px]">
          {tabs.map((tab) => (
            <button
              key={tab.href}
              type="button"
              aria-current={tab.active ? "page" : undefined}
              onClick={() => (tab.active ? undefined : void go(tab.href))}
              className={cn(
                "h-[36px] rounded-full px-[18px] font-poppins text-[13px] font-bold transition-colors focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none",
                tab.active ? "bg-brand-orange text-black" : "text-white/70 hover:text-white",
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
