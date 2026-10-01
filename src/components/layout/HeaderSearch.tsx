"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { PARAM } from "@/features/game/catalog";
import { readHistory, withTerm, writeHistory } from "./searchHistory";

/**
 * Busca do cabeçalho: sugere jogos e produtos enquanto a pessoa digita
 * (`GET /api/v1/search?q=`).
 *
 * ── Barra vazia (2026-10-01) ───────────────────────────────────────────────
 * Ao focar SEM nada digitado, o painel mostra: as pesquisas recentes da pessoa
 * (só no navegador dela, `searchHistory.ts`), as pesquisas em alta e as
 * categorias recomendadas com o jogo (`GET /api/v1/search/suggestions`, lido
 * uma vez por página e só no primeiro foco). Com 2+ letras, a busca de sempre.
 *
 * Uma busca entra no histórico e conta para "em alta" só quando é CONFIRMADA
 * (Enter ou clique num resultado) — contar a cada tecla encheria a lista de
 * "dia", "diab"… O backend ainda só conta termo com resultado e uma vez por
 * pessoa por dia (`POST /api/v1/search/track`).
 *
 * ── Custo por tecla ───────────────────────────────────────────────────────
 * A chamada só sai depois de 250ms sem digitar e com 2+ caracteres (o mesmo
 * mínimo que o backend valida). Uma chamada em voo é CANCELADA quando o termo
 * muda — sem isso a resposta lenta de "pa" poderia chegar depois da de "path"
 * e sobrescrevê-la. Termos já buscados ficam num cache local da instância, então
 * apagar e redigitar não repete a ida ao servidor.
 *
 * ── Por que direto do navegador ───────────────────────────────────────────
 * As rotas são públicas e a resposta igual para todos: não vai cookie (`omit`),
 * e não há motivo para passar por um server action do Next — seria um salto a
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
  /** Aba do jogo em que o produto está (abas por jogo, 2026-09-28). */
  tabSlug?: string;
  imageUrl?: string;
  gameSlug: string;
  gameName: string;
  serverSlug?: string;
  serverLabel?: string;
};
type Results = { games: RawGame[]; products: RawProduct[] };

type RawCategory = { gameSlug: string; gameName: string; gameImageUrl?: string; tabSlug: string; tabLabel: string };
type IdleData = { categories: RawCategory[]; trending: string[] };

type Suggestion = {
  key: string;
  href: string;
  title: string;
  detail: string;
  image?: string;
};

/** Um item do painel da barra vazia: um termo (preenche a busca) ou um link. */
type IdleItem =
  | { kind: "history" | "trending"; key: string; term: string }
  | ({ kind: "category" } & Suggestion);

const price = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** `/uploads/x.webp` → URL no backend (a arte é servida pelo Nest). */
function asset(path?: string) {
  if (!path) return undefined;
  return /^https?:\/\//.test(path) ? path : `${ASSET_ORIGIN}${path}`;
}

/**
 * Produto → vitrine do jogo JÁ filtrada: aba do produto, servidor e o
 * nome na busca. Sem o servidor a vitrine cairia no primeiro da lista e o
 * produto poderia não aparecer.
 */
function productHref(product: RawProduct) {
  const params = new URLSearchParams();
  // Sem `tabSlug` (produto sem aba) a vitrine abre na aba padrão.
  if (product.tabSlug) params.set(PARAM.tab, product.tabSlug);
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

/**
 * Sugestões da barra vazia: UMA leitura por carregamento de página, dividida
 * entre todas as instâncias (cabeçalho e menu mobile). Falha vira vazio e a
 * próxima abertura tenta de novo.
 */
let idleRequest: Promise<IdleData> | null = null;
const EMPTY_IDLE: IdleData = { categories: [], trending: [] };

function loadIdle(): Promise<IdleData> {
  if (!API_URL) return Promise.resolve(EMPTY_IDLE);
  idleRequest ??= fetch(`${API_URL}/search/suggestions`, {
    credentials: "omit",
    headers: { accept: "application/json" },
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(String(response.status));
      const body = (await response.json()) as { data?: Partial<IdleData> };
      return {
        categories: Array.isArray(body.data?.categories)
          ? body.data.categories.filter(
              (item): item is RawCategory =>
                typeof item?.gameSlug === "string" && typeof item?.tabSlug === "string" && typeof item?.tabLabel === "string",
            )
          : [],
        trending: Array.isArray(body.data?.trending)
          ? body.data.trending.filter((term): term is string => typeof term === "string").slice(0, 8)
          : [],
      };
    })
    .catch(() => {
      idleRequest = null;
      return EMPTY_IDLE;
    });
  return idleRequest;
}

/** Busca confirmada → conta para "em alta" (o backend decide se vale). */
function trackSearch(term: string) {
  if (!API_URL) return;
  void fetch(`${API_URL}/search/track`, {
    method: "POST",
    credentials: "omit",
    keepalive: true,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ q: term.slice(0, 40) }),
  }).catch(() => undefined);
}

