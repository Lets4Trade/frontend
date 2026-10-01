"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { runAction } from "@/lib/safeAction";
import { adminSearchGamesAction } from "./actions";
import { buildIndex, search, type Role } from "./index";

/**
 * Busca do painel — Ctrl+K (⌘K no Mac) ou o botão do cabeçalho (2026-10-01).
 *
 * Digita "whatsapp", "rodapé", "poe" e vai direto à tela/campo. Abaixo de xl,
 * onde o menu do cabeçalho não cabe, é também a navegação do painel.
 *
 * Combobox acessível: o foco fica no campo; ↑/↓ movem o item ativo
 * (`aria-activedescendant`), Enter abre, Esc fecha (Radix devolve o foco).
 */
export function AdminSearch({ role }: { role: Role }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [games, setGames] = useState<{ id: string; name: string }[] | null>(null);
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Jogos: uma leitura, na primeira abertura. Falhou = busca sem jogos.
  useEffect(() => {
    if (!open || games !== null) return;
    let alive = true;
    void runAction(() => adminSearchGamesAction(), []).then((list) => {
      if (alive) setGames(list);
    });
    return () => {
      alive = false;
    };
  }, [open, games]);

  const index = useMemo(() => buildIndex(role, games ?? []), [role, games]);
  const results = useMemo(() => search(index, query), [index, query]);
  const current = Math.min(active, Math.max(results.length - 1, 0));

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${current}"]`)?.scrollIntoView({ block: "nearest" });
  }, [current]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    setActive(0);
    router.push(href);
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) {
          setQuery("");
          setActive(0);
        }
      }}
    >
      <Dialog.Trigger
        className="flex h-[40px] items-center gap-[10px] rounded-full border border-white/15 bg-white/[0.04] px-[12px] font-poppins text-[13px] text-white/80 transition-colors hover:border-white/30 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none"
        aria-label="Buscar no painel (Ctrl+K)"
      >
        <SearchIcon />
        <span className="hidden 2xl:inline">Buscar</span>
        <kbd className="hidden rounded-[6px] border border-white/15 px-[6px] py-[1px] text-[11px] text-white/60 2xl:inline">
          Ctrl K
        </kbd>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed top-[10vh] left-1/2 z-50 flex max-h-[75vh] w-[min(640px,calc(100vw-32px))] -translate-x-1/2 flex-col overflow-hidden rounded-[20px] border border-brand-border bg-brand-surface shadow-[0_24px_60px_rgba(0,0,0,.6)] outline-none"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement).querySelector("input")?.focus();
          }}
        >
          <Dialog.Title className="sr-only">Buscar no painel</Dialog.Title>
          <Dialog.Description className="sr-only">
            Digite o nome de uma tela, configuração, página ou jogo. Use as setas e Enter para abrir.
          </Dialog.Description>

          <div className="flex items-center gap-[10px] border-b border-brand-hairline px-[16px]">
            <SearchIcon />
            <input
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={results[current] ? `${listId}-${current}` : undefined}
              aria-autocomplete="list"
              autoComplete="off"
              spellCheck={false}
              placeholder="O que você quer editar? (ex.: whatsapp, rodapé, preços)"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActive(Math.min(current + 1, results.length - 1));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActive(Math.max(current - 1, 0));
                } else if (event.key === "Enter" && results[current]) {
                  event.preventDefault();
                  go(results[current].href);
                }
              }}
              className="h-[56px] min-w-0 flex-1 bg-transparent font-poppins text-[16px] text-white placeholder:text-white/40 focus:outline-none"
            />
          </div>

          {results.length === 0 ? (
            <p className="px-[20px] py-[28px] text-center font-helvetica text-[14px] text-brand-fg-muted">
              Nada encontrado para “{query}”.
            </p>
          ) : (
            <ul ref={listRef} id={listId} role="listbox" aria-label="Resultados" className="scrollbar-orange overflow-y-auto p-[8px]">
              {results.map((entry, position) => (
                <li
                  key={entry.id}
                  id={`${listId}-${position}`}
                  data-index={position}
                  role="option"
                  aria-selected={position === current}
                  onMouseMove={() => setActive(position)}
                  onClick={() => go(entry.href)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-[12px] rounded-[12px] px-[12px] py-[10px]",
                    position === current ? "bg-brand-orange/10" : "",
                  )}
                >
                  <span className={cn("truncate font-poppins text-[14px] font-semibold", position === current ? "text-white" : "text-white/85")}>
                    {entry.title}
                  </span>
                  <span className="shrink-0 font-helvetica text-[12px] text-brand-fg-subtle">{entry.where}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="border-t border-brand-hairline px-[16px] py-[8px] font-helvetica text-[11px] text-brand-fg-subtle">
            ↑ ↓ para escolher · Enter para abrir · Esc para fechar
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0 text-white/70">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}
