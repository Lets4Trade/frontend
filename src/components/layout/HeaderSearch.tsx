"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { PARAM } from "@/features/game/catalog";
import { tabByProductType } from "@/features/game/tabs";

/**
 * Busca do cabeçalho: sugere jogos e produtos enquanto a pessoa digita
 * (`GET /api/v1/search?q=`).
 *
 * ── Custo por tecla ───────────────────────────────────────────────────────
 * A chamada só sai depois de 250ms sem digitar e com 2+ caracteres (o mesmo
 * mínimo que o backend valida). Uma chamada em voo é CANCELADA quando o termo
 * muda — sem isso a resposta lenta de "pa" poderia chegar depois da de "path"
 * e sobrescrevê-la. Termos já buscados ficam num cache local da instância, então
 * apagar e redigitar não repete a ida ao servidor.
 *
 * ── Por que direto do navegador ───────────────────────────────────────────
 * A rota é pública e a resposta igual para todos: não vai cookie (`omit`), e
 * não há motivo para passar por um server action do Next — seria um salto a
 * mais em cada tecla.
 *
 * ── Acessibilidade ────────────────────────────────────────────────────────
 * Padrão combobox da WAI-ARIA: setas percorrem as sugestões, Enter abre a
 * destacada (ou a primeira), Esc fecha. O foco fica no campo o tempo todo.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
const ASSET_ORIGIN = API_URL.replace(/\/api\/v\d+$/, "");
const MIN_CHARS = 2;
const MAX_CHARS = 80;
const DEBOUNCE_MS = 250;
const MAX_CACHED = 30;

// Campos opcionais: o backend apaga nulos da resposta, então ausente = sem valor.
type RawGame = { slug: string; name: string; imageUrl?: string };
type RawProduct = {
  id: string;
  name: string;
  priceCents: number;
  productType: string;
  imageUrl?: string;
  gameSlug: string;
  gameName: string;
  serverSlug?: string;
  serverLabel?: string;
};
type Results = { games: RawGame[]; products: RawProduct[] };

type Suggestion = {
  key: string;
  href: string;
  title: string;
  detail: string;
  image?: string;
};

const price = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** `/uploads/x.webp` → URL no backend (a arte é servida pelo Nest). */
function asset(path?: string) {
  if (!path) return undefined;
  return /^https?:\/\//.test(path) ? path : `${ASSET_ORIGIN}${path}`;
}

/**
 * Produto → vitrine do jogo JÁ filtrada: aba do tipo, servidor do produto e o
 * nome na busca. Sem o servidor a vitrine cairia no primeiro da lista e o
 * produto poderia não aparecer.
 */
function productHref(product: RawProduct) {
  const params = new URLSearchParams();
  const tab = tabByProductType(product.productType);
  if (tab) params.set(PARAM.tab, tab.id);
  if (product.serverSlug) params.set(PARAM.server, product.serverSlug);
  params.set(PARAM.search, product.name);
  return `/games/${product.gameSlug}?${params.toString()}`;
}

function toSuggestions(results: Results): { games: Suggestion[]; products: Suggestion[] } {
  return {
    games: results.games.map((game) => ({
      key: `g:${game.slug}`,
      href: `/games/${game.slug}`,
      title: game.name,
      detail: "Jogo",
      image: asset(game.imageUrl),
    })),
    products: results.products.map((product) => ({
      key: `p:${product.id}`,
      href: productHref(product),
      title: product.name,
      detail: [product.gameName, product.serverLabel, price.format(product.priceCents / 100)]
        .filter(Boolean)
        .join(" · "),
      image: asset(product.imageUrl),
    })),
  };
}

type Status = "idle" | "loading" | "done" | "error";

