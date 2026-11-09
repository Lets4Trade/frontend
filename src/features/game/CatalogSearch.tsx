"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { cn } from "@/lib/cn";
import { PARAM, buildHref, type CatalogQuery } from "./catalog";

/** Espera depois da última tecla antes de buscar: digitar "divine" não vira 6 buscas. */
export const SEARCH_DEBOUNCE_MS = 350;

/**
 * "Pesquisar itens..." da página do jogo, EM TEMPO REAL (2026-11-09, pedido do
 * usuário: "só funciona quando dou Enter; apaguei tudo e fiquei esperando").
 *
 * A lista continua vindo do servidor pela URL (`?busca=`), como antes — a busca
 * vale para o catálogo inteiro, não só para a página carregada. O que muda é
 * QUANDO: a URL é trocada sozinha 350 ms depois da última tecla (e na hora com
 * Enter), com `replace` (o Voltar não vira uma lista de letras) e sem rolar a
 * página. Apagar tudo volta à lista completa do mesmo jeito.
 *
 * Continua sendo um `<form>` GET de verdade: sem JavaScript, o Enter ainda
 * busca, com o filtro atual nos campos escondidos.
 */
export function CatalogSearch({ slug, action, query }: { slug: string; action: string; query: CatalogQuery }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A busca que está na URL: a mesma busca de novo não navega. Sincronizada
  // num efeito (ref não se lê nem escreve durante a renderização).
  const current = useRef(query.search);
  useEffect(() => {
    current.current = query.search;
  }, [query.search]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function go(raw: string) {
    if (timer.current) clearTimeout(timer.current);
    const search = raw.trim().slice(0, 80);
    if (search === current.current) return;
    current.current = search;
    // Página 1: o resultado novo começa do início.
    startTransition(() => router.replace(buildHref(slug, query, { search, page: 1 }), { scroll: false }));
  }

  return (
    <form
      action={action}
      method="get"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        go(String(new FormData(event.currentTarget).get(PARAM.search) ?? ""));
      }}
      className="relative col-span-2 h-[50px] w-full desk:w-[219px]"
    >
      {/* O filtro atual viaja junto em campos escondidos (envio sem JS). */}
      <input type="hidden" name={PARAM.tab} value={query.tab} />
      <input type="hidden" name={PARAM.server} value={query.server} />
      {query.categories.map((id) => (
        <input key={id} type="hidden" name={PARAM.category} value={id} />
      ))}
      {query.sort ? <input type="hidden" name={PARAM.sort} value={query.sort} /> : null}

      <Image
        src="/icons/search.svg"
        alt=""
        width={20}
        height={20}
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 left-[25px] size-[20px] -translate-y-1/2 transition-opacity",
          // Buscando: a lupa pulsa (a lista troca quando o servidor responde).
          pending && "animate-pulse opacity-60",
        )}
      />
      <input
        type="search"
        name={PARAM.search}
        defaultValue={query.search}
        maxLength={80}
        aria-label="Pesquisar itens"
        aria-busy={pending || undefined}
        placeholder="Pesquisar itens..."
        onChange={(event) => {
          const value = event.target.value;
          if (timer.current) clearTimeout(timer.current);
          // Campo apagado (inclusive pelo "x" do navegador): volta já à lista toda.
          if (value.trim() === "") {
            go("");
            return;
          }
          timer.current = setTimeout(() => go(value), SEARCH_DEBOUNCE_MS);
        }}
        className="h-full w-full rounded-full border border-brand-border bg-[image:var(--brand-surface-fill)] pr-[20px] pl-[60px] font-helvetica text-[15px] tracking-[0.15px] text-white outline-none placeholder:text-brand-placeholder focus-visible:border-brand-orange"
      />
    </form>
  );
}