function categoryHref(category: RawCategory) {
  return `/games/${category.gameSlug}?${new URLSearchParams({ [PARAM.tab]: category.tabSlug }).toString()}`;
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
  /** Chamado ao abrir uma sugestão — o menu mobile usa para se fechar. */
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [cache, setCache] = useState<Record<string, Results>>({});
  const [failed, setFailed] = useState<string | null>(null);
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [idle, setIdle] = useState<IdleData | null>(null);

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
  // Enquanto o termo novo carrega, a lista anterior continua na tela.
  const results = searchable ? (hit ?? (lastKey ? cache[lastKey] : undefined)) : undefined;

  useEffect(() => {
    if (!searchable || cache[key]) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`, {
          credentials: "omit",
          headers: { accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as { data?: Partial<Results> };
        const data: Results = {
          games: Array.isArray(body.data?.games) ? body.data.games : [],
          products: Array.isArray(body.data?.products) ? body.data.products : [],
        };
        setCache((current) => {
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

  // Clique fora fecha.
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

  // Painel da barra vazia, na ordem da tela: recentes, em alta, categorias.
  const historyItems: IdleItem[] = history.map((item) => ({ kind: "history", key: `h:${item}`, term: item }));
  const trendingItems: IdleItem[] = (idle?.trending ?? [])
    .filter((item) => !history.some((recent) => recent.toLowerCase() === item.toLowerCase()))
    .map((item) => ({ kind: "trending", key: `t:${item}`, term: item }));
  const categoryItems: IdleItem[] = (idle?.categories ?? []).map((category) => ({
    kind: "category",
    key: `c:${category.gameSlug}:${category.tabSlug}`,
    href: categoryHref(category),
    title: category.tabLabel.charAt(0) + category.tabLabel.slice(1).toLocaleLowerCase("pt-BR"),
    detail: category.gameName,
    image: asset(category.gameImageUrl),
  }));
  const idleFlat = [...historyItems, ...trendingItems, ...categoryItems];

  const options = searchable ? flat.length : idleFlat.length;
  const showList = open && (searchable || idleFlat.length > 0);

  function onFocus() {
    setOpen(true);
    setHistory(readHistory());
    void loadIdle().then(setIdle);
  }

  /** Busca confirmada: entra no histórico e conta para "em alta". */
  function commit() {
    if (!searchable) return;
    const next = withTerm(history, query);
    setHistory(next);
    writeHistory(next);
    trackSearch(query);
  }

  function go(href: string) {
    setOpen(false);
    setActive(-1);
    onNavigate?.();
    router.push(href);
  }

  /** Termo do painel (recente ou em alta): preenche e busca. */
  function applyTerm(value: string) {
    setTerm(value);
    setActive(-1);
    setOpen(true);
  }

  function removeFromHistory(value: string) {
    const next = history.filter((item) => item !== value);
    setHistory(next);
    writeHistory(next);
    setActive(-1);
  }

  function clearHistory() {
    setHistory([]);
    writeHistory([]);
    setActive(-1);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (options === 0) return;
      event.preventDefault();
      setOpen(true);
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => (current + step + options) % options);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (searchable) {
        const target = flat[active] ?? flat[0];
        if (target) {
          commit();
          go(target.href);
        }
        return;
      }
      const item = idleFlat[active];
      if (!item) return;
      if (item.kind === "category") go(item.href);
      else applyTerm(item.term);
    }
  }

  function optionClass(selected: boolean) {
    return `flex w-full items-center gap-[12px] rounded-[12px] px-[12px] py-[8px] text-left font-poppins text-white outline-none transition-colors ${selected ? "bg-white/5" : ""}`;
  }

  function renderGroup(label: string, items: Suggestion[], offset: number) {
    if (items.length === 0) return null;
    return (
      <li role="presentation">
        <GroupTitle>{label}</GroupTitle>
        <ul role="group" aria-label={label}>
          {items.map((item, index) => {
            const position = offset + index;
            const selected = position === active;
            return (
              <li key={item.key} role="presentation">
                {/* `Link` de verdade (prefetch, Ctrl+clique) mas fora da ordem
                    de Tab: quem navega pelo teclado usa as setas. */}
                <Link
                  id={`${listId}-${position}`}
                  role="option"
                  aria-selected={selected}
                  href={item.href}
                  tabIndex={-1}
                  onClick={() => {
                    commit();
                    setOpen(false);
                    onNavigate?.();
                  }}
                  onMouseEnter={() => setActive(position)}
                  className={optionClass(selected)}
                >
                  <Thumb image={item.image} />
                  <span className="min-w-0">
                    <span className="block truncate text-[14px]">{item.title}</span>
                    <span className="block truncate text-[12px] text-brand-fg-subtle">{item.detail}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </li>
    );
  }

  function renderIdle() {
    let position = 0;
    return (
      <>
        {historyItems.length > 0 ? (
          <li role="presentation">
            <GroupTitle
              action={
                <button
                  type="button"
                  onClick={clearHistory}
                  className="font-poppins text-[12px] text-brand-fg-subtle transition-colors hover:text-white"
                >
                  Limpar
                </button>
              }
            >
              Pesquisas recentes
            </GroupTitle>
            <ul role="group" aria-label="Pesquisas recentes">
              {historyItems.map((item) => {
                const index = position++;
                const selected = index === active;
                const value = item.kind === "category" ? "" : item.term;
                return (
                  <li key={item.key} role="presentation" className="group/hist relative">
                    <div
                      id={`${listId}-${index}`}
                      role="option"
                      aria-selected={selected}
                      tabIndex={-1}
                      onClick={() => applyTerm(value)}
                      onMouseEnter={() => setActive(index)}
                      className={`${optionClass(selected)} cursor-pointer pr-[44px]`}
                    >
                      <ClockIcon />
                      <span className="truncate text-[14px]">{value}</span>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remover "${value}" das pesquisas recentes`}
                      onClick={() => removeFromHistory(value)}
                      className="absolute top-1/2 right-[8px] flex size-[28px] -translate-y-1/2 items-center justify-center rounded-full text-[16px] leading-none text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ) : null}

        {trendingItems.length > 0 ? (
          <li role="presentation">
            <GroupTitle>Em alta</GroupTitle>
            <ul role="group" aria-label="Pesquisas em alta" className="flex flex-wrap gap-[8px] px-[12px] pt-[2px] pb-[8px]">
              {trendingItems.map((item) => {
                const index = position++;
                const selected = index === active;
                const value = item.kind === "category" ? "" : item.term;
                return (
                  <li key={item.key} role="presentation">
                    <div
                      id={`${listId}-${index}`}
                      role="option"
                      aria-selected={selected}
                      tabIndex={-1}
                      onClick={() => applyTerm(value)}
                      onMouseEnter={() => setActive(index)}
                      className={`flex cursor-pointer items-center gap-[6px] rounded-full border px-[12px] py-[6px] font-poppins text-[13px] transition-colors ${
                        selected ? "border-brand-orange bg-brand-orange/10 text-white" : "border-white/15 text-white/85"
                      }`}
                    >
                      <TrendIcon />
                      {value}
                    </div>
                  </li>
                );
              })}
            </ul>
          </li>
        ) : null}

        {categoryItems.length > 0 ? (
          <li role="presentation">
            <GroupTitle>Categorias recomendadas</GroupTitle>
            <ul role="group" aria-label="Categorias recomendadas">
              {categoryItems.map((item) => {
                const index = position++;
                const selected = index === active;
                if (item.kind !== "category") return null;
                return (
                  <li key={item.key} role="presentation">
                    <Link
                      id={`${listId}-${index}`}
                      role="option"
                      aria-selected={selected}
                      href={item.href}
                      tabIndex={-1}
                      onClick={() => {
                        setOpen(false);
                        onNavigate?.();
                      }}
                      onMouseEnter={() => setActive(index)}
                      className={optionClass(selected)}
                    >
                      <Thumb image={item.image} />
                      <span className="min-w-0">
                        <span className="block truncate text-[14px]">{item.title}</span>
                        <span className="block truncate text-[12px] text-brand-fg-subtle">{item.detail}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ) : null}
      </>
    );
  }

  return (
    <div
      ref={rootRef}
      className={variant === "menu" ? "relative w-full" : "relative hidden w-[219px] shrink-0 lg:block"}
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
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        className="h-[50px] w-full rounded-full border-2 border-[var(--brand-stroke-soft)] bg-[image:var(--brand-surface-fill)] pr-4 pl-[60px] font-helvetica text-[15px] tracking-[0.15px] text-white outline-none transition-colors placeholder:text-brand-placeholder focus:border-brand-orange"
      />

      {showList ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Sugestões"
          // Clicar no painel não tira o foco do campo (o teclado continua ali).
          onMouseDown={(event) => event.preventDefault()}
          className={`absolute top-[calc(100%+12px)] left-0 z-50 max-h-[480px] ${variant === "menu" ? "w-full" : "w-[360px]"} overflow-y-auto rounded-[20px] border border-brand-border bg-brand-surface p-[8px] shadow-[0_16px_40px_rgba(0,0,0,0.5)]`}
        >
          {searchable ? (
            <>
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
            </>
          ) : (
            renderIdle()
          )}
        </ul>
      ) : null}
    </div>
  );
}

function GroupTitle({ children, action }: { children: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-[12px] pt-[8px] pb-[4px]">
      <p className="font-poppins text-[12px] font-medium tracking-[0.12px] text-brand-fg-subtle uppercase">{children}</p>
      {action}
    </div>
  );
}

function Thumb({ image }: { image?: string }) {
  return image ? (
    <Image src={image} alt="" width={36} height={36} aria-hidden className="size-[36px] shrink-0 rounded-[8px] object-contain" />
  ) : (
    <span aria-hidden className="size-[36px] shrink-0 rounded-[8px] bg-white/5" />
  );
}

function ClockIcon() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-white/50">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0 text-brand-orange">
      <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 7h6v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