export function HeaderSearch({
  placeholder,
  variant = "header",
  onNavigate,
}: {
  placeholder: string;
  /**
   * `header`: o campo de 219px do cabeçalho desktop (some abaixo de `lg`).
   * `menu`: largura cheia, dentro do menu mobile.
   */
  variant?: "header" | "menu";
  /** Chamado ao abrir uma sugestão — o menu mobile fecha a gaveta. */
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // Respostas por termo (minúsculo). Estado, e não ref, porque o que a lista
  // mostra é DERIVADO daqui na renderização.
  const [cache, setCache] = useState<Record<string, Results>>({});
  const [failed, setFailed] = useState<string | null>(null);
  // Última resposta exibida: enquanto o termo novo carrega, a lista continua
  // mostrando a anterior em vez de piscar vazia.
  const [lastKey, setLastKey] = useState<string | null>(null);

  const query = term.trim();
  const key = query.toLowerCase();
  const searchable = query.length >= MIN_CHARS && API_URL !== "";
  const hit = searchable ? cache[key] : undefined;

  const status: Status = !searchable
    ? "idle"
    : hit
      ? "done"
      : failed === key
        ? "error"
        : "loading";
  const results = searchable ? (hit ?? (lastKey ? cache[lastKey] : undefined)) : undefined;

  useEffect(() => {
    if (!searchable || cache[key]) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_URL}/search?q=${encodeURIComponent(query)}`,
          {
            credentials: "omit",
            headers: { accept: "application/json" },
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as { data?: Partial<Results> };
        const data: Results = {
          games: Array.isArray(body.data?.games) ? body.data.games : [],
          products: Array.isArray(body.data?.products) ? body.data.products : [],
        };
        setCache((current) => {
          // Teto do cache: é memória da aba, não precisa guardar a sessão toda.
          const entries = Object.entries(current).slice(-(MAX_CACHED - 1));
          return { ...Object.fromEntries(entries), [key]: data };
        });
        setLastKey(key);
        setFailed(null);
      } catch {
        if (!controller.signal.aborted) setFailed(key);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, key, searchable, cache]);

  // Fecha ao clicar fora do campo e da lista.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const groups = results ? toSuggestions(results) : { games: [], products: [] };
  const flat = [...groups.games, ...groups.products];
  const showList = open && searchable;

  function go(suggestion: Suggestion) {
    setOpen(false);
    setActive(-1);
    onNavigate?.();
    router.push(suggestion.href);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (flat.length === 0) return;
      event.preventDefault();
      setOpen(true);
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => (current + step + flat.length) % flat.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const target = flat[active] ?? flat[0];
      if (target) go(target);
    }
  }

  function renderGroup(label: string, items: Suggestion[], offset: number) {
    if (items.length === 0) return null;
    return (
      <li role="presentation">
        <p className="px-[12px] pt-[8px] pb-[4px] font-poppins text-[12px] font-medium tracking-[0.12px] text-brand-fg-subtle uppercase">
          {label}
        </p>
        <ul role="group" aria-label={label}>
          {items.map((item, index) => {
            const position = offset + index;
            const selected = position === active;
            return (
              <li key={item.key} role="presentation">
                <Link
                  id={`${listId}-${position}`}
                  role="option"
                  aria-selected={selected}
                  href={item.href}
                  tabIndex={-1}
                  onClick={() => {
                    setOpen(false);
                    onNavigate?.();
                  }}
                  onMouseEnter={() => setActive(position)}
                  className={`flex items-center gap-[12px] rounded-[12px] px-[12px] py-[8px] font-poppins text-white outline-none transition-colors ${selected ? "bg-white/5" : ""}`}
                >
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt=""
                      width={36}
                      height={36}
                      aria-hidden
                      className="size-[36px] shrink-0 rounded-[8px] object-cover"
                    />
                  ) : (
                    <span aria-hidden className="size-[36px] shrink-0 rounded-[8px] bg-white/5" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-[14px]">{item.title}</span>
                    <span className="block truncate text-[12px] text-brand-fg-subtle">
                      {item.detail}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </li>
    );
  }

  return (
    <div
      ref={rootRef}
      className={
        variant === "menu" ? "relative w-full" : "relative hidden w-[219px] shrink-0 lg:block"
      }
    >
      <Image
        src="/icons/search.svg"
        alt=""
        width={20}
        height={20}
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-[25px] -translate-y-1/2"
      />
      <input
        type="search"
        role="combobox"
        aria-label="Buscar jogos e produtos"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        maxLength={MAX_CHARS}
        value={term}
        placeholder={placeholder}
        onChange={(event) => {
          setTerm(event.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        // Placeholder da busca em Helvetica Neue Regular no design.
        className="h-[50px] w-full rounded-full border-2 border-[var(--brand-stroke-soft)] bg-[image:var(--brand-surface-fill)] pr-4 pl-[60px] font-helvetica text-[15px] tracking-[0.15px] text-white outline-none transition-colors placeholder:text-brand-placeholder focus:border-brand-orange"
      />

      {showList ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Sugestões"
          className={`absolute top-[calc(100%+12px)] left-0 z-50 max-h-[480px] ${variant === "menu" ? "w-full" : "w-[360px]"} overflow-y-auto rounded-[20px] border border-brand-border bg-brand-surface p-[8px] shadow-[0_16px_40px_rgba(0,0,0,0.5)]`}
        >
          {renderGroup("Jogos", groups.games, 0)}
          {renderGroup("Produtos", groups.products, groups.games.length)}

          {flat.length === 0 ? (
            <li role="presentation" className="px-[12px] py-[10px] font-poppins text-[14px] text-brand-fg-subtle">
              {status === "error"
                ? "Não foi possível buscar agora."
                : status === "done"
                  ? "Nada encontrado."
                  : "Buscando…"}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
